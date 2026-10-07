import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { ResultsTable } from '@/components/results-table';
import { UnlockPanel } from '@/components/unlock-panel';
import { getUser } from '@/lib/auth';
import { getCurrentCurrency, getDraws, getTopPrizes } from '@/lib/data';
import { getHistoryAccess } from '@/lib/history';
import { breadcrumbLd } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-db';

const PER_PAGE = 20;

export const generateMetadata = () => seoMetadata('/results');

type SearchParams = Promise<{ page?: string; sort?: string; unlock?: string }>;

export default async function ResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: rawPage, sort, unlock } = await searchParams;
  const access = await getHistoryAccess(await getUser());
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const { draws, total } = await getDraws(PER_PAGE, (page - 1) * PER_PAGE, access.from);
  const [{ current }, tops] = await Promise.all([getCurrentCurrency(), getTopPrizes(draws.map((d) => d.id))]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const oldestFirst = sort === 'oldest';
  const shown = oldestFirst ? [...draws].reverse() : draws;
  const link = (p: number, s = sort) => `/results?${new URLSearchParams({ ...(p > 1 ? { page: String(p) } : {}), ...(s ? { sort: s } : {}) })}`.replace(/\?$/, '');

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Mark Six results</h1>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-mute">
          {total.toLocaleString('en')} draw{total === 1 ? '' : 's'} to see{access.locked ? `, ${access.locked.toLocaleString('en')} older ones locked` : ''}. Select a draw for its full prize table.
        </p>
        <Link href={link(page, oldestFirst ? undefined : 'oldest')} className="text-sm text-gold-bright underline-offset-4 hover:underline">
          {oldestFirst ? 'Show newest first' : 'Show oldest first on this page'}
        </Link>
      </div>
      <ResultsTable draws={shown} tops={tops} currency={current} />
      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} rel="prev" className="text-gold-bright hover:underline">Newer</Link> : <span />}
          <span className="text-mute">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} rel="next" className="text-gold-bright hover:underline">Older</Link> : <span />}
        </nav>
      ) : null}
      <UnlockPanel access={access} user={await getUser()} path={link(page)} flash={unlock} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Results', path: '/results' }])} />
    </div>
  );
}
