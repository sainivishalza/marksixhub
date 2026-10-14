import Link from 'next/link';
import { NumberBall } from '@/components/ball';
import { drawFacts } from '@/lib/stats';
import { drawSlug, type Draw } from '@/lib/types';

/** Plain facts worked out from the six numbers, plus links to the draws either side. */
export function DrawGlance({ draw, older, newer }: { draw: Draw; older: Draw | null; newer: Draw | null }) {
  const f = drawFacts(draw.numbers, older?.numbers);
  const facts = [
    `${f.odd} odd and ${f.even} even`,
    `${f.low} low (1 to 24) and ${f.high} high (25 to 49)`,
    `Total of the six numbers: ${f.sum}`,
    f.pairs ? `${f.pairs} pair${f.pairs === 1 ? '' : 's'} of consecutive numbers` : 'No consecutive numbers',
    `Colours: ${f.red} red, ${f.blue} blue, ${f.green} green`,
  ];
  const link = 'rounded-lg border border-line px-3 py-2 text-sm text-gold-bright hover:border-gold';
  return (
    <section aria-labelledby="glance" className="surface mt-8 p-5">
      <h2 id="glance" className="text-xl">Draw {draw.drawNo} at a glance</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-mute">
        {facts.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {older ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-mute">
          {f.repeats.length ? (
            <>
              <span>Also drawn in {older.drawNo}:</span>
              {f.repeats.map((n) => <NumberBall key={n} n={n} size="sm" />)}
            </>
          ) : (
            <span>None of these numbers were drawn in the draw before ({older.drawNo}).</span>
          )}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-mute">
        Entered by our team from the official published result and checked before it went live. Spotted a mistake? <Link href="/contact" className="text-gold-bright underline underline-offset-4">Tell us</Link>.
      </p>
      <p className="mt-3 text-xs text-mute">Every draw is independent. These are descriptions of what happened, not predictions.</p>
      <nav aria-label="Neighbouring draws" className="mt-4 flex flex-wrap gap-2">
        {older ? <Link href={`/results/${drawSlug(older.drawNo)}`} className={link}>&larr; Draw {older.drawNo}</Link> : null}
        {newer ? <Link href={`/results/${drawSlug(newer.drawNo)}`} className={link}>Draw {newer.drawNo} &rarr;</Link> : null}
        <Link href="/results" className={link}>All results</Link>
      </nav>
      <p className="mt-4 text-sm text-mute">
        Numbers in this draw:{' '}
        {draw.numbers.map((n, i) => (
          <span key={n}>
            {i ? ', ' : ''}
            <Link href={`/statistics/${n}`} className="text-gold-bright underline underline-offset-4">{n}</Link>
          </span>
        ))}
        . Tap one to see how often it has been drawn.
      </p>
    </section>
  );
}
