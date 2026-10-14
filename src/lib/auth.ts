import 'server-only';
import { createHash } from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { jwtVerify, SignJWT } from 'jose';
import type { RowDataPacket } from 'mysql2/promise';
import { pickClientIp } from './client-ip';
import { dbConfigured, exec, query } from './db';
import { can, type Level, type Role } from './perms';

// The __Host- prefix makes browsers refuse the cookie unless it is Secure, sent from this exact host and set for the whole site: it cannot be planted from a sub-domain or over plain http.
const COOKIE = process.env.NODE_ENV === 'production' ? '__Host-mh_session' : 'mh_session';
const MAX_AGE = 7 * 24 * 3600;
const prod = process.env.NODE_ENV === 'production';

export type User = { id: number; email: string; role: Role; currency: string; verified: boolean; historyFrom: string | null; historyYears: number; twoStep: boolean };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (prod) throw new Error('SESSION_SECRET (32+ characters) is required in production');
  return new TextEncoder().encode('dev-only-secret-change-me-dev-only-secret');
}

// A password change must end every other session, so the token carries a fingerprint of the current hash.
const fingerprint = (passHash: string) => createHash('sha256').update(passHash).digest('base64url').slice(0, 12);

export async function createSession(userId: number, passHash: string) {
  const token = await new SignJWT({ pv: fingerprint(passHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: prod, path: '/', maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

type UserRow = RowDataPacket & { id: number; email: string; role: Role; currency: string; pass_hash: string; blocked: number; email_verified: number; history_from: string | null; history_years: number; totp_on: number };

/** The signed-in user, or null. Cached per request. */
export const getUser = cache(async (): Promise<User | null> => {
  // Read cookies first, always: it marks the page as per-request so it can never be frozen at build time.
  const jar = await cookies();
  if (!dbConfigured) return null;
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const rows = await query<UserRow>('SELECT id, email, role, currency, pass_hash, blocked, email_verified, history_from, history_years, totp_on FROM users WHERE id=?', [Number(payload.sub)]);
    const u = rows[0];
    if (!u || u.blocked || payload.pv !== fingerprint(u.pass_hash)) return null;
    return { id: u.id, email: u.email, role: u.role, currency: u.currency, verified: Boolean(u.email_verified), historyFrom: u.history_from ? String(u.history_from).slice(0, 10) : null, historyYears: Number(u.history_years) || 0, twoStep: Boolean(Number(u.totp_on)) };
  } catch {
    return null;
  }
});

export async function requireUser(next = '/account'): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Guard for admin pages AND server actions (actions are public endpoints, so each one must call this). */
export async function requireRole(level: Level): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login?next=/admin');
  if (!can(user.role, level)) notFound();
  // Optional rule (REQUIRE_STAFF_2FA=1): staff must have two-step login switched on before they can use the admin area.
  if (process.env.REQUIRE_STAFF_2FA === '1' && !user.twoStep) redirect('/account/settings?two=required#two-step');
  return user;
}

export async function touchLogin(userId: number) {
  await exec('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id=?', [userId]);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return pickClientIp(h.get('x-forwarded-for'), h.get('x-real-ip'), Number(process.env.TRUSTED_PROXY_HOPS) || 0);
}

/** What the proxies told us, for the admin Health page: the raw header and the address chosen from it. */
export async function clientIpDiagnostics(): Promise<{ chain: string; chosen: string; hops: number }> {
  const h = await headers();
  const hops = Number(process.env.TRUSTED_PROXY_HOPS) || 0;
  return { chain: h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '(none)', chosen: pickClientIp(h.get('x-forwarded-for'), h.get('x-real-ip'), hops), hops };
}

/** One-way fingerprint of an address, so sign-ups from the same place can be counted without storing the address itself. */
export const ipHash = (ip: string) => createHash('sha256').update(`${process.env.SESSION_SECRET ?? 'dev'}|${ip}`).digest('hex').slice(0, 32);
