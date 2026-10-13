'use client';

import { useState } from 'react';
import { NumberBall } from '@/components/ball';
import { NumberBoxes } from '@/components/number-boxes';
import { Button } from '@/components/ui/button';
import { DIVISION_LABEL, DIVISION_RULE, boxNumbers, evaluate, sortAsc } from '@/lib/mark6';
import { money } from '@/lib/format';
import type { Currency, Prize } from '@/lib/types';

type Props = { drawNo: string; numbers: number[]; extra: number | null; prizes: Prize[]; currency: Currency };

export function CheckTicket({ drawNo, numbers, extra, prizes, currency }: Props) {
  const [cells, setCells] = useState<string[]>([]);
  const [result, setResult] = useState<{ ticket: number[]; matches: number; extraHit: boolean; division: number | null } | null>(null);
  const [error, setError] = useState('');

  const check = () => {
    const ticket = boxNumbers(cells);
    if (ticket.length !== 6) {
      setResult(null);
      setError('Fill all six circles with different numbers from 1 to 49.');
      return;
    }
    setError('');
    setResult({ ticket: sortAsc(ticket), ...evaluate(ticket, numbers, extra) });
  };

  const prize = result?.division ? prizes.find((p) => p.division === result.division) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        check();
      }}
      className="mt-6 border-t border-dashed border-line pt-5"
    >
      <p className="font-serif text-lg">Check your numbers against draw {drawNo}</p>
      <div className="mt-3">
        <NumberBoxes label="Your six numbers" onChange={setCells} />
      </div>
      <p className="mt-2 text-sm text-mute">Type one number in each circle, from 1 to 49. It moves to the next circle by itself. You can also paste all six at once.</p>
      <Button type="submit" variant="outline" className="mt-3 w-full sm:w-auto">Check</Button>

      <div role="status" aria-live="polite" className="mt-3">
        {error ? <p className="text-miss">{error}</p> : null}
        {result ? (
          <div className="rounded-xl border border-line bg-night/60 p-4">
            <div className="flex flex-wrap gap-1.5">
              {result.ticket.map((n) => (
                <span key={n} className={numbers.includes(n) ? 'rounded-full ring-2 ring-win ring-offset-2 ring-offset-night' : n === extra ? 'rounded-full ring-2 ring-gold-bright ring-offset-2 ring-offset-night' : 'opacity-50'}>
                  <NumberBall n={n} size="sm" />
                </span>
              ))}
            </div>
            {result.division ? (
              <p className="mt-3 text-win">
                {DIVISION_LABEL[result.division - 1]} division: {DIVISION_RULE[result.division - 1].toLowerCase()}.
                {prize && prize.prizeHkd ? ` Prize ${money(prize.prizeHkd, currency)}.` : ''}
              </p>
            ) : (
              <p className="mt-3 text-mute">
                {result.matches} matching number{result.matches === 1 ? '' : 's'}
                {result.extraHit ? ' and the extra number' : ''}. No prize this time.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}
