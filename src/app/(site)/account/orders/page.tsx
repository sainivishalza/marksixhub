import type { Metadata } from 'next';
import Link from 'next/link';
import { deleteSetAction } from '@/actions/account';
import { OrderCard } from '@/components/account/order-card';
import { BallRow } from '@/components/ball';
import { Button, buttonVariants } from '@/components/ui/button';
import { getOrders, type OrderFilter } from '@/lib/account-data';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { parseNumbers } from '@/lib/mark6';
import { cn } from '@/lib/utils';
import type { RowDataPacket } from 'mysql2/promise';

export const metadata: Metadata = { title: 'My orders', robots: { index: false, follow: false } };

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'results', label: 'Results in' },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser('/account/orders');
  const { show } = await searchParams;
  const filter: OrderFilter = show === 'waiting' || show === 'results' ? show : 'all';
  const orders = await getOrders(user.id, { filter, limit: 100 });
  const old = filter === 'all'
    ? await query<RowDataPacket & { id: number; nums: string; settled: number }>('SELECT id, nums, settled FROM saved_sets WHERE user_id=? AND order_id IS NULL ORDER BY id DESC', [user.id])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">My orders</h1>
        <p className="mt-1 text-mute">Every entry you submitted, newest first. Winning numbers are highlighted once the result is in.</p>
      </div>

      <nav aria-label="Filter orders" className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'all' ? '/account/orders' : `/account/orders?show=${f.id}`}
            aria-current={filter === f.id ? 'true' : undefined}
            className={cn('rounded-full border px-4 py-1.5 text-sm transition-colors', filter === f.id ? 'border-gold bg-gold text-night' : 'border-line text-mute hover:text-ivory')}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-ivory">{filter === 'all' ? 'No orders yet.' : 'Nothing here right now.'}</p>
          <p className="mt-1 text-sm text-mute">{filter === 'all' ? 'Choose six numbers and submit your first order.' : 'Orders show up here as they move along.'}</p>
          <Link href="/picker" className={`${buttonVariants()} mt-4`}>Pick numbers</Link>
        </div>
      ) : (
        <div className="space-y-4">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div>
      )}

      {old.length ? (
        <section aria-labelledby="old">
          <h2 id="old" className="mb-3 font-serif text-2xl">Earlier saved numbers</h2>
          <ul className="surface divide-y divide-line/40">
            {old.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <BallRow numbers={parseNumbers(s.nums)} size="sm" />
                {s.settled ? (
                  <form action={deleteSetAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={`Delete saved set ${s.nums}`}>Delete</Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
