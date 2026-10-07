import { Check, Clock, X } from 'lucide-react';
import type { OrderView } from '@/lib/account-data';
import { cn } from '@/lib/utils';

/** One short label for where an order stands, with a colour that means the same thing everywhere. */
export function statusOf(o: Pick<OrderView, 'status' | 'settled' | 'won'>): { label: string; tone: 'gold' | 'blue' | 'win' | 'mute' } {
  if (o.status === 'pending') return { label: 'Pending approval', tone: 'gold' };
  if (o.status === 'rejected') return { label: 'Rejected', tone: 'mute' };
  if (o.status === 'refunded') return { label: 'Refunded', tone: 'mute' };
  if (o.settled) return o.won > 0 ? { label: 'Won', tone: 'win' } : { label: 'Result in', tone: 'mute' };
  return { label: 'Accepted', tone: 'blue' };
}

const TONE = {
  gold: 'border-gold/60 bg-gold/10 text-gold-bright',
  blue: 'border-tone-blue/60 bg-tone-blue/10 text-tone-blue',
  win: 'border-win/60 bg-win/10 text-win',
  mute: 'border-line bg-white/5 text-mute',
} as const;

export function StatusPill({ order }: { order: Pick<OrderView, 'status' | 'settled' | 'won'> }) {
  const s = statusOf(order);
  return <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', TONE[s.tone])}>{s.label}</span>;
}

const STEPS = ['Submitted', 'Accepted', 'Result'];

/** Submitted, accepted, result: the three stages an entry goes through. */
export function Stepper({ order }: { order: Pick<OrderView, 'status' | 'settled'> }) {
  if (order.status === 'rejected' || order.status === 'refunded') {
    return (
      <p className="flex items-center gap-2 text-sm text-mute">
        <X aria-hidden className="h-4 w-4" />
        {order.status === 'rejected' ? 'Not accepted. The points went back to your balance.' : 'Refunded. The points went back to your balance.'}
      </p>
    );
  }
  // The step an order is waiting on: pending waits to be accepted, accepted waits for the result, and 3 means everything is done.
  const current = order.status === 'pending' ? 1 : order.settled ? 3 : 2;
  return (
    <ol className="flex items-center" aria-label="Order progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px]',
                  done ? 'border-win bg-win text-night' : active ? 'border-gold-bright bg-gold/15 text-gold-bright' : 'border-line text-mute',
                )}
              >
                {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : active ? <Clock aria-hidden className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn('text-xs sm:text-sm', done || active ? 'text-ivory' : 'text-mute')}>{label}</span>
            </span>
            {i < STEPS.length - 1 ? <span aria-hidden className={cn('mx-2 h-px flex-1 sm:mx-3', i < current ? 'bg-win' : 'bg-line')} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
