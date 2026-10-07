'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { RowDataPacket } from 'mysql2/promise';
import { clientIp, createSession, destroySession, getUser, requireUser, touchLogin } from '@/lib/auth';
import { dbConfigured, exec, query, tx } from '@/lib/db';
import { isBall, MAX_MULTI, sortAsc, ticketUnits } from '@/lib/mark6';
import { can } from '@/lib/perms';
import { DUMMY_HASH, hashPassword, verifyPassword } from '@/lib/password';
import { addPoints, openDraw } from '@/lib/points';
import { getSettings } from '@/lib/settings';
import { rateLimit } from '@/lib/rate-limit';
import { EMAIL, passwordProblem, safeNext } from '@/lib/validate';

/** `email` is echoed back after a failed attempt so the form can keep what was typed. */
export type FormState = { error?: string; ok?: string; email?: string };

const MAX_SETS = 50;
const text = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '');
const tooMany = (sec: number) => ({ error: `Too many attempts. Try again in ${Math.ceil(sec / 60)} minute${sec > 60 ? 's' : ''}.` });
const NO_DB: FormState = { error: 'The database is not connected yet, so accounts are unavailable.' };

type UserRow = RowDataPacket & { id: number; pass_hash: string; role: 'user' | 'viewer' | 'editor' | 'admin'; blocked?: number };

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!dbConfigured) return NO_DB;
  const limit = rateLimit(`login:${await clientIp()}`, 10, 15 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfterSec);

  const email = text(fd, 'email').trim().toLowerCase().slice(0, 190);
  const password = text(fd, 'password').slice(0, 200);
  const [user] = await query<UserRow>('SELECT id, pass_hash, role, blocked FROM users WHERE email=?', [email]);
  const ok = user ? await verifyPassword(password, user.pass_hash) : (await verifyPassword(password, DUMMY_HASH), false);
  if (!ok || !user) return { error: 'Wrong email or password.', email };
  if (user.blocked) return { error: 'This account has been suspended.', email };

  await createSession(user.id, user.pass_hash);
  await touchLogin(user.id);
  const next = text(fd, 'next');
  redirect(safeNext(next, can(user.role, 'view') ? '/admin' : '/account'));
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!dbConfigured) return NO_DB;
  const limit = rateLimit(`register:${await clientIp()}`, 5, 60 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfterSec);

  const email = text(fd, 'email').trim().toLowerCase();
  const password = text(fd, 'password');
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.', email };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, email };
  if ((await query('SELECT id FROM users WHERE email=?', [email])).length) return { error: 'That email is already registered. Try logging in.', email };

  const currency = (await cookies()).get('cur')?.value;
  const hash = await hashPassword(password);
  const { signupPoints } = await getSettings();
  const { insertId } = await exec('INSERT INTO users (email, pass_hash, currency, points, last_login_at) VALUES (?,?,?,?,UTC_TIMESTAMP())', [
    email,
    hash,
    currency && /^[A-Z]{3}$/.test(currency) ? currency : 'HKD',
    signupPoints,
  ]);
  if (signupPoints) await exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [insertId, signupPoints, 'Welcome points']);
  await createSession(insertId, hash);
  redirect('/account');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

const MAX_PER_ORDER = 20;

/** Places one order of tickets for the next draw. A ticket is 6 numbers (single) or 7 to 12 (multiple, worth C(n,6) tickets). */
export async function placeTicketsAction(sets: number[][]): Promise<{ ok: boolean; message: string; points?: number }> {
  const user = await getUser();
  if (!user) return { ok: false, message: 'Log in to place tickets.' };
  const tickets = (Array.isArray(sets) ? sets : []).slice(0, MAX_PER_ORDER).map((s) => [...new Set(Array.isArray(s) ? s.map(Number) : [])]);
  if (!tickets.length || tickets.some((t) => t.length < 6 || t.length > MAX_MULTI || !t.every(isBall))) {
    return { ok: false, message: `Each ticket needs 6 different numbers (or up to ${MAX_MULTI} for a multiple entry), from 1 to 49.` };
  }
  const [{ n }] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM saved_sets WHERE user_id=?', [user.id]);
  if (Number(n) + tickets.length > MAX_SETS) return { ok: false, message: `You can keep up to ${MAX_SETS} tickets. Delete some first.` };
  const open = await openDraw();
  if (!open) return { ok: false, message: 'Ordering is closed. The next draw opens for tickets once it is announced.' };
  const next = { draw_no: open.drawNo };

  const { ticketPoints } = await getSettings();
  const units = tickets.map((t) => ticketUnits(t.length));
  const total = units.reduce((a, b) => a + b, 0);
  const cost = ticketPoints * total;
  const label = `${total} ticket${total === 1 ? '' : 's'}`;
  const left = await tx(async (t) => {
    const res = await t.exec('UPDATE users SET points = points - ? WHERE id=? AND points >= ?', [cost, user.id, cost]);
    if (!res.affectedRows) return null;
    await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [user.id, -cost, `${label}, draw ${next.draw_no}`]);
    const orderId = (await t.exec('INSERT INTO orders (user_id, draw_no, tickets, points) VALUES (?,?,?,?)', [user.id, next.draw_no, total, cost])).insertId;
    for (const [i, tk] of tickets.entries()) {
      await t.exec('INSERT INTO saved_sets (user_id, nums, draw_no, order_id, units) VALUES (?,?,?,?,?)', [user.id, sortAsc(tk).join(','), next.draw_no, orderId, units[i]]);
    }
    const [u] = await t.query<RowDataPacket & { points: number }>('SELECT points FROM users WHERE id=?', [user.id]);
    return Number(u.points);
  });
  if (left === null) return { ok: false, message: `You need ${cost} points for ${label}. Claim your free daily points in My account.` };
  revalidatePath('/account');
  return { ok: true, points: left, message: `Order placed: ${label} for draw ${next.draw_no}. ${cost} points taken, ${left} left.` };
}

export async function claimDailyAction() {
  const user = await requireUser();
  const { dailyPoints } = await getSettings();
  // One claim per UTC day; the WHERE makes a double click harmless. MySQL assigns left to right, so `streak` sees the old last_claim.
  const res = await exec(
    'UPDATE users SET streak = IF(last_claim = UTC_DATE() - INTERVAL 1 DAY, streak + 1, 1), last_claim = UTC_DATE() WHERE id=? AND (last_claim IS NULL OR last_claim < UTC_DATE())',
    [user.id],
  );
  if (res.affectedRows) {
    const [u] = await query<RowDataPacket & { streak: number }>('SELECT streak FROM users WHERE id=?', [user.id]);
    const bonus = dailyPoints + 10 * (Math.min(Number(u.streak), 7) - 1); // +10 per day of streak, up to day 7
    await addPoints(user.id, bonus, `Daily free points (day ${u.streak} streak)`);
  }
  revalidatePath('/account');
}

export async function saveNicknameAction(fd: FormData) {
  const user = await requireUser();
  const nick = text(fd, 'nickname').trim();
  const bad = (msg: string): never => redirect(`/account?nick=${encodeURIComponent(msg)}`);
  if (nick && !/^[A-Za-z0-9_-]{3,20}$/.test(nick)) bad('Use 3 to 20 letters, numbers, - or _.');
  try {
    await exec('UPDATE users SET nickname=? WHERE id=?', [nick || null, user.id]);
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') bad('That nickname is taken.');
    throw err;
  }
  redirect(`/account?nick=${encodeURIComponent(nick ? 'Saved. You are on the leaderboard.' : 'Removed. You are off the leaderboard.')}`);
}

export async function deleteSetAction(fd: FormData) {
  const user = await requireUser();
  await exec('DELETE FROM saved_sets WHERE id=? AND user_id=? AND settled=1', [parseInt(text(fd, 'id'), 10) || 0, user.id]);
  revalidatePath('/account');
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const limit = rateLimit(`pw:${user.id}`, 5, 15 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfterSec);

  const [row] = await query<UserRow>('SELECT id, pass_hash, role FROM users WHERE id=?', [user.id]);
  if (!row || !(await verifyPassword(text(fd, 'current').slice(0, 200), row.pass_hash))) return { error: 'Your current password is not right.' };
  const next = text(fd, 'next_password');
  const problem = passwordProblem(next);
  if (problem) return { error: problem };

  const hash = await hashPassword(next);
  await exec('UPDATE users SET pass_hash=? WHERE id=?', [hash, user.id]);
  await createSession(user.id, hash); // every other session is now signed out
  return { ok: 'Password changed. Other devices have been signed out.' };
}

export type Favourite = { id: number; nums: number[] };
const MAX_FAVOURITES = 10;

async function favourites(userId: number): Promise<Favourite[]> {
  const rows = await query<RowDataPacket & { id: number; nums: string }>('SELECT id, nums FROM favourites WHERE user_id=? ORDER BY id DESC', [userId]);
  return rows.map((r) => ({ id: r.id, nums: r.nums.split(',').map(Number) }));
}

export async function saveFavouriteAction(numbers: number[]): Promise<{ ok: boolean; message: string; favourites?: Favourite[] }> {
  const user = await getUser();
  if (!user) return { ok: false, message: 'Log in to save favourites.' };
  const nums = sortAsc([...new Set(Array.isArray(numbers) ? numbers.map(Number) : [])]);
  if (nums.length < 6 || nums.length > MAX_MULTI || !nums.every(isBall)) return { ok: false, message: 'Choose a full set of numbers first.' };
  const list = await favourites(user.id);
  if (list.length >= MAX_FAVOURITES) return { ok: false, message: `You can keep ${MAX_FAVOURITES} favourites. Remove one first.` };
  const key = nums.join(',');
  if (list.some((f) => f.nums.join(',') === key)) return { ok: false, message: 'Already in your favourites.' };
  await exec('INSERT INTO favourites (user_id, nums) VALUES (?,?)', [user.id, key]);
  return { ok: true, message: 'Saved to your favourites.', favourites: await favourites(user.id) };
}

export async function deleteFavouriteAction(id: number): Promise<{ ok: boolean; message: string; favourites?: Favourite[] }> {
  const user = await getUser();
  if (!user) return { ok: false, message: 'Log in first.' };
  await exec('DELETE FROM favourites WHERE id=? AND user_id=?', [Number(id) || 0, user.id]);
  return { ok: true, message: 'Removed.', favourites: await favourites(user.id) };
}

export async function dismissWinsAction() {
  const user = await requireUser();
  await exec('UPDATE saved_sets SET notified=1 WHERE user_id=? AND settled=1', [user.id]);
  revalidatePath('/account');
}
