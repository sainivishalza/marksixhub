import 'server-only';
import type { Metadata } from 'next';
import { pageMetadata } from './seo';
import { getSeoOverrides } from './settings';

type Seo = { title: string; description: string; path: string };

/** Built-in titles and descriptions. Admin > SEO can override any of them. */
export const SEO_DEFAULTS: Record<string, Seo & { label: string }> = {
  '/': {
    label: 'Home',
    path: '/',
    title: 'Mark Six Number Picker & Results',
    description: 'Free Hong Kong Mark Six number picker with the latest results, jackpot estimates and prize breakdown. Pick 6 numbers from 1 to 49 in seconds.',
  },
  '/picker': {
    label: 'Number picker',
    path: '/picker',
    title: 'Mark Six Number Picker: Free Quick Pick for 6 from 49',
    description: 'Free Mark Six number picker. Choose your own six numbers or use Quick Pick, then check them against the latest Hong Kong result.',
  },
  '/results': {
    label: 'Results',
    path: '/results',
    title: 'Mark Six Results: Winning Numbers and Prizes',
    description: 'Every Hong Kong Mark Six draw with the six winning numbers, the extra number and the prize for each division.',
  },
  '/guide': {
    label: 'Guide',
    path: '/guide',
    title: 'How to Play Mark Six: Rules and Prize Divisions',
    description: 'Mark Six explained in plain words: pick 6 numbers from 1 to 49, how the extra number works and what each of the 7 prize divisions needs.',
  },
  '/faq': {
    label: 'FAQ',
    path: '/faq',
    title: 'Mark Six FAQ: Your Questions Answered',
    description: 'Answers about Mark Six: how it works, the prize divisions, whether this site is official and how the number picker and currency conversion work.',
  },
};

/** Page metadata where an admin-entered title or description wins over the built-in text. */
export async function seoMetadata(path: keyof typeof SEO_DEFAULTS): Promise<Metadata> {
  const d = SEO_DEFAULTS[path];
  const o = (await getSeoOverrides())[path];
  return pageMetadata({ path, title: o?.title || d.title, description: o?.description || d.description });
}
