import { NumberBall } from '@/components/ball';
import { JsonLd } from '@/components/json-ld';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { getDraws } from '@/lib/data';
import { getHistoryAccess } from '@/lib/history';
import { breadcrumbLd } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-db';
import { numberStats } from '@/lib/stats';

export const generateMetadata = () => seoMetadata('/statistics');
export const dynamic = 'force-dynamic';

export default async function StatisticsPage() {
  const access = await getHistoryAccess(await getUser());
  const { draws } = await getDraws(2000, 0, access.from);
  const stats = numberStats(draws);
  const by = (f: (a: (typeof stats)[number], b: (typeof stats)[number]) => number) => [...stats].sort(f).slice(0, 10);
  const hot = by((a, b) => b.count - a.count || a.n - b.n);
  const cold = by((a, b) => a.count - b.count || a.n - b.n);
  const overdue = by((a, b) => b.gap - a.gap || a.n - b.n);
  const max = Math.max(1, ...stats.map((s) => s.count));

  const list = (title: string, rows: typeof stats, note: (s: (typeof stats)[number]) => string) => (
    <section className="surface p-5">
      <h2 className="mb-3 text-xl">{title}</h2>
      <ol className="space-y-2">
        {rows.map((s) => (
          <li key={s.n} className="flex items-center gap-3 text-sm">
            <NumberBall n={s.n} size="sm" />
            <span className="text-mute">{note(s)}</span>
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Mark Six number statistics</h1>
      <p className="mb-8 mt-3 max-w-[65ch] text-mute">
        How often each number from 1 to 49 has been drawn in the {draws.length} Mark Six results you can see. The extra number is not counted.{access.locked ? <> <Link href="/results#unlock" className="text-gold-bright underline-offset-4 hover:underline">Unlock older results</Link> for statistics over a longer history.</> : null}
        {' '}Every draw is independent: past results do not make any number more or less likely next time.
      </p>

      {draws.length === 0 ? (
        <p className="text-mute">No results yet.</p>
      ) : (
        <>
          <section className="mb-8" aria-labelledby="freq">
            <h2 id="freq" className="mb-3 text-xl">Times drawn</h2>
            <ol className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
              {stats.map((s) => (
                <li key={s.n} className="flex flex-col items-center rounded-lg border border-line/50 p-1">
                  <NumberBall n={s.n} size="sm" />
                  <span className="mt-1 font-mono text-xs tabular-nums" style={{ opacity: 0.45 + (0.55 * s.count) / max }}>{s.count}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            {list('Drawn most', hot, (s) => `${s.count} times`)}
            {list('Drawn least', cold, (s) => `${s.count} times`)}
            {list('Longest since last drawn', overdue, (s) => (s.gap >= draws.length ? 'never in these results' : `${s.gap} draw${s.gap === 1 ? '' : 's'} ago`))}
          </div>
        </>
      )}
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Statistics', path: '/statistics' }])} />
    </div>
  );
}
