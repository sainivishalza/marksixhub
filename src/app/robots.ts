import type { MetadataRoute } from 'next';
import { absolute } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/login', '/register', '/api'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
