import 'server-only';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';
import { dbConfigured, query } from './db';
import { FAQS, type Faq } from './faq';
import { HKD } from './format';
import { sampleCurrencies, sampleDraws, sampleEvents, sampleNext, samplePrizes } from './sample';
import type { Currency, Draw, EventItem, Prize } from './types';

// With no database configured, development shows sample data; production never does.
const useSample = !dbConfigured && process.env.NODE_ENV !== 'production';

export type DrawRow = RowDataPacket & {
  id: number; draw_no: string; draw_date: string; status: 'upcoming' | 'published';
  nums: string | null; extra: number | null; est_jackpot_hkd: number | string; note: string | null;
};

export const toDraw = (r: DrawRow): Draw => ({
  id: r.id,
  drawNo: r.draw_no,
  drawDate: r.draw_date,
  status: r.status,
  numbers: r.nums ? r.nums.split(',').map(Number) : [],
  extra: r.extra,
  estJackpotHkd: Number(r.est_jackpot_hkd),
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

export async function getDraws(limit: number, offset = 0): Promise<{ draws: Draw[]; total: number }> {
  if (useSample) return { draws: sampleDraws.slice(offset, offset + limit), total: sampleDraws.length };
  const [rows, count] = await Promise.all([
    query<DrawRow>("SELECT * FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT ? OFFSET ?", [limit, offset]),
    query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM draws WHERE status='published'"),
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
  return rows.map((r) => ({ division: r.division, winners: r.winners, prizeHkd: Number(r.prize_hkd) }));
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

export async function getEvents(): Promise<EventItem[]> {
  if (useSample) return sampleEvents;
  const rows = await query<RowDataPacket & { id: number; title: string; event_date: string; body: string }>(
    'SELECT id, title, event_date, body FROM events WHERE active=1 AND event_date >= CURDATE() ORDER BY event_date LIMIT 10',
  );
  return rows.map((r) => ({ id: r.id, title: r.title, eventDate: r.event_date, body: r.body }));
}

export async function getCurrencies(): Promise<Currency[]> {
  if (useSample) return sampleCurrencies;
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
