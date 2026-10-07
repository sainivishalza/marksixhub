'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, Copy, Eraser, Share2, Sparkles } from 'lucide-react';
import { saveSetAction } from '@/actions/account';
import { Button } from '@/components/ui/button';
import { ballClass, ringClass } from '@/components/ball';
import { ALL_BALLS, DIVISION_LABEL, evaluate, isBall, quickPick, sortAsc } from '@/lib/mark6';
import { money } from '@/lib/format';
import type { Currency, Prize } from '@/lib/types';
import { cn } from '@/lib/utils';

type LatestDraw = { drawNo: string; numbers: number[]; extra: number | null };
type Props = { latest: LatestDraw | null; prizes: Prize[]; currency: Currency; loggedIn?: boolean; id?: string };

const PICK = 6;

export function Picker({ latest, prizes, currency, loggedIn = false, id = 'board' }: Props) {
  const [saving, startSaving] = useTransition();
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<number[]>([]);
  const [cursor, setCursor] = useState(1);
  const [status, setStatus] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const sorted = sortAsc(sel);
  const complete = sel.length === PICK;

  const stopTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const toggle = (n: number) => {
    stopTimers();
    if (sel.includes(n)) {
      setSel(sel.filter((x) => x !== n));
      setStatus(`Removed ${n}. ${sel.length - 1} of ${PICK} chosen.`);
    } else if (sel.length >= PICK) {
      setStatus(`You already have ${PICK} numbers. Remove one first.`);
    } else {
      const next = [...sel, n];
      setSel(next);
      setStatus(
        `Added ${n}. ${next.length} of ${PICK} chosen.` + (next.length === PICK ? ` Your numbers: ${sortAsc(next).join(', ')}.` : ''),
      );
    }
  };

  const clear = () => {
    stopTimers();
    setSel([]);
    setStatus('Cleared. 0 of 6 chosen.');
  };

  const runQuickPick = useCallback(() => {
    stopTimers();
    const base = sel.length === PICK ? [] : sel;
    const full = quickPick(base);
    const added = full.slice(base.length);
    const done = () => setStatus(`Quick pick: ${sortAsc(full).join(', ')}.`);
    if (reduce) {
      setSel(full);
      done();
      return;
    }
    setSel(base);
    added.forEach((n, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setSel((prev) => (prev.includes(n) ? prev : [...prev, n]));
          if (i === added.length - 1) done();
        }, 180 * (i + 1)),
      );
    });
  }, [sel, reduce]);

  // Latest handler for events fired by the hero buttons.
  const quickRef = useRef(runQuickPick);
  quickRef.current = runQuickPick;

  useEffect(() => {
    const onQuick = () => quickRef.current();
    const onFocus = () => grid.current?.querySelector<HTMLButtonElement>(`[data-n="${cursor}"]`)?.focus();
    window.addEventListener('mh:quickpick', onQuick);
    window.addEventListener('mh:focusboard', onFocus);
    return () => {
      window.removeEventListener('mh:quickpick', onQuick);
      window.removeEventListener('mh:focusboard', onFocus);
      stopTimers();
    };
  }, [cursor]);

  // A shared link such as /picker?n=3,12,25,31,40,49 preloads the ticket.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get('n');
    if (!shared) return;
    const nums = [...new Set(shared.split(',').map(Number))].filter(isBall).slice(0, PICK);
    if (nums.length) setSel(nums);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cols = grid.current ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length : 7;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next = cursor;
    if (e.key in step) next = cursor + step[e.key];
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 49;
    else return;
    e.preventDefault();
    next = Math.min(49, Math.max(1, next));
    setCursor(next);
    grid.current?.querySelector<HTMLButtonElement>(`[data-n="${next}"]`)?.focus();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sorted.join(' '));
      setStatus('Numbers copied.');
    } catch {
      setStatus('Could not copy. Select the numbers and copy them by hand.');
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/picker?n=${sorted.join(',')}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My Mark Six numbers', text: sorted.join(' '), url });
      else {
        await navigator.clipboard.writeText(url);
        setStatus('Link copied.');
      }
    } catch {
      /* the person closed the share sheet */
    }
  };

  const save = () =>
    startSaving(async () => {
      const res = await saveSetAction(sorted);
      setStatus(res.message);
    });

  const verdict = (() => {
    if (!complete || !latest) return null;
    const ev = evaluate(sorted, latest.numbers, latest.extra);
    if (ev.division === null)
      return `Against draw ${latest.drawNo}: ${ev.matches} matching number${ev.matches === 1 ? '' : 's'}${ev.extraHit ? ' and the extra' : ''}. No prize.`;
    const prize = prizes.find((p) => p.division === ev.division);
    return `Against draw ${latest.drawNo}: ${DIVISION_LABEL[ev.division - 1]} prize${prize && prize.prizeHkd ? `, ${money(prize.prizeHkd, currency)}` : ''}.`;
  })();

  return (
    <div id={id} className="surface p-4 sm:p-6" aria-labelledby={`${id}-title`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="text-xl">Number board</h2>
        <p className="font-mono text-sm text-mute" aria-hidden>
          <span className="text-gold-bright">{sel.length}</span>/{PICK} chosen
        </p>
      </div>

      <div
        ref={grid}
        role="group"
        aria-label="Numbers 1 to 49. Choose 6. Use arrow keys to move and Enter to select."
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
      >
        {ALL_BALLS.map((n) => {
          const on = sel.includes(n);
          return (
            <button
              key={n}
              type="button"
              data-n={n}
              tabIndex={n === cursor ? 0 : -1}
              aria-pressed={on}
              aria-label={`Number ${n}`}
              onClick={() => {
                setCursor(n);
                toggle(n);
              }}
              className={cn(
                on ? ballClass(n) : ringClass(n),
                'aspect-square w-full text-sm transition duration-150 sm:text-base',
                on ? 'z-10 scale-110 shadow-glow' : 'hover:bg-white/10',
                !on && complete && 'opacity-40 hover:opacity-80',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-gold/40 bg-night/60 p-3 sm:p-4" aria-label="Your ticket">
        <div className="flex min-h-[3.75rem] items-center justify-between gap-1.5">
          {Array.from({ length: PICK }, (_, i) => {
            const n = sorted[i];
            return (
              <div key={i} className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-line sm:h-14 sm:w-14">
                <AnimatePresence initial={false}>
                  {n ? (
                    <motion.span
                      key={n}
                      className={cn(ballClass(n), 'h-11 w-11 text-base sm:h-12 sm:w-12 sm:text-lg')}
                      initial={reduce ? false : { y: -26, scale: 0.4, opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={reduce ? undefined : { scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    >
                      {n}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        {verdict ? <p className="mt-3 text-sm text-mute">{verdict} <span className="text-mute/70">For fun only.</span></p> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={runQuickPick}>
          <Sparkles aria-hidden className="h-4 w-4" />
          {complete ? 'Pick again' : sel.length ? 'Fill the rest' : 'Quick pick'}
        </Button>
        <Button variant="outline" onClick={clear} disabled={!sel.length}>
          <Eraser aria-hidden className="h-4 w-4" />
          Clear
        </Button>
        <Button variant="outline" onClick={copy} disabled={!complete}>
          <Copy aria-hidden className="h-4 w-4" />
          Copy
        </Button>
        <Button variant="outline" onClick={share} disabled={!complete}>
          <Share2 aria-hidden className="h-4 w-4" />
          Share
        </Button>
        {loggedIn ? (
          <Button variant="outline" onClick={save} disabled={!complete || saving}>
            <Bookmark aria-hidden className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        ) : null}
      </div>
      {!loggedIn && complete ? (
        <p className="mt-3 text-sm text-mute">
          <Link href="/login?next=/picker" className="text-gold-bright underline-offset-4 hover:underline">Log in</Link> or{' '}
          <Link href="/register" className="text-gold-bright underline-offset-4 hover:underline">create a free account</Link> to save this ticket.
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-mute">
        {status}
      </p>
    </div>
  );
}
