import Link from 'next/link';
import { NumberBall } from '@/components/ball';
import { JsonLd } from '@/components/json-ld';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { getDraws } from '@/lib/data';
import { getHistoryAccess } from '@/lib/history';
import { DIVISION_LABEL, evaluate, parseNumbers, sortAsc } from '@/lib/mark6';
import { breadcrumbLd } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-db';
import { drawSlug } from '@/lib/types';

export const generateMetadata = () => seoMetadata('/check');
export const dynamic = 'force-dynamic';

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const raw = ((await searchParams).n ?? '').slice(0, 100);
  const ticket = parseNumbers(raw);
  const valid = ticket.length === 6;
  const access = await getHistoryAccess(await getUser());
  const { draws } = valid ? await getDraws(5000, 0, access.from) : { draws: [] };
  const wins = valid
    ? draws.map((d) => ({ d, ev: evaluate(ticket, d.numbers, d.extra) })).filter((x) => x.ev.division !== null)
    : [];
  const byDivision = Array<number>(7).fill(0);
  for (const w of wins) byDivision[(w.ev.division as number) - 1] += 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Did your numbers ever win?</h1>
      <p className="mb-6 mt-3 max-w-[60ch] text-mute">Type six numbers from 1 to 49. We check them against the Mark Six results you can see. Unlock older results to check further back. For fun only: past results say nothing about the next draw.</p>
      <form className="flex flex-wrap gap-2">
        <input name="n" defaultValue={raw} placeholder="3 12 25 31 40 49" aria-label="Your six numbers" className="h-11 w-64 rounded-xl border border-line bg-night px-4 font-mono text-ivory placeholder:text-mute/60" />
        <Button type="submit">Check</Button>
      </form>
      {raw && !valid ? <p role="alert" className="mt-3 text-sm text-miss">Enter 6 different numbers between 1 and 49.</p> : null}

      {valid ? (
        <section className="mt-8" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">{sortAsc(ticket).map((n) => <NumberBall key={n} n={n} size="sm" />)}</div>
          <p className="mt-3 text-ivory">
            Checked {draws.length} draw{draws.length === 1 ? '' : 's'}: {wins.length ? `a prize in ${wins.length}.` : 'no prize in any of them.'}{access.locked ? ' Older results are locked.' : ''}
          </p>
          {wins.length ? (
            <>
              <p className="mt-1 text-sm text-mute">
                {byDivision.map((n, i) => (n ? `${DIVISION_LABEL[i]} prize x${n}` : null)).filter(Boolean).join(', ')}
              </p>
              <ul className="mt-4 divide-y divide-line/50 rounded-2xl border border-line">
                {wins.map(({ d, ev }) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <Link href={`/results/${drawSlug(d.drawNo)}`} className="font-mono text-gold-bright underline-offset-4 hover:underline">{d.drawNo}</Link>
                    <span className="text-mute">{d.drawDate}</span>
                    <span>{DIVISION_LABEL[(ev.division as number) - 1]} prize: {ev.matches} match{ev.matches === 1 ? '' : 'es'}{ev.extraHit ? ' + extra' : ''}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Number checker', path: '/check' }])} />
    </div>
  );
}
