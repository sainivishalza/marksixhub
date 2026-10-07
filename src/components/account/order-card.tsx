import Link from 'next/link';
import { Download, Repeat2 } from 'lucide-react';
import { NumberBall } from '@/components/ball';
import { shortWhen, type OrderView, type TicketView } from '@/lib/account-data';
import { cn } from '@/lib/utils';
import { StatusPill, Stepper } from './status';

function TicketRow({ t, void: voided }: { t: TicketView; void: boolean }) {
  const known = t.winning !== null && !voided;
  const note = voided
    ? { text: 'Not entered in the draw', cls: 'text-mute' }
    : !t.settled
    ? { text: 'Waiting for the result', cls: 'text-mute' }
    : t.won > 0
      ? { text: `Won ${t.won.toLocaleString('en-US')} points`, cls: 'font-medium text-win' }
      : { text: t.matches !== null ? `${t.matches} match${t.matches === 1 ? '' : 'es'}, no prize` : 'No prize', cls: 'text-mute' };
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Numbers ${t.numbers.join(', ')}`}>
        {t.numbers.map((n) => (
          <NumberBall key={n} n={n} size="sm" className={cn(known && !t.winning!.includes(n) && 'opacity-35')} />
        ))}
      </span>
      <span className={cn('text-sm', note.cls)}>{note.text}</span>
    </li>
  );
}

/** One order as a ticket slip: where it is, what is on it, what to do next. */
export function OrderCard({ order: o, detail = false }: { order: OrderView; detail?: boolean }) {
  const again = o.sets.map((s) => s.numbers.join(',')).join('|');
  const action = 'inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ivory transition-colors hover:border-gold hover:text-gold-bright';
  return (
    <article className="surface overflow-hidden" aria-label={`Order ${o.orderNo}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="font-serif text-2xl leading-tight">Draw {o.drawNo}</h3>
          <p className="mt-1 text-sm text-mute">
            {detail ? (
              <span className="font-mono text-ivory">Order {o.orderNo}</span>
            ) : (
              <Link href={`/account/orders/${o.id}`} className="font-mono text-ivory underline-offset-4 hover:text-gold-bright hover:underline">Order {o.orderNo}</Link>
            )}{' '}
            placed {shortWhen(o.createdAt)}. {o.tickets} ticket{o.tickets === 1 ? '' : 's'}, {o.points} points.
          </p>
        </div>
        <StatusPill order={o} />
      </header>
      <div className="border-t border-line/50 px-4 py-4 sm:px-5">
        <Stepper order={o} />
      </div>
      {o.sets.length ? <ul className="divide-y divide-line/40 border-t border-line/50">{o.sets.map((t) => <TicketRow key={t.id} t={t} void={o.status === 'rejected' || o.status === 'refunded'} />)}</ul> : null}
      {o.won > 0 ? (
        <p className="border-t border-win/30 bg-win/10 px-4 py-3 text-sm text-win sm:px-5">You won {o.won.toLocaleString('en-US')} points. They are in your balance.</p>
      ) : null}
      {!detail || o.sets.length ? (
        <footer className="flex flex-wrap gap-2 border-t border-dashed border-line px-4 py-3 sm:px-5">
          {!detail && o.status === 'accepted' ? (
            <Link href={`/account/orders/${o.id}`} className={action}><Download aria-hidden className="h-4 w-4" />Receipt</Link>
          ) : null}
          {o.sets.length ? <Link href={`/picker?t=${again}`} className={action}><Repeat2 aria-hidden className="h-4 w-4" />Play again</Link> : null}
        </footer>
      ) : null}
    </article>
  );
}
