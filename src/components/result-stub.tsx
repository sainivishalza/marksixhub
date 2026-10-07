import Link from 'next/link';
import { BallRow } from '@/components/ball';
import { CheckTicket } from '@/components/check-ticket';
import { DIVISION_LABEL, DIVISION_RULE } from '@/lib/mark6';
import { dateLabel, money, unitsLabel } from '@/lib/format';
import { drawSlug, type Currency, type Draw, type Prize } from '@/lib/types';

type Props = { draw: Draw; prizes: Prize[]; currency: Currency; heading?: 'h1' | 'h2'; link?: boolean };

/** Latest result as a ticket stub, with the prize table and a "check my numbers" field. */
export function ResultStub({ draw, prizes, currency, heading = 'h2', link = true }: Props) {
  const H = heading;
  return (
    <article className="stub border-t-2 border-gold p-6 shadow-panel sm:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <H className="text-2xl sm:text-3xl">
          {link ? <Link href={`/results/${drawSlug(draw.drawNo)}`} className="hover:text-gold-bright">Draw {draw.drawNo}</Link> : <>Draw {draw.drawNo}</>}
        </H>
        <time dateTime={draw.drawDate} className="text-mute">{dateLabel(draw.drawDate)}</time>
      </header>

      <div className="mt-5">
        <BallRow numbers={draw.numbers} extra={draw.extra} size="lg" />
        <p className="mt-2 text-sm text-mute">Six winning numbers, then the extra number.</p>
      </div>

      {draw.turnoverHkd !== null ? (
        <p className="mt-4 text-mute">
          Total turnover <span className="font-mono tabular-nums text-ivory">{money(draw.turnoverHkd, currency)}</span>
        </p>
      ) : null}
      {draw.note ? <p className="mt-2 text-mute">{draw.note}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <caption className="sr-only">Prizes for draw {draw.drawNo} in {currency.code}</caption>
          <thead>
            <tr className="border-b border-line text-mute">
              <th scope="col" className="py-2 pr-3 font-medium">Prize</th>
              <th scope="col" className="py-2 pr-3 font-medium">Match</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Winning units</th>
              <th scope="col" className="py-2 text-right font-medium">Per winning unit ({currency.code})</th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((p) => (
              <tr key={p.division} className="border-b border-line/50">
                <th scope="row" className="py-2.5 pr-3 font-serif text-base font-medium text-gold-bright">{DIVISION_LABEL[p.division - 1]}</th>
                <td className="py-2.5 pr-3 text-mute">{DIVISION_RULE[p.division - 1]}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{unitsLabel(p.winners)}</td>
                <td className="py-2.5 text-right font-mono tabular-nums">{p.prizeHkd ? money(p.prizeHkd, currency) : 'No winner'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CheckTicket drawNo={draw.drawNo} numbers={draw.numbers} extra={draw.extra} prizes={prizes} currency={currency} />
    </article>
  );
}
