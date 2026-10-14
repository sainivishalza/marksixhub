/**
 * The visitor's address from proxy headers. `X-Forwarded-For` is a list: each proxy appends the address it saw, so everything the visitor
 * typed themselves sits at the LEFT and can be forged. With `hops` set (how many proxies the host puts in front of the app), the entry that
 * the nearest trusted proxy added, counted from the right, is used instead. With no hops set, the old behaviour (first entry) is kept,
 * because guessing the wrong number would make every visitor look like the proxy and lock people out together.
 */
export function pickClientIp(forwardedFor: string | null, realIp: string | null, hops = 0): string {
  const parts = (forwardedFor ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length) {
    const i = hops > 0 ? Math.max(0, parts.length - hops) : 0;
    return parts[i].slice(0, 64);
  }
  return (realIp ?? '').trim().slice(0, 64) || 'unknown';
}
