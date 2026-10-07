'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Copy, Eraser, Plus, Share2, Sparkles, Ticket, X } from 'lucide-react';
import { placeTicketsAction } from '@/actions/account';
import { Button } from '@/components/ui/button';
import { NumberBall, ballClass, ringClass } from '@/components/ball';
import { ALL_BALLS, DIVISION_LABEL, MAX_MULTI, evaluate, isBall, quickPick, sortAsc, ticketUnits } from '@/lib/mark6';
import { money } from '@/lib/format';
import type { Currency, Prize } from '@/lib/types';
import { cn } from '@/lib/utils';

type LatestDraw = { drawNo: string; numbers: number[]; extra: number | null };
type Props = { latest: LatestDraw | null; prizes: Prize[]; currency: Currency; wallet?: Wallet | null; id?: string };
type Wallet = { points: number; cost: number; drawNo: string | null; closesAt: string | null };

const PICK = 6;
const MAX_ORDER = 20;
type Mode = 'single' | 'multiple' | 'quick';
const MODES: { id: Mode; label: string }[] = [
  { id: 'single', label: 'Single entry' },
  { id: 'multiple', label: 'Multiple entry' },
  { id: 'quick', label: 'Quick pick' },
];

export function Picker({ latest, prizes, currency, wallet = null, id = 'board' }: Props) {
  const [placing, startPlacing] = useTransition();
  const [mode, setMode] = useState<Mode>('single');
  const [qty, setQty] = useState(5);
  const [slip, setSlip] = useState<number[][]>([]);
  const [points, setPoints] = useState(wallet?.points ?? 0);
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<number[]>([]);
  const [cursor, setCursor] = useState(1);
  const [status, setStatus] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const sorted = sortAsc(sel);
  const max = mode === 'multiple' ? MAX_MULTI : PICK;
  const complete = mode === 'multiple' ? sel.length > PICK : sel.length === PICK;

  const stopTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const toggle = (n: number) => {
    stopTimers();
    if (sel.includes(n)) {
      setSel(sel.filter((x) => x !== n));
      setStatus(`Removed ${n}. ${sel.length - 1} of ${PICK} chosen.`);
    } else if (sel.length >= max) {
      setStatus(`You already have ${max} numbers. Remove one first.`);
    } else {
      const next = [...sel, n];
      setSel(next);
      setStatus(
        `Added ${n}. ${next.length} chosen.` + (complete_(next) ? ` Your numbers: ${sortAsc(next).join(', ')}.` : ''),
      );
    }
  };

  const complete_ = (n: number[]) => (mode === 'multiple' ? n.length > PICK : n.length === PICK);

  const changeMode = (m: Mode) => {
    stopTimers();
    setSel([]);
    setMode(m);
    setStatus('');
  };

  const clear = () => {
    stopTimers();
    setSel([]);
    setStatus('Cleared. 0 of 6 chosen.');
  };

  const runQuickPick = useCallback(() => {
    stopTimers();
    const base = mode === 'single' && sel.length < PICK ? sel : [];
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
  }, [sel, reduce, mode]);

  // Latest handler for events fired by the hero buttons.
  const quickRef = useRef(runQuickPick);
  quickRef.current = runQuickPick;

  useEffect(() => {
    const onQuick = () => {
      setMode('single');
      quickRef.current();
    };
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
    const params = new URLSearchParams(window.location.search);
    // /picker?t=1,2,3,4,5,6|7,8,9,10,11,12 refills the slip ("play again").
    const again = (params.get('t') ?? '')
      .split('|')
      .slice(0, MAX_ORDER)
      .map((x) => [...new Set(x.split(',').map(Number))].filter(isBall))
      .filter((t) => t.length >= PICK && t.length <= MAX_MULTI);
    if (again.length) setSlip(again);
    const shared = params.get('n');
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

  const key = sorted.join(',');
  const cost = (tickets: number[][]) => tickets.reduce((a, t) => a + ticketUnits(t.length), 0) * (wallet?.cost ?? 0);

  const addToSlip = () => {
    if (slip.length >= MAX_ORDER) return setStatus(`An order holds up to ${MAX_ORDER} entries. Place it first.`);
    if (slip.some((t) => t.join(',') === key)) return setStatus('That ticket is already on your slip.');
    setSlip([...slip, sorted]);
    setSel([]);
    setStatus(`Added to your slip (${slip.length + 1}). Choose another or place your order.`);
  };

  const addQuick = () => {
    const room = MAX_ORDER - slip.length;
    if (room <= 0) return setStatus(`An order holds up to ${MAX_ORDER} entries. Place it first.`);
    const seen = new Set(slip.map((t) => t.join(',')));
    const fresh: number[][] = [];
    while (fresh.length < Math.min(qty, room)) {
      const t = sortAsc(quickPick());
      if (!seen.has(t.join(','))) {
        seen.add(t.join(','));
        fresh.push(t);
      }
    }
    setSlip([...slip, ...fresh]);
    setStatus(`${fresh.length} quick pick ticket${fresh.length === 1 ? '' : 's'} added to your slip.`);
  };

  const orders = mode !== 'quick' && complete && !slip.some((t) => t.join(',') === key) ? [...slip, sorted] : slip;
  const place = () =>
    startPlacing(async () => {
      const res = await placeTicketsAction(orders);
      setStatus(res.message);
      if (res.ok) {
        if (res.points !== undefined) setPoints(res.points);
        setSlip([]);
        setSel([]);
      }
    });

  const verdict = (() => {
    if (mode !== 'single' || !complete || !latest) return null;
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
        {mode !== 'quick' ? (
          <p className="font-mono text-sm text-mute" aria-hidden>
            <span className="text-gold-bright">{sel.length}</span>{mode === 'multiple' ? ` chosen (7 to ${MAX_MULTI})` : `/${PICK} chosen`}
          </p>
        ) : null}
      </div>

      <div role="tablist" aria-label="How to pick" className="mb-4 flex gap-1 rounded-xl border border-line p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => changeMode(m.id)}
            className={cn('flex-1 rounded-lg px-2 py-2 text-sm transition', mode === m.id ? 'bg-gold text-night' : 'text-mute hover:text-ivory')}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'multiple' ? (
        <p className="mb-3 text-sm text-mute">
          Choose 7 to {MAX_MULTI} numbers. Every set of 6 inside them is one ticket
          {sel.length > PICK ? <>: <span className="font-mono text-ivory">{ticketUnits(sel.length)}</span> tickets{wallet ? <>, <span className="font-mono text-ivory">{ticketUnits(sel.length) * wallet.cost}</span> points</> : null}</> : null}.
        </p>
      ) : null}

      {mode === 'quick' ? (
        <div className="rounded-xl border border-dashed border-gold/40 bg-night/60 p-4">
          <label htmlFor={`${id}-qty`} className="text-sm text-mute">How many quick pick tickets? (1 to {MAX_ORDER})</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id={`${id}-qty`}
              type="number"
              min={1}
              max={MAX_ORDER}
              value={qty}
              onChange={(e) => setQty(Math.min(MAX_ORDER, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
              className="h-10 w-24 rounded-lg border border-line bg-night px-3 font-mono text-ivory"
            />
            <Button onClick={addQuick}>
              <Sparkles aria-hidden className="h-4 w-4" />
              Add {qty} random ticket{qty === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      ) : (
      <>

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
        <div className="flex min-h-[3.75rem] flex-wrap items-center justify-between gap-1.5">
          {Array.from({ length: Math.max(PICK, sorted.length) }, (_, i) => {
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

      </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === 'single' ? (
        <Button onClick={runQuickPick}>
          <Sparkles aria-hidden className="h-4 w-4" />
          {complete ? 'Pick again' : sel.length ? 'Fill the rest' : 'Quick pick'}
        </Button>
        ) : null}
        {mode !== 'quick' ? (
          <>
            <Button variant="outline" onClick={clear} disabled={!sel.length}>
              <Eraser aria-hidden className="h-4 w-4" />
              Clear
            </Button>
            {mode === 'single' ? (
              <>
                <Button variant="outline" onClick={copy} disabled={!complete}>
                  <Copy aria-hidden className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" onClick={share} disabled={!complete}>
                  <Share2 aria-hidden className="h-4 w-4" />
                  Share
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={addToSlip} disabled={!complete}>
              <Plus aria-hidden className="h-4 w-4" />
              Add to slip
            </Button>
          </>
        ) : null}
      </div>

      {slip.length ? (
        <ul className="mt-4 space-y-2" aria-label="Tickets on your slip">
          {slip.map((t, i) => (
            <li key={t.join(',')} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {t.map((n) => <NumberBall key={n} n={n} size="sm" />)}
                {t.length > PICK ? <span className="ml-1 text-xs text-mute">multiple, {ticketUnits(t.length)} tickets</span> : null}
              </span>
              <button type="button" aria-label={`Remove ticket ${t.join(' ')}`} onClick={() => setSlip(slip.filter((_, k) => k !== i))} className="shrink-0 text-mute hover:text-ivory">
                <X aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {wallet ? (
        <div className="mt-4 rounded-xl border border-gold/30 p-3">
          <p className="text-sm text-mute">
            Balance <span className="font-mono text-gold-bright">{points}</span> points. Each ticket costs <span className="font-mono">{wallet.cost}</span>.
            {wallet.drawNo ? ` For draw ${wallet.drawNo}${wallet.closesAt ? `, ordering closes ${new Date(wallet.closesAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.` : ' Ordering is closed until the next draw is announced.'}
          </p>
          <Button className="mt-2" onClick={place} disabled={!orders.length || placing || !wallet.drawNo}>
            <Ticket aria-hidden className="h-4 w-4" />
            {placing ? 'Placing...' : orders.length ? `Place order: ${orders.reduce((a, t) => a + ticketUnits(t.length), 0)} ticket${orders.length === 1 && orders[0].length === PICK ? '' : 's'} (${cost(orders)} points)` : 'Place order'}
          </Button>
        </div>
      ) : complete ? (
        <p className="mt-3 text-sm text-mute">
          <Link href="/login?next=/picker" className="text-gold-bright underline-offset-4 hover:underline">Log in</Link> or{' '}
          <Link href="/register" className="text-gold-bright underline-offset-4 hover:underline">create a free account</Link> to place tickets with free points.
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-mute">
        {status}
      </p>
    </div>
  );
}
