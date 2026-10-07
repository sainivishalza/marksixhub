'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { RowDataPacket } from 'mysql2/promise';
import { clientIp, createSession, destroySession, getUser, requireUser, touchLogin } from '@/lib/auth';
import { dbConfigured, exec, query } from '@/lib/db';
import { isBall, sortAsc } from '@/lib/mark6';
import { can } from '@/lib/perms';
import { DUMMY_HASH, hashPassword, verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';
import { EMAIL, passwordProblem, safeNext } from '@/lib/validate';

export type FormState = { error?: string; ok?: string };

const MAX_SETS = 50;
const text = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '');
const tooMany = (sec: number) => ({ error: `Too many attempts. Try again in ${Math.ceil(sec / 60)} minute${sec > 60 ? 's' : ''}.` });
const NO_DB: FormState = { error: 'The database is not connected yet, so accounts are unavailable.' };

type UserRow = RowDataPacket & { id: number; pass_hash: string; role: 'user' | 'viewer' | 'editor' | 'admin' };

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!dbConfigured) return NO_DB;
  const limit = rateLimit(`login:${await clientIp()}`, 10, 15 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfterSec);

  const email = text(fd, 'email').trim().toLowerCase().slice(0, 190);
  const password = text(fd, 'password').slice(0, 200);
  const [user] = await query<UserRow>('SELECT id, pass_hash, role FROM users WHERE email=?', [email]);
  const ok = user ? await verifyPassword(password, user.pass_hash) : (await verifyPassword(password, DUMMY_HASH), false);
  if (!ok || !user) return { error: 'Wrong email or password.' };

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
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if ((await query('SELECT id FROM users WHERE email=?', [email])).length) return { error: 'That email is already registered. Try logging in.' };

  const currency = (await cookies()).get('cur')?.value;
  const hash = await hashPassword(password);
  const { insertId } = await exec('INSERT INTO users (email, pass_hash, currency, last_login_at) VALUES (?,?,?,UTC_TIMESTAMP())', [
    email,
    hash,
    currency && /^[A-Z]{3}$/.test(currency) ? currency : 'HKD',
  ]);
  await createSession(insertId, hash);
  redirect('/account');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function saveSetAction(numbers: number[]): Promise<{ ok: boolean; message: string }> {
  const user = await getUser();
  if (!user) return { ok: false, message: 'Log in to save numbers.' };
  const nums = [...new Set(Array.isArray(numbers) ? numbers.map(Number) : [])];
  if (nums.length !== 6 || !nums.every(isBall)) return { ok: false, message: 'Pick exactly 6 different numbers from 1 to 49.' };
  const [{ n }] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM saved_sets WHERE user_id=?', [user.id]);
  if (Number(n) >= MAX_SETS) return { ok: false, message: `You can keep up to ${MAX_SETS} saved sets. Delete one first.` };
  await exec('INSERT INTO saved_sets (user_id, nums) VALUES (?,?)', [user.id, sortAsc(nums).join(',')]);
  revalidatePath('/account');
  return { ok: true, message: 'Saved to your account.' };
}

export async function deleteSetAction(fd: FormData) {
  const user = await requireUser();
  await exec('DELETE FROM saved_sets WHERE id=? AND user_id=?', [parseInt(text(fd, 'id'), 10) || 0, user.id]);
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
