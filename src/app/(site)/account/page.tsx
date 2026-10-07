import type { Metadata } from 'next';
import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { ArrowRight, Ticket } from 'lucide-react';
import { claimDailyAction, dismissWinsAction } from '@/actions/account';
import { OrderCard } from '@/components/account/order-card';
import { Streak } from '@/components/account/streak';
import { Button, buttonVariants } from '@/components/ui/button';
import { getOrders } from '@/lib/account-data';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { openDraw } from '@/lib/points';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

const hk = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ mail?: string; verified?: string }> }) {
  const user = await requireUser('/account');
  const { mail, verified } = await searchParams;
  const [settings, open, orders] = await Promise.all([getSettings(), openDraw(), getOrders(user.id, { limit: 3 })]);
  const [me] = await query<RowDataPacket & { streak: number; done: number; cont: number }>(
    'SELECT streak, (last_claim = UTC_DATE()) AS done, (last_claim = UTC_DATE() - INTERVAL 1 DAY) AS cont FROM users WHERE id=?',
    [user.id],
  );
  const [win] = await query<RowDataPacket & { n: number | null; draws: string | null }>(
    'SELECT SUM(won_points) AS n, GROUP_CONCAT(DISTINCT draw_no) AS draws FROM saved_sets WHERE user_id=? AND settled=1 AND notified=0 AND won_points>0',
    [user.id],
  );
  const mine = open
    ? await query<RowDataPacket & { n: number; pending: number | null }>("SELECT COUNT(*) AS n, SUM(status='pending') AS pending FROM orders WHERE user_id=? AND draw_no=? AND refunded=0", [user.id, open.drawNo])
    : [];
  const [stat] = await query<RowDataPacket & { orders: number; won: number | null }>(
    'SELECT (SELECT COUNT(*) FROM orders WHERE user_id=? AND refunded=0) AS orders, (SELECT SUM(won_points) FROM saved_sets WHERE user_id=? AND settled=1) AS won',
    [user.id, user.id],
  );
  const log = await query<RowDataPacket & { id: number; delta: number; reason: string; created_at: string }>(
    'SELECT id, delta, reason, created_at FROM point_log WHERE user_id=? ORDER BY id DESC LIMIT 5',
    [user.id],
  );

  const done = Boolean(Number(me?.done));
  const streak = Number(me?.streak) || 0;
  const kept = done ? Math.min(streak, 7) : Number(me?.cont) ? Math.min(streak, 7) : 0;
  const next = Math.min(kept + 1, 7); // the day you reach by claiming next
  const bonus = settings.dailyPoints + 10 * (next - 1);
  const badges = [
    [Number(stat.orders) >= 1, 'First order'],
    [Number(stat.orders) >= 10, '10 orders'],
    [streak >= 7, '7-day streak'],
    [Number(stat.won) > 0, 'First win'],
    [Number(stat.won) >= 1000, '1,000 points won'],
  ].filter(([ok]) => ok).map(([, l]) => l as string);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl">My account</h1>
        <p className="mt-1 text-mute">Your points, your entries and what is happening to them.</p>
      </div>

      {verified ? <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-4 py-3 text-sm text-win">Email confirmed. You can place orders now.</p> : null}
      {mail === 'sent' ? <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-4 py-3 text-sm text-win">A new link is on its way.</p> : null}
      {mail === 'wait' ? <p role="alert" className="rounded-xl border border-miss/40 bg-miss/10 px-4 py-3 text-sm text-miss">Too many requests. Try again in an hour.</p> : null}
      {Number(win?.n) ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-win/50 bg-win/10 p-4 sm:p-5">
          <p className="text-win">You won {Number(win.n).toLocaleString('en-US')} points in draw {win.draws}.</p>
          <form action={dismissWinsAction}><Button type="submit" size="sm" variant="outline">Dismiss</Button></form>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="surface p-5 sm:p-6" aria-label="Daily points">
          <h2 className="font-serif text-xl">Daily points</h2>
          <p className="mt-1 text-sm text-mute">Free play points. They are not money, cannot be bought and cannot be cashed out.</p>
          <div className="mt-5"><Streak days={kept} /></div>
          <p className="mt-2 text-sm text-mute">
            {kept > 0 ? `Day ${kept} of 7 in a row.` : 'Claim today to start a streak.'} Each day in a row adds 10 points, up to day 7.
          </p>
          <div className="mt-5">
            {!user.verified ? (
              <Button disabled>Claim {bonus} points</Button>
            ) : done ? (
              <p className="text-sm text-win">Claimed today. Come back tomorrow for {bonus} points.</p>
            ) : (
              <form action={claimDailyAction}><Button type="submit">Claim {bonus} points</Button></form>
            )}
          </div>
        </section>

        <section className="surface flex flex-col p-5 sm:p-6" aria-label="Next draw">
          <h2 className="font-serif text-xl">Next draw</h2>
          {open ? (
            <>
              <p className="mt-3 font-serif text-4xl leading-none">{open.drawNo}</p>
              <p className="mt-2 text-sm text-mute">Ordering closes {hk.format(open.closesAt)} Hong Kong time.</p>
              <p className="mt-4 text-sm text-ivory">
                {Number(mine[0]?.n) ? `You have ${Number(mine[0].n)} order${Number(mine[0].n) === 1 ? '' : 's'} in this draw${Number(mine[0].pending) ? `, ${Number(mine[0].pending)} waiting for approval` : ''}.` : 'You have no orders in this draw yet.'}
              </p>
            </>
          ) : (
            <p className="mt-3 text-mute">Ordering is closed until the next draw is announced.</p>
          )}
          <div className="mt-auto pt-5">
            <Link href="/picker" className={buttonVariants({ variant: open ? 'gold' : 'outline' })}><Ticket aria-hidden className="h-4 w-4" />Pick numbers</Link>
          </div>
        </section>
      </div>

      {badges.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Badges">
          {badges.map((b) => <li key={b} className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold-bright">{b}</li>)}
        </ul>
      ) : null}

      <section aria-labelledby="recent-orders">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent-orders" className="font-serif text-2xl">My orders</h2>
          <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-gold-bright underline-offset-4 hover:underline">All orders<ArrowRight aria-hidden className="h-4 w-4" /></Link>
        </div>
        {orders.length === 0 ? (
          <div className="surface p-6 text-center">
            <p className="text-ivory">No orders yet.</p>
            <p className="mt-1 text-sm text-mute">Choose six numbers and submit your first order. It takes a minute.</p>
            <Link href="/picker" className={`${buttonVariants()} mt-4`}>Pick numbers</Link>
          </div>
        ) : (
          <div className="space-y-4">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div>
        )}
      </section>

      <section aria-labelledby="recent-points">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent-points" className="font-serif text-2xl">Recent points</h2>
          <Link href="/account/points" className="inline-flex items-center gap-1 text-sm text-gold-bright underline-offset-4 hover:underline">Full history<ArrowRight aria-hidden className="h-4 w-4" /></Link>
        </div>
        {log.length === 0 ? (
          <p className="text-mute">Nothing yet.</p>
        ) : (
          <ul className="surface divide-y divide-line/40 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-mute">{l.reason}</span>
                <span className={`font-mono tabular-nums ${l.delta > 0 ? 'text-win' : 'text-ivory'}`}>{l.delta > 0 ? '+' : ''}{l.delta.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
