import type { MetadataRoute } from 'next';
import { getDraws } from '@/lib/data';
import { absolute } from '@/lib/seo';
import { drawSlug, type Draw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['/', '/picker', '/results', '/guide', '/faq', '/statistics', '/check'].map((p) => ({ url: absolute(p) }));
  let draws: Draw[] = [];
  try {
    draws = (await getDraws(1000)).draws;
  } catch (err) {
    // A database hiccup should not make the sitemap fail; list the fixed pages instead.
    console.error('sitemap: draws unavailable:', err);
  }
  return [...pages, ...draws.map((d) => ({ url: absolute(`/results/${drawSlug(d.drawNo)}`), lastModified: d.drawDate }))];
}
