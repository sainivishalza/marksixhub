import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { dbConfigured, query } from './db';
import { mailConfigured, sendMail } from './mail';
import { openDraw } from './points';
import { BASE_URL } from './seo';

export type Check = { id: string; label: string; status: 'ok' | 'warn' | 'bad'; detail: string };

const n = async (sql: string, args: unknown[] = []) => Number((await query<RowDataPacket & { n: number }>(sql, args))[0]?.n ?? 0);
const plural = (c: number, one: string, many = `${one}s`) => `${c} ${c === 1 ? one : many}`;

/** Everything that could quietly go wrong, each with a plain sentence. Runs in well under a second. */
export async function runHealth(): Promise<Check[]> {
  const out: Check[] = [];
  const add = (id: string, label: string, status: Check['status'], detail: string) => out.push({ id, label, status, detail });

  if (!dbConfigured) return [{ id: 'db', label: 'Database', status: 'bad', detail: 'No database is configured.' }];
  try {
    await query('SELECT 1');
    add('db', 'Database', 'ok', 'Connected.');
  } catch (err) {
    console.error('health: database check failed:', err);
    return [{ id: 'db', label: 'Database', status: 'bad', detail: 'The database did not answer.' }];
  }

  add('mail', 'Email sending', mailConfigured ? 'ok' : 'warn', mailConfigured ? 'Mail settings are set.' : 'SMTP settings are missing, so sign-up, reset and order emails are not sent.');

  const open = await openDraw();
  add('draw', 'Draw open for orders', open ? 'ok' : 'warn', open ? `Draw ${open.drawNo} closes ${open.closesAt.toLocaleString('en-GB', { timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'short' })} (HK time).` : 'No draw is open, so nobody can place an order. Announce the next draw.');

  const overdue = await query<RowDataPacket & { draw_no: string }>("SELECT draw_no FROM draws WHERE status='upcoming' AND draw_date < (UTC_DATE() - INTERVAL 1 DAY) ORDER BY draw_date LIMIT 5");
  add('overdue', 'Results entered', overdue.length ? 'bad' : 'ok', overdue.length ? `The result for ${overdue.map((d) => d.draw_no).join(', ')} is not entered yet, so orders for it are not settled.` : 'No finished draw is waiting for its result.');

  const stuck = await n("SELECT COUNT(*) AS n FROM orders WHERE status='pending' AND draw_no <> ? ", [open?.drawNo ?? '']);
  add('stuck', 'Orders for closed draws', stuck ? 'bad' : 'ok', stuck ? `${plural(stuck, 'order')} for a draw that is no longer open still ${stuck === 1 ? 'needs' : 'need'} approving or rejecting. A result cannot be published until they are handled.` : 'None waiting.');

  const old = await n("SELECT COUNT(*) AS n FROM orders WHERE status='pending' AND created_at < UTC_TIMESTAMP() - INTERVAL 24 HOUR");
  add('old', 'Orders waiting over 24 hours', old ? 'warn' : 'ok', old ? `${plural(old, 'order')} ${old === 1 ? 'has' : 'have'} waited more than a day for approval.` : 'None.');

  const drift = await n('SELECT COUNT(*) AS n FROM (SELECT u.points AS points, COALESCE(SUM(l.delta), 0) AS ledger FROM users u LEFT JOIN point_log l ON l.user_id = u.id GROUP BY u.id) t WHERE points <> ledger');
  add('points', 'Points balances', drift ? 'bad' : 'ok', drift ? `${plural(drift, 'balance')} ${drift === 1 ? 'does' : 'do'} not match the points history. See Points check.` : 'Every balance matches its history.');

  const noTwo = await n("SELECT COUNT(*) AS n FROM users WHERE role <> 'user' AND blocked = 0 AND totp_on = 0");
  add('twostep', 'Staff two-step login', noTwo ? 'warn' : 'ok', noTwo ? `${plural(noTwo, 'staff account')} ${noTwo === 1 ? 'has' : 'have'} no two-step login. Turn it on in Account > Settings.` : 'On for every staff account.');

  add('envpass', 'Admin password setting', process.env.ADMIN_PASSWORD ? 'warn' : 'ok', process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD is still set in the hosting environment. Remove it now that the admin account exists.' : 'Not set in the environment.');
  add('https', 'Secure address', BASE_URL.startsWith('https://') ? 'ok' : 'warn', BASE_URL.startsWith('https://') ? BASE_URL : `BASE_URL is ${BASE_URL}, not https.`);
  return out;
}

export const problems = (checks: Check[]) => checks.filter((c) => c.status !== 'ok');

/** Once a day, at 8am Hong Kong time or later, email the owner if anything needs a look. Silent when all is well. */
export async function sendDailyDigest(now = new Date()): Promise<boolean> {
  const to = (process.env.HEALTH_ALERT_EMAIL || process.env.ORDER_ALERT_EMAIL || process.env.ADMIN_EMAIL || '').trim();
  if (!to || !mailConfigured || !dbConfigured) return false;
  const hk = new Date(now.getTime() + 8 * 3_600_000);
  if (hk.getUTCHours() < 8) return false;
  const day = hk.toISOString().slice(0, 10);
  // Claim today in the database first, so two server processes never send the same email twice.
  const { exec } = await import('./db');
  await exec("INSERT IGNORE INTO settings (k, v) VALUES ('health_digest', '')");
  const claimed = await exec("UPDATE settings SET v=? WHERE k='health_digest' AND v<>?", [day, day]);
  if (!claimed.affectedRows) return false;
  const bad = problems(await runHealth());
  if (!bad.length) return false;
  const lines = bad.map((c) => `${c.status === 'bad' ? 'PROBLEM' : 'Note'}: ${c.label}\n  ${c.detail}`).join('\n\n');
  return sendMail(to, `Mark Six Hub: ${plural(bad.length, 'thing')} to look at`, `Good morning. This is the daily check of ${BASE_URL}.\n\n${lines}\n\nFull list: ${BASE_URL}/admin/health`);
}
