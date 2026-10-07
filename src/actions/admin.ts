'use server';

import { redirect } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { requireRole } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';
import { bustCurrencies } from '@/lib/data';
import { exec, query, tx, type Tx } from '@/lib/db';
import { isRole } from '@/lib/perms';
import { saveSeo, saveSettings } from '@/lib/settings';
import { SEO_DEFAULTS } from '@/lib/seo-db';
import { isDate, readCurrency, readDraw, type DrawInput } from '@/lib/validate';

// Server actions are public endpoints: every one starts with requireRole().

const str = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string).trim() : '');
const int = (fd: FormData, k: string) => parseInt(str(fd, k), 10) || 0;
const back = (path: string, kind: 'ok' | 'error', msg: string): never => redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);

/* ---------- draws ---------- */

/** `n` changes on every failed save so the form remounts and shows exactly what was typed (React 19 resets forms after an action). */
export type DrawFormState = { errors?: string[]; raw?: Record<string, string>; n?: number };

async function writePrizes(t: Tx, drawId: number, v: DrawInput) {
  if (v.status !== 'published') return;
  for (const p of v.prizes) {
    await t.exec('REPLACE INTO draw_prizes (draw_id, division, winners, prize_hkd) VALUES (?,?,?,?)', [drawId, p.division, p.winners, p.prizeHkd]);
  }
}

const DRAW_COLS = ['draw_no', 'draw_date', 'status', 'nums', 'extra', 'est_jackpot_hkd', 'snowball_hkd', 'turnover_hkd', 'fund_hkd', 'stop_selling_time', 'note'];
const INSERT_DRAW = `INSERT INTO draws (${DRAW_COLS.join(', ')}) VALUES (${DRAW_COLS.map(() => '?').join(', ')})`;
const UPDATE_DRAW = `UPDATE draws SET ${DRAW_COLS.map((c) => `${c}=?`).join(', ')} WHERE id=?`;
const UPSERT_DRAW = `${INSERT_DRAW} ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), ${DRAW_COLS.slice(1).map((c) => `${c}=VALUES(${c})`).join(', ')}`;

// Same order as DRAW_COLS. Winning numbers are only stored for a published draw.
const drawColumns = (v: DrawInput) => {
  const published = v.status === 'published';
  return [
    v.drawNo,
    v.drawDate,
    v.status,
    published ? [...v.numbers].sort((a, b) => a - b).join(',') : null,
    published ? v.extra : null,
    v.estJackpotHkd,
    v.snowballHkd,
    v.turnoverHkd,
    v.fundHkd,
    v.stopSelling ? `${v.stopSelling}:00` : null,
    v.note || null,
  ];
};

export async function saveDrawAction(_prev: DrawFormState, fd: FormData): Promise<DrawFormState> {
  await requireRole('content');
  const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  const { value, errors } = readDraw(raw);
  if (errors.length) return { errors, raw, n: Date.now() };

  const id = int(fd, 'id');
  try {
    await tx(async (t) => {
      let drawId = id;
      if (id) {
        await t.exec(UPDATE_DRAW, [...drawColumns(value), id]);
      } else {
        drawId = (await t.exec(INSERT_DRAW, drawColumns(value))).insertId;
      }
      await writePrizes(t, drawId, value);
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') return { errors: ['That draw number already exists.'], raw, n: Date.now() };
    throw err;
  }
  back('/admin/draws', 'ok', `Draw ${value.drawNo} saved.`);
  return {};
}

export async function toggleDrawStatusAction(fd: FormData) {
  await requireRole('content');
  const id = int(fd, 'id');
  const [d] = await query<RowDataPacket & { draw_no: string; status: string; nums: string | null; extra: number | null }>('SELECT draw_no, status, nums, extra FROM draws WHERE id=?', [id]);
  if (!d) back('/admin/draws', 'error', 'Draw not found.');
  if (d.status === 'published') {
    await exec("UPDATE draws SET status='upcoming' WHERE id=?", [id]);
    back('/admin/draws', 'ok', `Draw ${d.draw_no} is now a draft (hidden from the public).`);
  }
  if (!d.nums || !d.extra) back('/admin/draws', 'error', `Draw ${d.draw_no} has no winning numbers yet. Edit it first.`);
  await exec("UPDATE draws SET status='published' WHERE id=?", [id]);
  back('/admin/draws', 'ok', `Draw ${d.draw_no} is now published.`);
}

export async function deleteDrawAction(fd: FormData) {
  await requireRole('content');
  await exec('DELETE FROM draws WHERE id=?', [int(fd, 'id')]);
  back('/admin/draws', 'ok', 'Draw deleted.');
}

export type ImportState = { imported?: number; errors?: string[] };
const MAX_CSV_BYTES = 500_000;
const MAX_CSV_ROWS = 2000;

export async function importDrawsAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  await requireRole('content');
  const file = fd.get('file');
  let text = str(fd, 'csv');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CSV_BYTES) return { errors: ['That file is too large. Keep it under 500 KB.'] };
    text = await file.text();
  }
  if (!text.trim()) return { errors: ['Paste CSV text or choose a file.'] };
  if (text.length > MAX_CSV_BYTES) return { errors: ['That CSV is too large. Keep it under 500 KB.'] };

  const rows = parseCsv(text);
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  if (!header.includes('draw_no') || !header.includes('draw_date')) return { errors: ['The first row must be a header that includes draw_no and draw_date.'] };
  if (rows.length - 1 > MAX_CSV_ROWS) return { errors: [`Too many rows. Import at most ${MAX_CSV_ROWS} draws at a time.`] };

  const errors: string[] = [];
  const valid: DrawInput[] = [];
  rows.slice(1).forEach((cells, i) => {
    const raw: Record<string, string> = Object.fromEntries(header.map((h, j) => [h, (cells[j] ?? '').trim()]));
    if (!raw.status) raw.status = raw.n1 ? 'published' : 'upcoming';
    const { value, errors: errs } = readDraw(raw);
    if (errs.length) errors.push(`Line ${i + 2}: ${errs.join(' ')}`);
    else valid.push(value);
  });
  if (errors.length) return { errors: [...errors.slice(0, 20), ...(errors.length > 20 ? [`...and ${errors.length - 20} more.`] : []), 'Nothing was imported. Fix these lines and try again.'] };

  await tx(async (t) => {
    for (const v of valid) {
      const res = await t.exec(UPSERT_DRAW, drawColumns(v));
      await writePrizes(t, res.insertId, v);
    }
  });
  return { imported: valid.length };
}

/* ---------- events ---------- */

export async function saveEventAction(fd: FormData) {
  await requireRole('content');
  const title = str(fd, 'title').slice(0, 120);
  const date = str(fd, 'event_date');
  if (!title || !isDate(date)) back('/admin/events', 'error', 'A title and a valid date are required.');
  const row = [title, date, str(fd, 'body').slice(0, 500), fd.get('active') ? 1 : 0];
  const id = int(fd, 'id');
  if (id) await exec('UPDATE events SET title=?, event_date=?, body=?, active=? WHERE id=?', [...row, id]);
  else await exec('INSERT INTO events (title, event_date, body, active) VALUES (?,?,?,?)', row);
  back('/admin/events', 'ok', 'Event saved.');
}

export async function deleteEventAction(fd: FormData) {
  await requireRole('content');
  await exec('DELETE FROM events WHERE id=?', [int(fd, 'id')]);
  back('/admin/events', 'ok', 'Event deleted.');
}

/* ---------- FAQs ---------- */

export async function saveFaqAction(fd: FormData) {
  await requireRole('content');
  const question = str(fd, 'question').slice(0, 200);
  const answer = str(fd, 'answer').slice(0, 2000);
  if (!question || !answer) back('/admin/faqs', 'error', 'Both a question and an answer are required.');
  const row = [question, answer, int(fd, 'sort_order'), fd.get('active') ? 1 : 0];
  const id = int(fd, 'id');
  if (id) await exec('UPDATE faqs SET question=?, answer=?, sort_order=?, active=? WHERE id=?', [...row, id]);
  else await exec('INSERT INTO faqs (question, answer, sort_order, active) VALUES (?,?,?,?)', row);
  back('/admin/faqs', 'ok', 'FAQ saved. It appears on the site and in the FAQ structured data straight away.');
}

export async function deleteFaqAction(fd: FormData) {
  await requireRole('content');
  await exec('DELETE FROM faqs WHERE id=?', [int(fd, 'id')]);
  back('/admin/faqs', 'ok', 'FAQ deleted.');
}

/* ---------- SEO ---------- */

export async function saveSeoAction(fd: FormData) {
  await requireRole('content');
  const path = str(fd, 'path');
  if (!(path in SEO_DEFAULTS)) back('/admin/seo', 'error', 'Unknown page.');
  await saveSeo(path, str(fd, 'title').slice(0, 120), str(fd, 'description').slice(0, 300));
  back('/admin/seo', 'ok', `Saved ${SEO_DEFAULTS[path].label}. Search engines pick this up the next time they visit.`);
}

/* ---------- currencies (admin only) ---------- */

export async function saveCurrencyAction(fd: FormData) {
  await requireRole('manage');
  const { value, error } = readCurrency(Object.fromEntries(fd.entries()));
  if (error) back('/admin/currencies', 'error', error);
  await exec(
    'INSERT INTO currencies (code, name, symbol, rate, active) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), symbol=VALUES(symbol), rate=VALUES(rate), active=VALUES(active)',
    [value.code, value.name, value.symbol, value.rate, value.active ? 1 : 0],
  );
  bustCurrencies();
  back('/admin/currencies', 'ok', `${value.code} saved.`);
}

export async function deleteCurrencyAction(fd: FormData) {
  await requireRole('manage');
  const code = str(fd, 'code').toUpperCase();
  if (code === 'HKD') back('/admin/currencies', 'error', 'HKD is the base currency and cannot be removed.');
  await exec('DELETE FROM currencies WHERE code=?', [code]);
  bustCurrencies();
  back('/admin/currencies', 'ok', `${code} removed.`);
}

/* ---------- users and settings (admin only) ---------- */

export async function setRoleAction(fd: FormData) {
  const me = await requireRole('manage');
  const id = int(fd, 'id');
  const role = str(fd, 'role');
  const path = `/admin/users`;
  if (!isRole(role)) back(path, 'error', 'Unknown role.');
  if (id === me.id) back(path, 'error', 'You cannot change your own role. Ask another admin.');
  await exec('UPDATE users SET role=? WHERE id=?', [role, id]);
  back(path, 'ok', 'Role updated.');
}

export async function saveSettingsAction(fd: FormData) {
  await requireRole('manage');
  const siteName = str(fd, 'site_name').slice(0, 60);
  if (!siteName) back('/admin/settings', 'error', 'The site name cannot be empty.');
  await saveSettings({
    siteName,
    siteDescription: str(fd, 'site_description').slice(0, 300),
    announcement: str(fd, 'announcement').slice(0, 300),
    showJackpot: Boolean(fd.get('show_jackpot')),
    maintenance: Boolean(fd.get('maintenance')),
  });
  back('/admin/settings', 'ok', 'Settings saved.');
}
