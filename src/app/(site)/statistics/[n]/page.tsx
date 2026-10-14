import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NumberBall } from '@/components/ball';
import { JsonLd } from '@/components/json-ld';
import { getUser } from '@/lib/auth';
import { getDraws } from '@/lib/data';
import { dateLabel } from '@/lib/format';
import { getHistoryAccess } from '@/lib/history';
import { ballTone } from '@/lib/mark6';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { numberDetail } from '@/lib/stats';
import { drawSlug } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ n: string }>;
const parse = (s: string) => (/^[1-9]\d?$/.test(s) && Number(s) <= 49 ? Number(s) : null);
const times = (c: number) => (c === 1 ? 'once' : `${c} times`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const n = parse((await params).n);
  if (!n) return { title: 'Number not found', robots: { index: false } };
  // Search engines only see the free window, like any other guest.
  const { draws } = await getDraws(2000, 0, (await getHistoryAccess(null)).from);
  const x = numberDetail(draws, n);
  return pageMetadata({
    title: `Mark Six Number ${n}: How Often Drawn`,
    description: `Number ${n} was drawn ${times(x.count)} in the latest ${x.total} Mark Six results${x.lastIndex >= 0 ? `, last in draw ${draws[x.lastIndex].drawNo}` : ''}. See its gap, longest wait and the numbers it comes with most.`,
    path: `/statistics/${n}`,
  });
}

export default async function NumberPage({ params }: { params: Params }) {
  const n = parse((await params).n);
  if (!n) notFound();
  const access = await getHistoryAccess(await getUser());
  const { draws } = await getDraws(2000, 0, access.from);
  const x = numberDetail(draws, n);
  const last = x.lastIndex >= 0 ? draws[x.lastIndex] : null;
  const share = x.total ? Math.round((x.count / x.total) * 1000) / 10 : 0;
  const expected = Math.round(((x.total * 6) / 49) * 10) / 10;
  const recent = x.hits.slice(0, 5).map((i) => draws[i]);
  const row = 'flex justify-between gap-4 border-b border-line/40 py-2 text-sm';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <NumberBall n={n} size="lg" />
        <h1 className="text-3xl sm:text-4xl">Mark Six number {n}</h1>
      </div>
      <p className="mt-4 max-w-[65ch] text-mute">
        Number {n} is a {ballTone(n)} ball. It was drawn {times(x.count)} in the latest {x.total} Mark Six results ({share}% of draws; about {expected} would be expected if every number were equally likely).
        {last ? <> It last came up in <Link href={`/results/${drawSlug(last.drawNo)}`} className="text-gold-bright underline underline-offset-4">draw {last.drawNo}</Link>, {dateLabel(last.drawDate, { weekday: undefined })}.</> : ' It has not come up in these results.'}
      </p>

      <section className="surface mt-8 p-5" aria-labelledby="facts">
        <h2 id="facts" className="mb-2 text-xl">The numbers</h2>
        <dl>
          <div className={row}><dt className="text-mute">Times drawn</dt><dd className="font-mono">{x.count}</dd></div>
          <div className={row}><dt className="text-mute">Times as the extra number</dt><dd className="font-mono">{x.extraCount}</dd></div>
          <div className={row}><dt className="text-mute">Draws since it last came up</dt><dd className="font-mono">{x.gap >= x.total ? 'never in these results' : x.gap}</dd></div>
          <div className={row}><dt className="text-mute">Longest wait between appearances</dt><dd className="font-mono">{x.longestGap} draws</dd></div>
        </dl>
      </section>

      {x.partners.length ? (
        <section className="surface mt-6 p-5" aria-labelledby="partners">
          <h2 id="partners" className="mb-3 text-xl">Drawn together most often</h2>
          <ol className="flex flex-wrap gap-4">
            {x.partners.map((p) => (
              <li key={p.n} className="flex items-center gap-2 text-sm text-mute">
                <Link href={`/statistics/${p.n}`} aria-label={`Number ${p.n}`}><NumberBall n={p.n} size="sm" /></Link>
                {times(p.count)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {recent.length ? (
        <section className="surface mt-6 p-5" aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-xl">Latest appearances</h2>
          <ul className="space-y-2 text-sm">
            {recent.map((d) => (
              <li key={d.id}>
                <Link href={`/results/${drawSlug(d.drawNo)}`} className="text-gold-bright underline underline-offset-4">Draw {d.drawNo}</Link>
                <span className="text-mute">, {dateLabel(d.drawDate, { weekday: undefined })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-sm text-mute">
        Every draw is independent, so these figures describe the past and do not make {n} more or less likely next time.{' '}
        <Link href="/statistics" className="text-gold-bright underline underline-offset-4">All number statistics</Link>
      </p>
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Statistics', path: '/statistics' }, { name: `Number ${n}`, path: `/statistics/${n}` }])} />
    </div>
  );
}
