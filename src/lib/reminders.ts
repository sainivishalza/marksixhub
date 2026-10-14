import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { dbConfigured, exec, query } from './db';
import { mailConfigured, sendMail } from './mail';
import { openDraw } from './points';
import { BASE_URL } from './seo';

const sign = (id: number) => createHmac('sha256', process.env.SESSION_SECRET ?? 'dev').update(`unsubscribe|${id}`).digest('base64url').slice(0, 22);

/** Link that switches reminders off without logging in. Signed, so nobody can switch off someone else's. */
export const unsubscribeToken = (id: number) => `${id}.${sign(id)}`;

/** Returns the user id when the token is genuine. */
export function readUnsubscribeToken(token: string): number | null {
  const [idText, mac] = token.split('.');
  const id = Number(idText);
  if (!Number.isInteger(id) || id <= 0 || !mac) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

const BATCH = 100;

/** Emails opted-in, confirmed users once per draw when it closes within 24 hours. Safe to run often. */
export async function sendReminders(now = Date.now()): Promise<number> {
  if (!mailConfigured || !dbConfigured) return 0;
  const open = await openDraw();
  if (!open) return 0;
  const left = open.closesAt.getTime() - now;
  if (left <= 0 || left > 24 * 3_600_000) return 0;
  const users = await query<RowDataPacket & { id: number; email: string }>(
    'SELECT id, email FROM users WHERE remind=1 AND email_verified=1 AND blocked=0 AND (remind_sent IS NULL OR remind_sent <> ?) LIMIT ?',
    [open.drawNo, BATCH],
  );
  const hours = Math.max(1, Math.round(left / 3_600_000));
  const when = open.closesAt.toLocaleString('en-GB', { timeZone: 'Asia/Hong_Kong', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  let sent = 0;
  for (const u of users) {
    // Claim the draw for this user first, so a second process or a restart never sends it twice.
    const claimed = await exec('UPDATE users SET remind_sent=? WHERE id=? AND (remind_sent IS NULL OR remind_sent <> ?)', [open.drawNo, u.id, open.drawNo]);
    if (!claimed.affectedRows) continue;
    const stop = `${BASE_URL}/unsubscribe?t=${unsubscribeToken(u.id)}`;
    const ok = await sendMail(
      u.email,
      `Draw ${open.drawNo} closes in about ${hours} hour${hours === 1 ? '' : 's'}`,
      `Draw ${open.drawNo} closes for orders ${when} (Hong Kong time), in about ${hours} hour${hours === 1 ? '' : 's'}.\n\nPick your numbers and submit them here:\n${BASE_URL}/picker\n\nYou asked for this reminder. To stop these emails, open:\n${stop}`,
      undefined,
      { 'List-Unsubscribe': `<${stop}>` },
    );
    if (ok) sent += 1;
    else await exec('UPDATE users SET remind_sent=NULL WHERE id=? AND remind_sent=?', [u.id, open.drawNo]); // try again next run
  }
  return sent;
}
