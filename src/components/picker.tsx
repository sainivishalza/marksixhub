'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Copy, Eraser, Heart, Plus, Share2, Sparkles, Ticket, X } from 'lucide-react';
import { deleteFavouriteAction, placeTicketsAction, saveFavouriteAction, type Favourite } from '@/actions/account';
import { Button } from '@/components/ui/button';
import { NumberBall, ballClass, ringClass } from '@/components/ball';
import { ALL_BALLS, DIVISION_LABEL, evaluate, isBall, quickPick, sortAsc } from '@/lib/mark6';
import { money } from '@/lib/format';
import type { Currency, Prize } from '@/lib/types';
import { cn } from '@/lib/utils';

type LatestDraw = { drawNo: string; numbers: number[]; extra: number | null };
type Props = { latest: LatestDraw | null; prizes: Prize[]; currency: Currency; wallet?: Wallet | null; id?: string };
type Wallet = { points: number; cost: number; drawNo: string | null; closesAt: string | null; favourites: Favourite[]; unseenWins: number };

const PICK = 6;
const MAX_ORDER = 20;
type Mode = 'single' | 'multiple' | 'quick';
const MODES: { id: Mode; label: string }[] = [
  { id: 'single', label: 'Single entry' },
  { id: 'multiple', label: 'Multiple entry' },
  { id: 'quick', label: 'Quick pick' },
];

function left(iso: string, now: number) {
  const mins = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return d ? `${d}d ${h}h left` : h ? `${h}h ${mins % 60}m left` : `${mins}m left`;
}

export function Picker({ latest, prizes, currency, wallet = null, id = 'board' }: Props) {
  const [placing, startPlacing] = useTransition();
  const [receipt, setReceipt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<Mode>('single');
  const [qty, setQty] = useState(5);
  const [slip, setSlip] = useState<number[][]>([]);
  const [points, setPoints] = useState(wallet?.points ?? 0);
  const [favs, setFavs] = useState<Favourite[]>(wallet?.favourites ?? []);
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<number[]>([]);
  const [cursor, setCursor] = useState(1);
  const [status, setStatus] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const sorted = sortAsc(sel);
  const max = PICK;
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
    } else if (sel.length >= max) {
      setStatus(`You already have ${max} numbers. Remove one first.`);
    } else {
      const next = [...sel, n];
      if (mode === 'multiple' && next.length === PICK) {
        addSet(sortAsc(next));
        return;
      }
      setSel(next);
      setStatus(`Added ${n}. ${next.length} of ${PICK} chosen.` + (next.length === PICK ? ` Your numbers: ${sortAsc(next).join(', ')}.` : ''));
    }
  };

  // Multiple entry: every completed set of 6 becomes a ticket on the slip and the board clears for the next one.
  const addSet = (set: number[]) => {
    setSel([]);
    if (slip.length >= MAX_ORDER) return setStatus(`An order holds up to ${MAX_ORDER} tickets. Place it first.`);
    if (slip.some((t) => t.join(',') === set.join(','))) return setStatus('That ticket is already on your slip. Choose a different 6.');
    setSlip([...slip, set]);
    setStatus(`Ticket ${slip.length + 1} added: ${set.join(', ')}. Now choose the next 6 numbers.`);
  };

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
    const added = sortAsc(full.slice(base.length)); // revealed low to high, so each ball lands in the slot it keeps
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

  useEffect(() => {
    if (!wallet?.closesAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [wallet?.closesAt]);

  // Tickets on the slip survive a reload and the trip through login or sign-up.
  const slipLoaded = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('mh_slip') ?? '[]');
      const valid = (Array.isArray(saved) ? saved : [])
        .slice(0, MAX_ORDER)
        .filter((t: unknown): t is number[] => Array.isArray(t) && t.length === PICK && t.every((n) => isBall(Number(n))));
      if (valid.length && !new URLSearchParams(window.location.search).get('t')) setSlip(valid);
    } catch {
      /* nothing saved */
    }
    slipLoaded.current = true;
  }, []);
  useEffect(() => {
    if (slipLoaded.current) saveSlip(slip);
  }, [slip]);

  // A shared link such as /picker?n=3,12,25,31,40,49 preloads the ticket.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // /picker?t=1,2,3,4,5,6|7,8,9,10,11,12 refills the slip ("play again").
    const again = (params.get('t') ?? '')
      .split('|')
      .slice(0, MAX_ORDER)
      .map((x) => [...new Set(x.split(',').map(Number))].filter(isBall))
      .filter((t) => t.length === PICK);
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
  const cost = (tickets: number[][]) => tickets.length * (wallet?.cost ?? 0);

  const addFavourite = () =>
    startPlacing(async () => {
      const res = await saveFavouriteAction(sorted);
      if (res.favourites) setFavs(res.favourites);
      setStatus(res.message);
    });

  const removeFavourite = (favId: number) =>
    startPlacing(async () => {
      const res = await deleteFavouriteAction(favId);
      if (res.favourites) setFavs(res.favourites);
    });

  const addFavToSlip = (nums: number[]) => {
    if (slip.length >= MAX_ORDER) return setStatus(`An order holds up to ${MAX_ORDER} entries. Place it first.`);
    if (slip.some((t) => t.join(',') === nums.join(','))) return setStatus('That ticket is already on your slip.');
    setSlip([...slip, nums]);
    setStatus('Favourite added to your slip.');
  };

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
  const saveSlip = (tickets: number[][]) => {
    try {
      window.localStorage.setItem('mh_slip', JSON.stringify(tickets));
    } catch {
      /* private mode: the tickets just will not be remembered */
    }
  };

  // Not logged in: keep the tickets, then send the person to log in and come back here.
  const submitAsGuest = () => {
    saveSlip(orders);
    window.location.href = '/login?next=/picker';
  };

  const place = () =>
    startPlacing(async () => {
      const res = await placeTicketsAction(orders);
      setStatus(res.message);
      if (res.ok) {
        if (res.points !== undefined) setPoints(res.points);
        setReceipt(res.orderId ?? null);
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
            <span className="text-gold-bright">{sel.length}</span>/{PICK} chosen{mode === 'multiple' ? `, ticket ${slip.length + 1}` : ''}
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
          Pick 6 numbers, then 6 more, and so on, or press Quick pick for a random ticket. Each set of 6 becomes one ticket on your slip (up to {MAX_ORDER}).
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
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {Array.from({ length: PICK }, (_, i) => {
            const n = sorted[i];
            return (
              <div key={i} className="grid aspect-square w-full place-items-center rounded-full border border-dashed border-line">
                <AnimatePresence initial={false}>
                  {n ? (
                    <motion.span
                      key={n}
                      className={cn(ballClass(n), 'h-[90%] w-[90%] text-sm sm:text-lg')}
                      initial={reduce ? false : { y: -10, scale: 0.5, opacity: 0 }}
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
        {mode === 'multiple' ? (
          <Button onClick={() => addSet(sortAsc(quickPick(sel)))}>
            <Sparkles aria-hidden className="h-4 w-4" />
            {sel.length ? 'Fill the rest and add' : 'Quick pick a ticket'}
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
            {mode === 'single' && wallet ? (
              <Button variant="outline" onClick={addFavourite} disabled={!complete || placing}>
                <Heart aria-hidden className="h-4 w-4" />
                Favourite
              </Button>
            ) : null}
            {mode === 'single' ? (
              <Button variant="outline" onClick={addToSlip} disabled={!complete}>
                <Plus aria-hidden className="h-4 w-4" />
                Add to slip
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      {slip.length ? (
        <ul className="mt-4 space-y-2" aria-label="Tickets on your slip">
          {slip.map((t, i) => (
            <li key={t.join(',')} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {t.map((n) => <NumberBall key={n} n={n} size="sm" />)}
              </span>
              <button type="button" aria-label={`Remove ticket ${t.join(' ')}`} onClick={() => setSlip(slip.filter((_, k) => k !== i))} className="shrink-0 text-mute hover:text-ivory">
                <X aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {wallet && favs.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm text-mute">My favourites</p>
          <ul className="space-y-2">
            {favs.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span className="flex min-w-0 flex-wrap items-center gap-1">
                  {f.nums.map((n) => <NumberBall key={n} n={n} size="sm" />)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => addFavToSlip(f.nums)} className="text-sm text-gold-bright underline-offset-4 hover:underline">Add to slip</button>
                  <button type="button" aria-label={`Remove favourite ${f.nums.join(' ')}`} onClick={() => removeFavourite(f.id)} className="text-mute hover:text-ivory">
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {wallet?.unseenWins ? (
        <p className="mt-4 rounded-xl border border-win/40 bg-win/10 p-3 text-sm text-win">
          You won {wallet.unseenWins} points in a recent draw. <Link href="/account" className="underline underline-offset-4">See your orders</Link>.
        </p>
      ) : null}

      {wallet ? (
        <div className="mt-4 rounded-xl border border-gold/30 p-3">
          <p className="text-sm text-mute">
            Balance <span className="font-mono text-gold-bright">{points}</span> points. Each ticket costs <span className="font-mono">{wallet.cost}</span>.
            {wallet.drawNo ? ` For draw ${wallet.drawNo}${wallet.closesAt ? `, ordering closes ${new Date(wallet.closesAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} (${left(wallet.closesAt, now)})` : ''}.` : ' Ordering is closed until the next draw is announced.'}
          </p>
          <Button className="mt-2" onClick={place} disabled={!orders.length || placing || !wallet.drawNo}>
            <Ticket aria-hidden className="h-4 w-4" />
            {placing ? 'Submitting...' : orders.length ? `Submit order: ${orders.length} ticket${orders.length === 1 ? '' : 's'} (${cost(orders)} points)` : 'Submit order'}
          </Button>
          <p className="mt-2 text-xs text-mute">Points are taken when you submit. Your order shows as Pending in My account until the admin approves it, then Accepted until the result.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-gold/30 p-3">
          <p className="text-sm text-mute">Log in or create a free account to submit your numbers. Your tickets are kept while you do.</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button onClick={submitAsGuest} disabled={!orders.length}>
              <Ticket aria-hidden className="h-4 w-4" />
              {orders.length ? `Submit order: ${orders.length} ticket${orders.length === 1 ? '' : 's'}` : 'Submit order'}
            </Button>
            {orders.length ? <Link href="/register" onClick={() => saveSlip(orders)} className="text-sm text-gold-bright underline-offset-4 hover:underline">Create a free account</Link> : null}
          </div>
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-mute">
        {status}
        {receipt ? <> <Link href={`/account/orders/${receipt}`} className="text-gold-bright underline-offset-4 hover:underline">View receipt</Link></> : null}
      </p>
    </div>
  );
}
