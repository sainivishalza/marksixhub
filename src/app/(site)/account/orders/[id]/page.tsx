import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Clock, Download } from 'lucide-react';
import { OrderCard } from '@/components/account/order-card';
import { buttonVariants } from '@/components/ui/button';
import { getOrder } from '@/lib/account-data';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Order receipt', robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  const user = await requireUser(`/account/orders/${id}`);
  const order = Number.isInteger(id) ? await getOrder(user.id, id) : null;
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-mute hover:text-gold-bright"><ChevronLeft aria-hidden className="h-4 w-4" />All orders</Link>
        <h1 className="mt-2 text-3xl sm:text-4xl">Order No. {order.orderNo}</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <section aria-label="Receipt">
          {order.status === 'accepted' ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/account/orders/${order.id}/receipt`} alt={`Receipt for order ${order.orderNo}, draw ${order.drawNo}, ${order.tickets} ticket${order.tickets === 1 ? '' : 's'}, ${order.points} points`} className="w-full max-w-[420px] rounded-md bg-white shadow-panel" />
              <a href={`/account/orders/${order.id}/receipt?download=1`} className={`${buttonVariants({ size: 'md' })} mt-4 w-full max-w-[420px]`}>
                <Download aria-hidden className="h-4 w-4" />Download receipt (PNG)
              </a>
            </div>
          ) : order.status === 'pending' ? (
            <div className="rounded-2xl border border-gold/50 bg-gold/5 p-5">
              <p className="flex items-center gap-2 font-medium text-ivory"><Clock aria-hidden className="h-4 w-4 text-gold-bright" />Waiting for approval</p>
              <p className="mt-2 text-sm text-mute">
                Your numbers are waiting for the admin to accept them. Your receipt is issued here as soon as they do, and you can download it then. We also email you.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line p-5">
              <p className="font-medium text-ivory">No receipt for this order</p>
              <p className="mt-2 text-sm text-mute">Receipts are issued for accepted orders only. The points from this order are back in your balance.</p>
            </div>
          )}
        </section>

        <OrderCard order={order} detail />
      </div>
    </div>
  );
}
