import type { ReactNode } from 'react';
import { Countdown } from '@/components/countdown';
import { dateLong, drawMoment, money, timeLabel } from '@/lib/format';
import type { Currency, Draw } from '@/lib/types';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/40 py-3">
      <dt className="text-mute">{label}</dt>
      <dd className="text-right font-mono tabular-nums text-ivory">{children}</dd>
    </div>
  );
}

const pending = <span className="font-sans text-sm text-mute">Not announced yet</span>;

/** The upcoming draw with the details the HKJC publishes: number, date, stop selling time, turnover, jackpot, estimated 1st prize and fund. */
export function NextDrawPanel({ draw, currency, showPrizes = true }: { draw: Draw; currency: Currency; showPrizes?: boolean }) {
  const amount = (v: number | null) => (v === null ? pending : money(v, currency));
  return (
    <section aria-labelledby="next-draw-title" className="surface p-6 sm:p-8">
      <h2 id="next-draw-title" className="text-3xl">Next draw</h2>

      <div className="mt-5 grid gap-x-12 gap-y-6 md:grid-cols-2">
        <dl>
          <Row label="Next draw number">{draw.drawNo}</Row>
          <Row label="Draw date">
            <time dateTime={draw.drawDate}>{dateLong(draw.drawDate)}</time>
          </Row>
          <Row label="Stop selling time">{draw.stopSelling ? `${timeLabel(draw.stopSelling)} (Hong Kong time)` : pending}</Row>
          <Row label="Turnover">{amount(draw.turnoverHkd)}</Row>
        </dl>

        {showPrizes ? (
          <dl>
            <Row label="Jackpot / Snowball">{amount(draw.snowballHkd)}</Row>
            <div className="border-b border-line/40 py-3">
              <dt className="text-mute">Estimated 1st division prize</dt>
              <dd className="mt-1 text-right">
                {draw.estJackpotHkd > 0 ? (
                  <span className="gold-text font-serif text-4xl font-semibold tabular-nums sm:text-5xl">{money(draw.estJackpotHkd, currency)}</span>
                ) : (
                  pending
                )}
              </dd>
            </div>
            <Row label="Fund">{amount(draw.fundHkd)}</Row>
          </dl>
        ) : null}
      </div>

      <div className="mt-8 border-t border-dashed border-line pt-6">
        <p className="mb-3 text-sm text-mute">Time until the draw (about 9:30 pm Hong Kong time)</p>
        <Countdown target={drawMoment(draw.drawDate)} />
        {draw.note ? <p className="mt-5 text-sm text-mute">{draw.note}</p> : null}
        <p className="mt-4 text-xs text-mute">Amounts are shown in {currency.code}. The HKJC publishes them in Hong Kong dollars.</p>
      </div>
    </section>
  );
}
