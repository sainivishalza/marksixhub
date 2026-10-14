import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { exec, query } from './db';
import { ACHIEVEMENTS, earnedCodes, progressOf, type AchievementStats } from './achievements-rules';

export type AchievementView = { code: string; title: string; text: string; earned: boolean; isNew: boolean; at: string | null; progress: { have: number; goal: number } | null };

const n = (v: unknown) => Number(v) || 0;

async function stats(userId: number): Promise<AchievementStats> {
  const [u] = await query<RowDataPacket & { streak: number; nickname: string | null; totp_on: number; email_verified: number; days: number }>(
    'SELECT streak, nickname, totp_on, email_verified, TIMESTAMPDIFF(DAY, created_at, NOW()) AS days FROM users WHERE id=?',
    [userId],
  );
  const [o] = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM orders WHERE user_id=? AND status='accepted' AND refunded=0", [userId]);
  const [w] = await query<RowDataPacket & { n: number | null }>('SELECT SUM(won_points) AS n FROM saved_sets WHERE user_id=? AND settled=1', [userId]);
  const [t] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM transfers WHERE from_user=?', [userId]);
  const [i] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM users WHERE referred_by=? AND referral_paid=1', [userId]);
  return {
    orders: n(o?.n),
    won: n(w?.n),
    streak: n(u?.streak),
    sent: n(t?.n),
    invites: n(i?.n),
    nickname: Boolean(u?.nickname),
    twoStep: Boolean(n(u?.totp_on)),
    verified: Boolean(n(u?.email_verified)),
    memberDays: n(u?.days),
  };
}

/** Works out what the member has earned, remembers new badges (a badge is kept even if the number behind it later drops, like a streak), and returns every badge with its progress. */
export async function syncAchievements(userId: number): Promise<AchievementView[]> {
  const s = await stats(userId);
  const have = new Map((await query<RowDataPacket & { code: string; at: string }>('SELECT code, earned_at AS at FROM achievements WHERE user_id=?', [userId])).map((r) => [r.code, String(r.at)]));
  const fresh = new Set<string>();
  for (const code of earnedCodes(s)) {
    if (have.has(code)) continue;
    const res = await exec('INSERT IGNORE INTO achievements (user_id, code) VALUES (?,?)', [userId, code]);
    if (res.affectedRows) fresh.add(code);
  }
  const at = new Map(have);
  if (fresh.size) for (const r of await query<RowDataPacket & { code: string; at: string }>('SELECT code, earned_at AS at FROM achievements WHERE user_id=?', [userId])) at.set(r.code, String(r.at));
  return ACHIEVEMENTS.map((a) => ({ code: a.code, title: a.title, text: a.text, earned: at.has(a.code), isNew: fresh.has(a.code), at: at.get(a.code) ?? null, progress: at.has(a.code) ? null : progressOf(a.code, s) }));
}
