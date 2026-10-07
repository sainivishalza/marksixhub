'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { money } from '@/lib/format';
import type { Currency } from '@/lib/types';

/** Counts up to the admin-entered estimate once, on load. The server renders the final value. */
export function Jackpot({ valueHkd, currency }: { valueHkd: number; currency: Currency }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(valueHkd);

  useEffect(() => {
    if (reduce || valueHkd <= 0) return;
    let frame = 0;
    const start = performance.now();
    const run = (now: number) => {
      const t = Math.min(1, (now - start) / 1600);
      setShown(Math.round(valueHkd * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [valueHkd, reduce]);

  return (
    <span className="gold-text font-serif text-5xl font-semibold tabular-nums sm:text-6xl" aria-label={money(valueHkd, currency)}>
      <span aria-hidden>{money(shown, currency)}</span>
    </span>
  );
}
