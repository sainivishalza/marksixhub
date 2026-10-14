import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { exec, query, tx } from './db';
import { newInviteCode, referralProblem } from './referral-rules';
import { getSettings } from './settings';

/** The member's invite code, created the first time it is needed. */
export async function ensureInviteCode(userId: number): Promise<string> {
  const [row] = await query<RowDataPacket & { invite_code: string | null }>('SELECT invite_code FROM users WHERE id=?', [userId]);
  if (row?.invite_code) return row.invite_code;
  for (let i = 0; i < 5; i++) {
    try {
      await exec('UPDATE users SET invite_code=? WHERE id=? AND invite_code IS NULL', [newInviteCode(), userId]);
    } catch (err) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') continue;
      throw err;
    }
    const [again] = await query<RowDataPacket & { invite_code: string | null }>('SELECT invite_code FROM users WHERE id=?', [userId]);
    if (again?.invite_code) return again.invite_code;
  }
  throw new Error('could not create an invite code');
}

export async function findInviter(code: string): Promise<number | null> {
  const [u] = await query<RowDataPacket & { id: number }>('SELECT id FROM users WHERE invite_code=? AND blocked=0', [code]);
  return u?.id ?? null;
}

/**
 * Pays the invite rewards the first time a referred member gets an order approved. Safe to call for any member, any number of times:
 * the claim (referral_paid 0 to 1 or 2) happens first, so it can pay only once. 2 means "checked, not eligible" (limit reached, same network...).
 */
export async function rewardReferral(userId: number): Promise<boolean> {
  const claimed = await exec('UPDATE users SET referral_paid=1 WHERE id=? AND referred_by IS NOT NULL AND referral_paid=0', [userId]);
  if (!claimed.affectedRows) return false;
  const s = await getSettings();
  return tx(async (t) => {
    const [invitee] = await t.query<RowDataPacket & { referred_by: number; signup_ip: string | null; blocked: number }>('SELECT referred_by, signup_ip, blocked FROM users WHERE id=? FOR UPDATE', [userId]);
    const [inviter] = await t.query<RowDataPacket & { id: number; signup_ip: string | null; blocked: number }>('SELECT id, signup_ip, blocked FROM users WHERE id=? FOR UPDATE', [invitee?.referred_by ?? 0]);
    const [paid] = await t.query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM users WHERE referred_by=? AND referral_paid=1 AND id<>?', [invitee?.referred_by ?? 0, userId]);
    const problem = !invitee || invitee.blocked ? 'invitee is suspended' : referralProblem({ inviterId: inviter?.id ?? null, inviterBlocked: Boolean(inviter?.blocked), inviterIp: inviter?.signup_ip ?? null, inviteeIp: invitee.signup_ip, paidSoFar: Number(paid?.n) || 0, cap: s.inviteCap, reward: s.inviteReward, welcome: s.inviteWelcome });
    if (problem || !inviter) {
      await t.exec('UPDATE users SET referral_paid=2 WHERE id=?', [userId]);
      return false;
    }
    if (s.inviteReward > 0) {
      await t.exec('UPDATE users SET points = points + ? WHERE id=?', [s.inviteReward, inviter.id]);
      await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [inviter.id, s.inviteReward, 'Invite reward: a friend you invited joined']);
    }
    if (s.inviteWelcome > 0) {
      await t.exec('UPDATE users SET points = points + ? WHERE id=?', [s.inviteWelcome, userId]);
      await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [userId, s.inviteWelcome, 'Welcome bonus from an invite']);
    }
    return true;
  });
}

/** Called after orders are approved: pays any invite rewards that became due. Never throws into the admin's action. */
export async function rewardReferralsForOrders(orderIds: number[]): Promise<void> {
  if (!orderIds.length) return;
  try {
    const rows = await query<RowDataPacket & { user_id: number }>(`SELECT DISTINCT user_id FROM orders WHERE id IN (${orderIds.map(() => '?').join(',')})`, orderIds);
    for (const r of rows) await rewardReferral(r.user_id);
  } catch (err) {
    console.error('invite rewards failed:', err);
  }
}

export async function inviteStats(userId: number): Promise<{ joined: number; rewarded: number; points: number }> {
  const [j] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM users WHERE referred_by=?', [userId]);
  const [r] = await query<RowDataPacket & { n: number; pts: number | null }>("SELECT COUNT(*) AS n, COALESCE(SUM(delta),0) AS pts FROM point_log WHERE user_id=? AND reason='Invite reward: a friend you invited joined'", [userId]);
  return { joined: Number(j?.n) || 0, rewarded: Number(r?.n) || 0, points: Number(r?.pts) || 0 };
}
