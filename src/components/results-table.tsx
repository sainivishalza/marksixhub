import Link from 'next/link';
import { BallRow } from '@/components/ball';
import { dateLabel, HKD, money } from '@/lib/format';
import { DIVISION_LABEL } from '@/lib/mark6';
import { drawSlug, type Currency, type Draw, type TopPrize } from '@/lib/types';

type Props = { draws: Draw[]; tops?: Record<number, TopPrize>; currency?: Currency };

export function ResultsTable({ draws, tops = {}, currency = HKD }: Props) {
  if (!draws.length) return <p className="text-mute">No results have been published yet.</p>;
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Recent Mark Six draws">
        {draws.map((d) => {
          const top = tops[d.id];
          return (
            <li key={d.id}>
              <Link
                href={`/results/${drawSlug(d.drawNo)}`}
                className="block rounded-2xl border border-line bg-panel/70 p-4 transition-colors hover:border-gold/60 active:bg-raised"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-lg font-semibold text-gold-bright">{d.drawNo}</span>
                  <time dateTime={d.drawDate} className="text-sm text-mute">{dateLabel(d.drawDate)}</time>
                </div>
                <div className="mt-3">
                  <BallRow numbers={d.numbers} extra={d.extra} size="sm" />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line/50 pt-3">
                  <div>
                    <dt className="text-xs text-mute">Biggest prize won</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums text-ivory">
                      {top ? money(top.prizeHkd, currency) : '-'}
                      {top ? <span className="block font-sans text-xs text-mute">{DIVISION_LABEL[top.division - 1]} prize</span> : null}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs text-mute">Turnover</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums text-ivory">{d.turnoverHkd !== null ? money(d.turnoverHkd, currency) : '-'}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
      <table className="w-full min-w-[46rem] text-left text-sm">
        <caption className="sr-only">Recent Mark Six draws</caption>
        <thead className="bg-panel text-mute">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Draw</th>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            <th scope="col" className="px-4 py-3 font-medium">Winning numbers and extra</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Biggest prize won</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Turnover</th>
          </tr>
        </thead>
        <tbody>
          {draws.map((d) => (
            <tr key={d.id} className="border-t border-line/50 hover:bg-raised/60">
              <th scope="row" className="px-4 py-3 font-mono font-medium">
                <Link href={`/results/${drawSlug(d.drawNo)}`} className="text-gold-bright hover:underline">{d.drawNo}</Link>
              </th>
              <td className="whitespace-nowrap px-4 py-3 text-mute">
                <time dateTime={d.drawDate}>{dateLabel(d.drawDate)}</time>
              </td>
              <td className="px-4 py-3"><BallRow numbers={d.numbers} extra={d.extra} size="sm" /></td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {tops[d.id] ? (
                  <>
                    <span className="font-mono tabular-nums text-ivory">{money(tops[d.id].prizeHkd, currency)}</span>
                    <span className="block text-xs text-mute">{DIVISION_LABEL[tops[d.id].division - 1]} prize</span>
                  </>
                ) : (
                  <span className="text-mute">-</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-mute">
                {d.turnoverHkd !== null ? money(d.turnoverHkd, currency) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
