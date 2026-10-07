'use client';

import { useState } from 'react';
import { NumberBall } from '@/components/ball';
import { Button } from '@/components/ui/button';
import { DIVISION_LABEL, DIVISION_RULE, evaluate, parseNumbers, sortAsc } from '@/lib/mark6';
import { money } from '@/lib/format';
import type { Currency, Prize } from '@/lib/types';

type Props = { drawNo: string; numbers: number[]; extra: number | null; prizes: Prize[]; currency: Currency };

export function CheckTicket({ drawNo, numbers, extra, prizes, currency }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ ticket: number[]; matches: number; extraHit: boolean; division: number | null } | null>(null);
  const [error, setError] = useState('');

  const check = () => {
    const ticket = parseNumbers(text);
    if (ticket.length !== 6) {
      setResult(null);
      setError('Enter 6 different numbers between 1 and 49, for example 3 12 25 31 40 49.');
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
      <label htmlFor="check-numbers" className="font-serif text-lg">Check your numbers against draw {drawNo}</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="check-numbers"
          value={text}
          onChange={(e) => setText(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="3 12 25 31 40 49"
          aria-describedby="check-help"
          className="h-11 flex-1 rounded-xl border border-line bg-night px-4 font-mono text-ivory placeholder:text-mute/60"
        />
        <Button type="submit" variant="outline">Check</Button>
      </div>
      <p id="check-help" className="mt-2 text-sm text-mute">Six numbers from 1 to 49, separated by spaces or commas.</p>

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
