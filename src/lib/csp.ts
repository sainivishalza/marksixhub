// Content Security Policy. Next.js needs inline scripts to start the page, so 'unsafe-inline' stays for scripts and styles; what the policy
// still blocks is the dangerous part: loading scripts from any other site, framing the site, posting forms elsewhere, plugins, and <base> tricks.
// Only the analytics hosts the site may use are allowed (and only load if the owner turns them on).
const ANALYTICS_SCRIPT = 'https://www.googletagmanager.com https://plausible.io';
const ANALYTICS_CONNECT = 'https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://plausible.io';

const base = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${ANALYTICS_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  `connect-src 'self' ${ANALYTICS_CONNECT}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
];

/** The full header. `frame-ancestors` is only valid in a header, not in a <meta> tag. */
export const cspHeader = (https: boolean) => [...base, "frame-ancestors 'none'", ...(https ? ['upgrade-insecure-requests'] : [])].join('; ');

/** The same policy for a <meta http-equiv> tag, as a second line of defence if the host rewrites the header. */
export const cspMeta = (https: boolean) => [...base, ...(https ? ['upgrade-insecure-requests'] : [])].join('; ');
