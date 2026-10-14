import 'server-only';
import { mailConfigured, sendMail } from './mail';
import { BASE_URL } from './seo';

// One email at most every 10 minutes, and the same error at most once an hour, so an outage is one email and not a thousand.
const GLOBAL_GAP = 10 * 60_000;
const SAME_GAP = 60 * 60_000;
let lastAny = 0;
let suppressed = 0;
const seen = new Map<string, number>();

/** Emails the owner about an unexpected server error. Never throws, and never includes the query string, cookies or request body. */
export async function alertError(err: unknown, path: string, now = Date.now()): Promise<boolean> {
  try {
    const to = (process.env.HEALTH_ALERT_EMAIL || process.env.ORDER_ALERT_EMAIL || process.env.ADMIN_EMAIL || '').trim();
    if (!to || !mailConfigured) return false;
    const e = err as { message?: string; digest?: string };
    // Not-found and redirect signals are normal control flow, not faults.
    if (typeof e?.digest === 'string' && /^NEXT_(NOT_FOUND|REDIRECT|HTTP_ERROR_FALLBACK)/.test(e.digest)) return false;
    if (/NEXT_REDIRECT|NEXT_NOT_FOUND/.test(String(e?.message))) return false;
    const message = String(e?.message ?? err).split('\n')[0].slice(0, 200);
    const where = path.split('?')[0].slice(0, 120);
    const key = `${where}|${message}`;
    for (const [k, t] of seen) if (now - t > SAME_GAP) seen.delete(k);
    if (seen.has(key) || now - lastAny < GLOBAL_GAP) {
      suppressed += 1;
      if (!seen.has(key)) seen.set(key, now); // remember it, so it is not sent the moment the gap ends
      return false;
    }
    seen.set(key, now);
    lastAny = now;
    const extra = suppressed ? `\n\n${suppressed} more error${suppressed === 1 ? '' : 's'} happened since the last email.` : '';
    suppressed = 0;
    return await sendMail(to, 'Mark Six Hub: the site hit an error', `A visitor hit a server error.\n\nPage: ${where}\nError: ${message}${e?.digest ? `\nReference: ${e.digest}` : ''}${extra}\n\nCheck ${BASE_URL}/admin/health and the hosting logs for the Reference above.`);
  } catch (inner) {
    console.error('error alert failed:', inner);
    return false;
  }
}
