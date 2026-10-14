import 'server-only';
import type { PastedResult } from './mark6';
import { parseJsonResult, parseTextResult } from './result-source-rules';

const MAX_BYTES = 1_500_000;

/** The one address results are read from. Set by the owner in the environment, never typed in by a visitor or an admin, so it cannot be turned against other servers. */
export function resultSourceUrl(): URL | null {
  const raw = (process.env.RESULT_SOURCE_URL || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return u.protocol === 'https:' || (u.protocol === 'http:' && local) ? u : null;
  } catch {
    return null;
  }
}

export type SourceResult = { ok: true; result: PastedResult; from: string } | { ok: false; error: string };

/** Reads the latest result from the configured source. Nothing is saved: the admin checks the filled form and saves it. */
export async function fetchResult(): Promise<SourceResult> {
  const url = resultSourceUrl();
  if (!url) return { ok: false, error: 'No result source is set up. Set RESULT_SOURCE_URL in the hosting settings, or paste the result below.' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'error', headers: { accept: 'application/json, text/html;q=0.9, text/plain;q=0.8', 'user-agent': 'MarkSixHub-result-reader/1.0' }, cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `The result source answered ${res.status}.` };
    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_BYTES) return { ok: false, error: 'The result source sent more data than expected.' };
    const body = (await res.text()).slice(0, MAX_BYTES);
    const type = res.headers.get('content-type') || '';
    let parsed;
    if (type.includes('json')) {
      try {
        parsed = parseJsonResult(JSON.parse(body));
      } catch {
        return { ok: false, error: 'The result source sent JSON that could not be read.' };
      }
    } else {
      parsed = parseTextResult(body);
    }
    return parsed.ok ? { ok: true, result: parsed.result, from: url.hostname } : parsed;
  } catch (err) {
    console.error('result source failed:', err);
    return { ok: false, error: ctl.signal.aborted ? 'The result source took too long to answer.' : 'The result source could not be reached.' };
  } finally {
    clearTimeout(timer);
  }
}
