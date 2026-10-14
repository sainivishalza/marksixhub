import type { NextConfig } from 'next';
import { cspHeader } from './src/lib/csp.js';

const host = (() => {
  try {
    return new URL(process.env.BASE_URL || 'http://localhost:3000').host;
  } catch {
    return 'localhost:3000';
  }
})();

const protocol = (process.env.BASE_URL || '').startsWith('http://') ? 'http:' : 'https:';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['mysql2'],
  experimental: {
    // Server Actions compare the request Origin with the Host. Behind a hosting proxy those can differ, so name the real domain.
    serverActions: { allowedOrigins: [host, `www.${host.replace(/^www\./, '')}`], bodySizeLimit: '1mb' },
  },
  async redirects() {
    const apex = host.replace(/^www\./, '');
    // Send www to the one canonical address so search engines see a single site.
    return [{ source: '/:path*', has: [{ type: 'host', value: `www.${apex}` }], destination: `${protocol}//${apex}/:path*`, permanent: true }];
  },
  async headers() {
    return [
      // Icons rarely change; let browsers and CDNs keep them for a week (default is revalidate on every view).
      { source: '/:file(favicon.ico|icon.svg|apple-icon.png)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: cspHeader(protocol === 'https:') },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ],
      },
      // Private areas are never for search engines or caches, whatever the page itself says.
      { source: '/:area(admin|account|pay|login|register|forgot|reset|verify|unsubscribe)/:rest*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:area(admin|account|pay|login|register|forgot|reset|verify|unsubscribe)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default config;
