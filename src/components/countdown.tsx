'use client';

import { useEffect, useState } from 'react';

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
};

/** Live countdown. `target` is an ISO timestamp with offset. Renders placeholders until mounted to avoid a hydration mismatch. */
export function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => setLeft(end - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (left !== null && left <= 0) return <p className="font-serif text-2xl text-gold-bright">The draw is under way. Results appear here soon.</p>;

  const p = left === null ? null : parts(left);
  const cells: [string, number | null][] = [
    ['days', p?.days ?? null],
    ['hours', p?.hours ?? null],
    ['minutes', p?.minutes ?? null],
    ['seconds', p?.seconds ?? null],
  ];

  return (
    <div className="flex items-end gap-3 sm:gap-5" role="timer" aria-label="Time until the next draw">
      {cells.map(([label, value]) => (
        <div key={label} className="text-center">
          <div className="min-w-[3.4rem] rounded-xl border border-line bg-night px-2 py-2 font-mono text-3xl font-semibold tabular-nums text-gold-bright sm:min-w-[4.6rem] sm:text-5xl">
            {value === null ? '--' : String(value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-xs text-mute">{label}</div>
        </div>
      ))}
    </div>
  );
}
