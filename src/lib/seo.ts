import type { Metadata } from 'next';

export const SITE_NAME = 'Mark Six Hub';
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@marksixhub.com';
/** Optional. Shown (and tap-to-call) in the footer only when set. */
export const CONTACT_PHONE = process.env.CONTACT_PHONE || '';

/** Who runs the site. Shown on the About page and in the footer only when set; never invented. */
export const OPERATOR_NAME = process.env.OPERATOR_NAME || '';
export const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS || '';

export const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Any site served from staging.* is a test copy and must stay out of search results.
export const IS_STAGING = new URL(BASE_URL).hostname.startsWith('staging.');

export const absolute = (path: string) => `${BASE_URL}${path}`;

type PageMeta = { title: string; description: string; path: string; noindex?: boolean; ownImage?: boolean };

// Setting openGraph on a page replaces the site-wide preview image, so every page names it again (WhatsApp, Facebook and X read it).
// A page with its own opengraph-image file passes `ownImage` and keeps that one.
const SHARE_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Mark Six Hub: free Mark Six number picker and results' };

export function pageMetadata({ title, description, path, noindex, ownImage }: PageMeta): Metadata {
  const images = ownImage ? {} : { images: [SHARE_IMAGE] }; // no `images` key at all, or the page's own opengraph-image file is dropped
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: 'website', locale: 'en_HK', ...images },
    twitter: { card: 'summary_large_image', title, description, ...images },
  };
}

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.path) })),
});
