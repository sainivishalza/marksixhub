import type { MetadataRoute } from 'next';
import { IS_STAGING, absolute } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/login', '/register', '/api'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
