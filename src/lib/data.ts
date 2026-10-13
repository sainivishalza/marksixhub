import 'server-only';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';
import { dbConfigured, query } from './db';
import { FAQS, type Faq } from './faq';
import { HKD } from './format';
import { sampleCurrencies, sampleDraws, sampleEvents, sampleNext, samplePrizes } from './sample';
import type { Currency, Draw, EventItem, Prize, TopPrize } from './types';

// With no database configured, development shows sample data; production never does.
const useSample = !dbConfigured && process.env.NODE_ENV !== 'production';

export type DrawRow = RowDataPacket & {
  id: number; draw_no: string; draw_date: string; status: 'upcoming' | 'published';
  nums: string | null; extra: number | null; est_jackpot_hkd: number | string; note: string | null;
  snowball_hkd: number | string | null; turnover_hkd: number | string | null; fund_hkd: number | string | null; stop_selling_time: string | null;
};

const optNumber = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));

export const toDraw = (r: DrawRow): Draw => ({
  id: r.id,
  drawNo: r.draw_no,
  drawDate: r.draw_date,
  status: r.status,
  numbers: r.nums ? r.nums.split(',').map(Number) : [],
  extra: r.extra,
  estJackpotHkd: Number(r.est_jackpot_hkd),
  snowballHkd: optNumber(r.snowball_hkd),
  turnoverHkd: optNumber(r.turnover_hkd),
  fundHkd: optNumber(r.fund_hkd),
  stopSelling: r.stop_selling_time ? r.stop_selling_time.slice(0, 5) : null,
  note: r.note,
});

export async function getLatestDraw(): Promise<Draw | null> {
  if (useSample) return sampleDraws[0];
  const rows = await query<DrawRow>("SELECT * FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT 1");
  return rows[0] ? toDraw(rows[0]) : null;
}

export async function getNextDraw(): Promise<Draw | null> {
  if (useSample) return sampleNext;
  const rows = await query<DrawRow>("SELECT * FROM draws WHERE status='upcoming' ORDER BY draw_date ASC LIMIT 1");
  return rows[0] ? toDraw(rows[0]) : null;
}

/** Published draws, newest first. `from` (YYYY-MM-DD) hides anything older: this is where the paid history is enforced. */
export async function getDraws(limit: number, offset = 0, from: string | null = null): Promise<{ draws: Draw[]; total: number }> {
  if (useSample) return { draws: sampleDraws.slice(offset, offset + limit), total: sampleDraws.length };
  const where = from ? "status='published' AND draw_date >= ?" : "status='published'";
  const args = from ? [from] : [];
  const [rows, count] = await Promise.all([
    query<DrawRow>(`SELECT * FROM draws WHERE ${where} ORDER BY draw_date DESC, id DESC LIMIT ? OFFSET ?`, [...args, limit, offset]),
    query<RowDataPacket & { n: number }>(`SELECT COUNT(*) AS n FROM draws WHERE ${where}`, args),
  ]);
  return { draws: rows.map(toDraw), total: Number(count[0].n) };
}

export async function getDrawByNo(drawNo: string): Promise<Draw | null> {
  if (useSample) return sampleDraws.find((d) => d.drawNo === drawNo) ?? null;
  const rows = await query<DrawRow>("SELECT * FROM draws WHERE draw_no=? AND status='published'", [drawNo]);
  return rows[0] ? toDraw(rows[0]) : null;
}

export async function getPrizes(drawId: number): Promise<Prize[]> {
  if (useSample) return samplePrizes;
  const rows = await query<RowDataPacket & { division: number; winners: number; prize_hkd: number | string }>(
    'SELECT division, winners, prize_hkd FROM draw_prizes WHERE draw_id=? ORDER BY division',
    [drawId],
  );
  return rows.map((r) => ({ division: r.division, winners: Number(r.winners), prizeHkd: Number(r.prize_hkd) }));
}

/** Admin-managed FAQ entries, or the built-in defaults when none exist yet. */
export async function getFaqs(): Promise<Faq[]> {
  if (useSample || !dbConfigured) return FAQS;
  try {
    const rows = await query<RowDataPacket & { question: string; answer: string }>(
      'SELECT question, answer FROM faqs WHERE active=1 ORDER BY sort_order, id',
    );
    return rows.length ? rows.map((r) => ({ q: r.question, a: r.answer })) : FAQS;
  } catch (err) {
    console.error('faqs unavailable, using defaults:', err);
    return FAQS;
  }
}

/** Biggest prize won in each of the given draws (draws nobody won anything in are left out). */
export async function getTopPrizes(drawIds: number[]): Promise<Record<number, TopPrize>> {
  const out: Record<number, TopPrize> = {};
  if (!drawIds.length) return out;
  if (useSample) {
    const best = samplePrizes.find((p) => p.winners > 0);
    if (best) for (const id of drawIds) out[id] = { division: best.division, prizeHkd: best.prizeHkd };
    return out;
  }
  const rows = await query<RowDataPacket & { draw_id: number; division: number; prize_hkd: number | string }>(
    'SELECT draw_id, division, prize_hkd FROM draw_prizes WHERE draw_id IN (?) AND winners > 0 ORDER BY draw_id, division',
    [drawIds],
  );
  for (const r of rows) out[r.draw_id] ??= { division: r.division, prizeHkd: Number(r.prize_hkd) };
  return out;
}

export async function getEvents(): Promise<EventItem[]> {
  if (useSample) return sampleEvents;
  const rows = await query<RowDataPacket & { id: number; title: string; event_date: string; body: string }>(
    'SELECT id, title, event_date, body FROM events WHERE active=1 AND event_date >= CURDATE() ORDER BY event_date LIMIT 10',
  );
  return rows.map((r) => ({ id: r.id, title: r.title, eventDate: r.event_date, body: r.body }));
}

let currencyCache: { at: number; value: Currency[] } | null = null;
/** Called after the admin edits currencies so the change shows up immediately. */
export const bustCurrencies = () => {
  currencyCache = null;
};

export async function getCurrencies(): Promise<Currency[]> {
  if (useSample) return sampleCurrencies;
  if (currencyCache && Date.now() - currencyCache.at < 30_000) return currencyCache.value;
  const value = await loadCurrencies();
  currencyCache = { at: Date.now(), value };
  return value;
}

async function loadCurrencies(): Promise<Currency[]> {
  try {
    const rows = await query<RowDataPacket & { code: string; name: string; symbol: string; rate: string }>(
      "SELECT code, name, symbol, rate FROM currencies WHERE active=1 ORDER BY code='HKD' DESC, code",
    );
    return rows.length ? rows.map((r) => ({ code: r.code, name: r.name, symbol: r.symbol, rate: Number(r.rate) })) : [HKD];
  } catch (err) {
    // The header calls this on every page, so a database problem must not break the error pages too.
    console.error('currencies unavailable, using HKD only:', err);
    return [HKD];
  }
}

/** The visitor's chosen display currency (cookie), falling back to HKD. */
export async function getCurrentCurrency(): Promise<{ current: Currency; all: Currency[] }> {
  const [all, jar] = await Promise.all([getCurrencies(), cookies()]);
  const wanted = jar.get('cur')?.value;
  return { all, current: all.find((c) => c.code === wanted) ?? all[0] ?? HKD };
}
