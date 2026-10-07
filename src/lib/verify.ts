import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { exec, query, tx } from './db';
import { sendMail } from './mail';
import { BASE_URL } from './seo';
import type { RowDataPacket } from 'mysql2/promise';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Emails a 24-hour, single-use link. Older links for the same user stop working. */
export async function sendVerification(userId: number, email: string): Promise<boolean> {
  const token = randomBytes(32).toString('base64url');
  await exec('DELETE FROM email_tokens WHERE user_id=? OR expires_at < UTC_TIMESTAMP()', [userId]);
  await exec('INSERT INTO email_tokens (user_id, token_hash, expires_at) VALUES (?,?,UTC_TIMESTAMP() + INTERVAL 24 HOUR)', [userId, sha256(token)]);
  return sendMail(
    email,
    'Confirm your email address',
    `Welcome! Open this link within 24 hours to confirm your email address:\n${BASE_URL}/verify?token=${token}\n\nOnce confirmed you can place orders and your welcome points are added.\n\nIf you did not create this account, ignore this email.`,
  );
}

/** Marks the email as confirmed and pays the welcome points held back at sign-up. Safe to call twice. */
export async function markVerified(userId: number): Promise<void> {
  await tx(async (t) => {
    const res = await t.exec('UPDATE users SET email_verified=1 WHERE id=? AND email_verified=0', [userId]);
    if (!res.affectedRows) return;
    const [u] = await t.query<RowDataPacket & { pending_bonus: number }>('SELECT pending_bonus FROM users WHERE id=?', [userId]);
    const bonus = Number(u?.pending_bonus) || 0;
    if (bonus > 0) {
      await t.exec('UPDATE users SET points = points + ?, pending_bonus = 0 WHERE id=?', [bonus, userId]);
      await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [userId, bonus, 'Welcome points']);
    }
  });
}

/** Looks a link up without using it. */
export async function findVerification(token: string): Promise<{ id: number; user_id: number } | null> {
  const [row] = await query<RowDataPacket & { id: number; user_id: number }>(
    'SELECT id, user_id FROM email_tokens WHERE token_hash=? AND used=0 AND expires_at > UTC_TIMESTAMP()',
    [sha256(token)],
  );
  return row ?? null;
}

export const useVerification = (id: number) => exec('UPDATE email_tokens SET used=1 WHERE id=? AND used=0', [id]);
