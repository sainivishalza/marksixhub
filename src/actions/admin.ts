'use server';

import { redirect } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { requireRole } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';
import { bustCurrencies } from '@/lib/data';
import { exec, query, tx, type Tx } from '@/lib/db';
import { audit } from '@/lib/audit';
import { addPoints, reversePayouts, settleTickets } from '@/lib/points';
import { isRole } from '@/lib/perms';
import { saveSeo, saveSettings } from '@/lib/settings';
import { SEO_DEFAULTS } from '@/lib/seo-db';
import { isDate, readCurrency, readDraw, type DrawInput } from '@/lib/validate';

// Server actions are public endpoints: every one starts with requireRole().

const str = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string).trim() : '');
const int = (fd: FormData, k: string) => parseInt(str(fd, k), 10) || 0;
const back = (path: string, kind: 'ok' | 'error', msg: string): never => redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);

/* ---------- draws ---------- */

async function pendingOrders(drawNo: string) {
  const [r] = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM orders WHERE draw_no=? AND status='pending'", [drawNo]);
  return Number(r.n);
}

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
  const me = await requireRole('content');
  const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  const { value, errors } = readDraw(raw);
  if (errors.length) return { errors, raw, n: Date.now() };

  const id = int(fd, 'id');
  if (value.status === 'published') {
    const pending = await pendingOrders(value.drawNo);
    if (pending) return { errors: [`${pending} order${pending === 1 ? ' is' : 's are'} still waiting for approval for this draw. Approve or reject them on the Orders page first.`], raw, n: Date.now() };
  }
  const [old] = await query<RowDataPacket & { nums: string | null; extra: number | null }>('SELECT nums, extra FROM draws WHERE draw_no=?', [value.drawNo]);
  const newNums = value.status === 'published' ? [...value.numbers].sort((a, b) => a - b).join(',') : null;
  const newExtra = value.status === 'published' ? value.extra : null;
  const changed = Boolean(old) && (old.nums !== newNums || old.extra !== newExtra);
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
  const undone = changed ? await reversePayouts(value.drawNo) : 0;
  await settleTickets();
  await audit(me.id, 'draw.save', `${value.drawNo} (${value.status})${changed ? `, result changed, ${undone} payouts reversed and re-paid` : ''}`);
  back('/admin/draws', 'ok', `Draw ${value.drawNo} saved.`);
  return {};
}

export async function toggleDrawStatusAction(fd: FormData) {
  const me = await requireRole('content');
  const id = int(fd, 'id');
  const [d] = await query<RowDataPacket & { draw_no: string; status: string; nums: string | null; extra: number | null }>('SELECT draw_no, status, nums, extra FROM draws WHERE id=?', [id]);
  if (!d) back('/admin/draws', 'error', 'Draw not found.');
  if (d.status === 'published') {
    await exec("UPDATE draws SET status='upcoming' WHERE id=?", [id]);
    const undone = await reversePayouts(d.draw_no);
    await audit(me.id, 'draw.unpublish', `${d.draw_no}, ${undone} payouts reversed`);
    back('/admin/draws', 'ok', `Draw ${d.draw_no} is now a draft (hidden from the public).${undone ? ` Points paid to ${undone} users were taken back.` : ''}`);
  }
  if (!d.nums || !d.extra) back('/admin/draws', 'error', `Draw ${d.draw_no} has no winning numbers yet. Edit it first.`);
  const pending = await pendingOrders(d.draw_no);
  if (pending) back('/admin/draws', 'error', `${pending} order${pending === 1 ? ' is' : 's are'} still waiting for approval for draw ${d.draw_no}. Approve or reject them first (Orders page).`);
  await exec("UPDATE draws SET status='published' WHERE id=?", [id]);
  await settleTickets();
  await audit(me.id, 'draw.publish', d.draw_no);
  back('/admin/draws', 'ok', `Draw ${d.draw_no} is now published.`);
}

export async function deleteDrawAction(fd: FormData) {
  const me = await requireRole('content');
  await exec('DELETE FROM draws WHERE id=?', [int(fd, 'id')]);
  await audit(me.id, 'draw.delete', `id ${int(fd, 'id')}`);
  back('/admin/draws', 'ok', 'Draw deleted.');
}

export type ImportState = { imported?: number; errors?: string[] };
const MAX_CSV_BYTES = 500_000;
const MAX_CSV_ROWS = 2000;

export async function importDrawsAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const me = await requireRole('content');
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
  await settleTickets();
  await audit(me.id, 'draw.import', `${valid.length} draws`);
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
  if (role === 'admin' && !fd.get('confirm')) back(path, 'error', 'Tick "Confirm" to make someone an admin. Admins can manage users, points and settings.');
  await exec('UPDATE users SET role=? WHERE id=?', [role, id]);
  await audit(me.id, 'user.role', `user ${id} -> ${role}`);
  back(path, 'ok', 'Role updated.');
}

export async function saveSettingsAction(fd: FormData) {
  const me = await requireRole('manage');
  const siteName = str(fd, 'site_name').slice(0, 60);
  if (!siteName) back('/admin/settings', 'error', 'The site name cannot be empty.');
  await saveSettings({
    siteName,
    siteDescription: str(fd, 'site_description').slice(0, 300),
    announcement: str(fd, 'announcement').slice(0, 300),
    showJackpot: Boolean(fd.get('show_jackpot')),
    maintenance: Boolean(fd.get('maintenance')),
    ticketPoints: int(fd, 'ticket_points'),
    dailyPoints: int(fd, 'daily_points'),
    signupPoints: int(fd, 'signup_points'),
    prizePoints: Array.from({ length: 7 }, (_, i) => int(fd, `prize_${i + 1}`)),
  });
  await audit(me.id, 'settings.save', 'site and points settings');
  back('/admin/settings', 'ok', 'Settings saved.');
}

export async function grantPointsAction(fd: FormData) {
  const me = await requireRole('manage');
  const id = int(fd, 'id');
  const amount = int(fd, 'amount');
  if (!id || !amount || Math.abs(amount) > 1_000_000) back('/admin/users', 'error', 'Enter a whole number of points between -1,000,000 and 1,000,000.');
  const ok = await addPoints(id, amount, `Admin ${amount > 0 ? 'grant' : 'adjustment'}`);
  if (ok) await audit(me.id, 'points.adjust', `user ${id}: ${amount}`);
  back('/admin/users', ok ? 'ok' : 'error', ok ? 'Points updated.' : 'That would take the balance below zero.');
}

const ordersPath = (drawNo: string) => `/admin/orders?draw=${encodeURIComponent(drawNo)}`;

/** Approves one order: its numbers are now accepted and wait for the result. */
export async function approveOrderAction(fd: FormData) {
  const me = await requireRole('support');
  const id = int(fd, 'id');
  const drawNo = str(fd, 'draw');
  const res = await exec("UPDATE orders SET status='accepted' WHERE id=? AND status='pending' AND refunded=0", [id]);
  if (!res.affectedRows) back(ordersPath(drawNo), 'error', 'That order is not waiting for approval.');
  await audit(me.id, 'order.approve', `order ${id}, draw ${drawNo}`);
  back(ordersPath(drawNo), 'ok', `Order #${id} approved.`);
}

export async function approveAllAction(fd: FormData) {
  const me = await requireRole('support');
  const drawNo = str(fd, 'draw');
  const res = await exec("UPDATE orders SET status='accepted' WHERE draw_no=? AND status='pending' AND refunded=0", [drawNo]);
  await audit(me.id, 'order.approve_all', `${res.affectedRows} orders, draw ${drawNo}`);
  back(ordersPath(drawNo), 'ok', `${res.affectedRows} orders approved.`);
}

/** Rejects a pending order or refunds an accepted one (draw not published yet): the tickets are removed and the points go back. */
export async function refundOrderAction(fd: FormData) {
  const me = await requireRole('support');
  const id = int(fd, 'id');
  const drawNo = str(fd, 'draw');
  const reject = str(fd, 'decision') === 'reject';
  const done = await tx(async (t) => {
    const [o] = await t.query<RowDataPacket & { user_id: number; points: number; draw_no: string }>(
      "SELECT o.user_id, o.points, o.draw_no FROM orders o JOIN draws d ON d.draw_no = o.draw_no AND d.status='upcoming' WHERE o.id=? AND o.refunded=0 FOR UPDATE",
      [id],
    );
    if (!o) return false;
    await t.exec('UPDATE orders SET refunded=1, status=? WHERE id=?', [reject ? 'rejected' : 'refunded', id]);
    await t.exec('DELETE FROM saved_sets WHERE order_id=? AND settled=0', [id]);
    await t.exec('UPDATE users SET points = points + ? WHERE id=?', [o.points, o.user_id]);
    await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [o.user_id, o.points, `${reject ? 'Order rejected' : 'Refund'} #${id}`]);
    return true;
  });
  if (!done) back(ordersPath(drawNo), 'error', 'That order cannot be changed (already refunded, or its draw is published).');
  await audit(me.id, reject ? 'order.reject' : 'order.refund', `order ${id}, draw ${drawNo}`);
  back(ordersPath(drawNo), 'ok', reject ? `Order #${id} rejected and the points returned.` : `Order #${id} refunded.`);
}

export async function setBlockedAction(fd: FormData) {
  const me = await requireRole('manage');
  const id = int(fd, 'id');
  const blocked = str(fd, 'blocked') === '1';
  const path = `/admin/users/${id}`;
  if (id === me.id) back(path, 'error', 'You cannot suspend your own account.');
  await exec('UPDATE users SET blocked=? WHERE id=?', [blocked ? 1 : 0, id]);
  await audit(me.id, blocked ? 'user.suspend' : 'user.unsuspend', `user ${id}`);
  back(path, 'ok', blocked ? 'Account suspended. They are signed out and cannot log in.' : 'Account restored.');
}

export async function grantAllAction(fd: FormData) {
  const me = await requireRole('manage');
  const amount = int(fd, 'amount');
  if (!fd.get('confirm')) back('/admin/users', 'error', 'Tick the confirmation box first.');
  if (amount < 1 || amount > 100_000) back('/admin/users', 'error', 'Enter 1 to 100,000 points.');
  const n = await tx(async (t) => {
    const res = await t.exec('UPDATE users SET points = points + ? WHERE blocked=0', [amount]);
    await t.exec("INSERT INTO point_log (user_id, delta, reason) SELECT id, ?, 'Bonus from the site' FROM users WHERE blocked=0", [amount]);
    return res.affectedRows;
  });
  await audit(me.id, 'points.grant_all', `${amount} each to ${n} users`);
  back('/admin/users', 'ok', `${amount} points given to ${n} users.`);
}
