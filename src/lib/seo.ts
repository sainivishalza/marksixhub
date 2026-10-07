import type { Metadata } from 'next';

export const SITE_NAME = 'Mark Six Hub';
export const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Any site served from staging.* is a test copy and must stay out of search results.
export const IS_STAGING = new URL(BASE_URL).hostname.startsWith('staging.');

export const absolute = (path: string) => `${BASE_URL}${path}`;

type PageMeta = { title: string; description: string; path: string; noindex?: boolean };

export function pageMetadata({ title, description, path, noindex }: PageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: 'website', locale: 'en_HK' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.path) })),
});
