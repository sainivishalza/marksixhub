import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { query, tx } from './db';
import { checkTransfer, displayName, newPayCode } from './transfer-rules';

type U = RowDataPacket & { id: number; points: number; email: string; nickname: string | null; pay_code: string | null; blocked: number; email_verified: number; age: number };

export type TransferLimits = { enabled: boolean; max: number; daily: number; minAgeDays: number };
export type TransferResult =
  | { ok: true; amount: number; toName: string; toEmail: string; fromName: string; balance: number; duplicate: boolean }
  | { ok: false; error: string };

/** The member's pay code, created the first time it is needed. Retries on the (very unlikely) clash with another code. */
export async function ensurePayCode(userId: number): Promise<string> {
  const [row] = await query<RowDataPacket & { pay_code: string | null }>('SELECT pay_code FROM users WHERE id=?', [userId]);
  if (row?.pay_code) return row.pay_code;
  for (let i = 0; i < 5; i++) {
    const code = newPayCode();
    try {
      await tx(async (t) => {
        await t.exec('UPDATE users SET pay_code=? WHERE id=? AND pay_code IS NULL', [code, userId]);
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') continue;
      throw err;
    }
    const [again] = await query<RowDataPacket & { pay_code: string | null }>('SELECT pay_code FROM users WHERE id=?', [userId]);
    if (again?.pay_code) return again.pay_code;
  }
  throw new Error('could not create a pay code');
}

/** Replaces the code (for example after sharing the old QR by mistake). The old QR stops working at once. */
export async function replacePayCode(userId: number): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = newPayCode();
    try {
      await tx(async (t) => {
        await t.exec('UPDATE users SET pay_code=? WHERE id=?', [code, userId]);
      });
      return code;
    } catch (err) {
      if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  throw new Error('could not create a pay code');
}

/** Who a pay code belongs to, as the sender may see them. Null when the code is unknown or cannot receive. */
export async function findRecipient(code: string): Promise<{ id: number; name: string } | null> {
  const [u] = await query<U>('SELECT id, nickname, pay_code, blocked, email_verified FROM users WHERE pay_code=?', [code]);
  return u && !u.blocked && u.email_verified ? { id: u.id, name: displayName(u.nickname, code) } : null;
}

/**
 * Moves points from one member to another in ONE transaction: both rows are locked (lowest id first, so two members paying each other
 * at the same moment cannot deadlock), every rule is checked on the locked balances, then both balances and both history lines change together.
 * `idem` is a one-time id created when the page was shown: pressing the button twice, or a retried request, sends only once.
 */
export async function transferPoints(a: { fromId: number; toCode: string; amount: number; idem: string; limits: TransferLimits }): Promise<TransferResult> {
  return tx<TransferResult>(async (t) => {
    const [target] = await t.query<U>('SELECT id FROM users WHERE pay_code=?', [a.toCode]);
    const ids = [a.fromId, target?.id ?? 0].filter((x) => x > 0);
    const locked = await t.query<U>(
      'SELECT id, points, email, nickname, pay_code, blocked, email_verified, TIMESTAMPDIFF(DAY, created_at, NOW()) AS age FROM users WHERE id IN (?) ORDER BY id FOR UPDATE',
      [ids],
    );
    const from = locked.find((u) => u.id === a.fromId);
    // The code may have been replaced between the first read and the lock: only the current code counts.
    const found = target ? locked.find((u) => u.id === target.id) : undefined;
    const to = found && found.pay_code === a.toCode ? found : undefined;
    if (!from || from.blocked) return { ok: false, error: 'Your account cannot send points.' };

    // Same page submitted twice (or a retry): report the first result, never a second transfer.
    const [dup] = await t.query<RowDataPacket & { to_user: number; amount: number; from_user: number }>('SELECT from_user, to_user, amount FROM transfers WHERE idem=?', [a.idem]);
    if (dup) {
      if (dup.from_user !== a.fromId) return { ok: false, error: 'This page has expired. Open the pay link again.' };
      return { ok: true, amount: dup.amount, toName: displayName(to?.nickname, a.toCode), toEmail: '', fromName: '', balance: Number(from.points), duplicate: true };
    }

    const [sent] = await t.query<RowDataPacket & { n: number | null }>('SELECT SUM(amount) AS n FROM transfers WHERE from_user=? AND created_at > NOW() - INTERVAL 1 DAY', [a.fromId]);
    const error = checkTransfer({
      enabled: a.limits.enabled,
      senderId: from.id,
      recipientId: to?.id ?? null,
      amount: a.amount,
      max: a.limits.max,
      daily: a.limits.daily,
      sentToday: Number(sent?.n) || 0,
      balance: Number(from.points),
      senderVerified: Boolean(from.email_verified),
      senderAgeDays: Number(from.age),
      minAgeDays: a.limits.minAgeDays,
      recipientVerified: Boolean(to?.email_verified),
      recipientBlocked: Boolean(to?.blocked),
    });
    if (error || !to) return { ok: false, error: error ?? 'That pay code cannot receive points.' };

    const fromName = displayName(from.nickname, from.pay_code ?? 'XXXXXXXXXX');
    const toName = displayName(to.nickname, a.toCode);
    const debit = await t.exec('UPDATE users SET points = points - ? WHERE id=? AND points >= ?', [a.amount, from.id, a.amount]);
    if (!debit.affectedRows) return { ok: false, error: 'You do not have enough points.' };
    await t.exec('UPDATE users SET points = points + ? WHERE id=?', [a.amount, to.id]);
    await t.exec('INSERT INTO transfers (from_user, to_user, amount, idem) VALUES (?,?,?,?)', [from.id, to.id, a.amount, a.idem]);
    await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [from.id, -a.amount, `Transfer to ${toName}`.slice(0, 80)]);
    await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [to.id, a.amount, `Transfer from ${fromName}`.slice(0, 80)]);
    return { ok: true, amount: a.amount, toName, toEmail: to.email, fromName, balance: Number(from.points) - a.amount, duplicate: false };
  });
}
