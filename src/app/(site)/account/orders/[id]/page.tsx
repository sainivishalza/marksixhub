import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { BallRow } from '@/components/ball';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { parseNumbers } from '@/lib/mark6';

export const metadata: Metadata = { title: 'Order receipt', robots: { index: false, follow: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  const user = await requireUser(`/account/orders/${id}`);
  const [order] = Number.isInteger(id)
    ? await query<RowDataPacket & { draw_no: string; tickets: number; points: number; refunded: number; status: string; created_at: string }>('SELECT draw_no, tickets, points, refunded, status, created_at FROM orders WHERE id=? AND user_id=?', [id, user.id])
    : [];
  if (!order) notFound();
  const sets = await query<RowDataPacket & { nums: string; units: number; settled: number; won_points: number }>('SELECT nums, units, settled, won_points FROM saved_sets WHERE order_id=? AND user_id=? ORDER BY id', [id, user.id]);
  const again = sets.map((s) => s.nums).join('|');
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl">Order #{id}</h1>
      <p className="mt-2 text-mute">
        Draw {order.draw_no}. Placed {String(order.created_at).slice(0, 16)} UTC. {order.tickets} ticket{order.tickets === 1 ? '' : 's'}, {order.points} points.
      </p>
      <p className="mt-3 text-sm">
        Status:{' '}
        <strong className={order.status === 'pending' ? 'text-gold-bright' : order.status === 'accepted' ? 'text-win' : 'text-mute'}>
          {order.status === 'pending' ? 'Pending, waiting for admin approval' : order.status === 'accepted' ? 'Accepted, waiting for the result' : order.status === 'rejected' ? 'Rejected, points returned' : 'Refunded, points returned'}
        </strong>
      </p>
      <ul className="mt-6 divide-y divide-line/50 rounded-2xl border border-line">
        {sets.map((s, i) => (
          <li key={i} className="p-4">
            <BallRow numbers={parseNumbers(s.nums)} size="sm" />
            <p className="mt-2 text-xs text-mute">
              {s.units > 1 ? `Multiple entry, ${s.units} tickets. ` : ''}
              {s.settled ? (s.won_points ? `Won ${s.won_points} points.` : 'No prize.') : 'Result pending.'}
            </p>
          </li>
        ))}
        {sets.length === 0 ? <li className="p-4 text-sm text-mute">No tickets left on this order.</li> : null}
      </ul>
      <p className="mt-6 flex flex-wrap gap-4 text-sm">
        {sets.length ? <Link href={`/picker?t=${again}`} className="text-gold-bright underline-offset-4 hover:underline">Play these again</Link> : null}
        <Link href="/account" className="text-gold-bright underline-offset-4 hover:underline">Back to My account</Link>
      </p>
    </div>
  );
}
