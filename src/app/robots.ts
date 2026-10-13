import type { MetadataRoute } from 'next';
import { IS_STAGING, absolute } from '@/lib/seo';

// Read the site URL at request time, not at build time, so the Sitemap line and the staging block are always right.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/login', '/register', '/forgot', '/reset', '/verify', '/api', '/preview'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
