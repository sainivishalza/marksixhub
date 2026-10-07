import type { MetadataRoute } from 'next';
import { getDraws } from '@/lib/data';
import { absolute } from '@/lib/seo';
import { drawSlug } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['/', '/picker', '/results', '/guide', '/faq'].map((p) => ({ url: absolute(p) }));
  const { draws } = await getDraws(1000);
  return [...pages, ...draws.map((d) => ({ url: absolute(`/results/${drawSlug(d.drawNo)}`), lastModified: d.drawDate }))];
}
