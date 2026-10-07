import type { NextConfig } from 'next';

const host = (() => {
  try {
    return new URL(process.env.BASE_URL || 'http://localhost:3000').host;
  } catch {
    return 'localhost:3000';
  }
})();

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['mysql2'],
  experimental: {
    // Server Actions compare the request Origin with the Host. Behind a hosting proxy those can differ, so name the real domain.
    serverActions: { allowedOrigins: [host, `www.${host.replace(/^www\./, '')}`], bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default config;
