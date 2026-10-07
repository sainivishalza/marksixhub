'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { requireUser } from '@/lib/auth';
import { query, tx } from '@/lib/db';
import { HISTORY_MAX_YEARS, upgradeCost, yearsBefore } from '@/lib/history-rules';
import { rateLimit } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { safeNext } from '@/lib/validate';

/** `path?x=1` plus one more query value, keeping what was there. */
function withParam(path: string, key: string, value: string) {
  const u = new URL(path, 'http://local');
  u.searchParams.set(key, value);
  return `${u.pathname}${u.search}`;
}

/** Buys years of older results with points. Only the extra years are charged when upgrading. */
export async function unlockHistoryAction(fd: FormData) {
  const user = await requireUser('/results');
  const back = safeNext(typeof fd.get('next') === 'string' ? (fd.get('next') as string) : '', '/results');
  const go = (code: string): never => redirect(`${withParam(back, 'unlock', code)}#unlock`);
  const years = parseInt(String(fd.get('years') ?? ''), 10);
  if (!Number.isInteger(years) || years < 1 || years > HISTORY_MAX_YEARS) return go('bad');
  if (!user.verified) return go('verify');
  if (!rateLimit(`unlock:${user.id}`, 10, 60 * 60_000).ok) return go('wait');

  const [newest] = await query<RowDataPacket & { d: string | null }>("SELECT MAX(draw_date) AS d FROM draws WHERE status='published'");
  if (!newest?.d) return go('bad');
  const latest = String(newest.d).slice(0, 10);
  const price = (await getSettings()).historyYearPoints;

  const outcome = await tx(async (t) => {
    // The row is locked, so two quick clicks cannot be charged twice.
    const [u] = await t.query<RowDataPacket & { points: number; history_years: number; history_from: string | null }>(
      'SELECT points, history_years, history_from FROM users WHERE id=? FOR UPDATE',
      [user.id],
    );
    if (!u) return 'bad';
    if (years <= Number(u.history_years)) return 'owned';
    const cost = upgradeCost(Number(u.history_years), years, price);
    if (Number(u.points) < cost) return 'poor';
    const wanted = yearsBefore(latest, years);
    const kept = u.history_from ? String(u.history_from).slice(0, 10) : null;
    await t.exec('UPDATE users SET points = points - ?, history_years = ?, history_from = ? WHERE id=?', [cost, years, kept && kept < wanted ? kept : wanted, user.id]);
    if (cost > 0) await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [user.id, -cost, `Older results: ${years} year${years === 1 ? '' : 's'}`]);
    return 'ok';
  });
  revalidatePath('/account', 'layout');
  return go(outcome);
}
