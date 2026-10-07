import Link from 'next/link';
import { NumberBall } from '@/components/ball';
import { approveAllAction, approveOrderAction, refundOrderAction } from '@/actions/admin';
import { AdminTable, Notice, PageHeader, Panel, inputClass } from '@/components/admin/ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { getDrawOrders, listDrawNos } from '@/lib/admin-data';
import { can } from '@/lib/perms';
import { requireRole } from '@/lib/auth';
import { ALL_BALLS, parseNumbers } from '@/lib/mark6';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ draw?: string; ok?: string; error?: string }> }) {
  const me = await requireRole('view');
  const draws = await listDrawNos();
  const { draw: wanted, ok, error } = await searchParams;
  const current = draws.find((d) => d.drawNo === wanted) ?? draws.find((d) => d.status === 'upcoming') ?? draws[0];
  const { orders, freq, ticketCount } = current ? await getDrawOrders(current.drawNo) : { orders: [], freq: [] as number[], ticketCount: 0 };
  const winning = current?.nums ? parseNumbers(current.nums) : [];
  const max = Math.max(1, ...freq.slice(1));
  const points = orders.filter((o) => !o.refunded).reduce((a, o) => a + o.points, 0);
  const pending = orders.filter((o) => o.status === 'pending').length;
  const canAct = can(me.role, 'support') && current?.status === 'upcoming';

  return (
    <>
      <PageHeader title="Orders" description="Everything users placed with free points, by draw: who picked what, and how often each number was picked.">
        <form className="flex gap-2">
          <select name="draw" defaultValue={current?.drawNo} aria-label="Draw" className={`${inputClass} w-48`}>
            {draws.map((d) => <option key={d.drawNo} value={d.drawNo}>{d.drawNo} ({d.status})</option>)}
          </select>
          <Button type="submit" variant="outline">Show</Button>
        </form>
        {current ? <Link href={`/admin/orders/export?draw=${encodeURIComponent(current.drawNo)}`} className={buttonVariants({ variant: 'outline' })}>Export CSV</Link> : null}
      </PageHeader>

      <Notice ok={ok} error={error} />
      {pending ? (
        <form action={approveAllAction} className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/40 p-4">
          <p className="text-sm text-ivory">{pending} order{pending === 1 ? ' is' : 's are'} waiting for approval. Buyers see them as Pending until you accept.</p>
          {canAct && current ? (
            <>
              <input type="hidden" name="draw" value={current.drawNo} />
              <Button type="submit" size="sm">Approve all {pending}</Button>
            </>
          ) : null}
        </form>
      ) : null}
      {!current ? (
        <p className="text-mute">No draws yet.</p>
      ) : (
        <>
          <Panel title={`Draw ${current.drawNo}`} className="mb-6">
            <p className="text-sm text-mute">
              {current.status === 'published' && winning.length ? (
                <span className="mr-3 inline-flex items-center gap-1 align-middle">
                  Winning numbers {winning.map((n) => <NumberBall key={n} n={n} size="sm" />)}
                  {current.extra ? <NumberBall n={current.extra} size="sm" extra /> : null}
                </span>
              ) : (
                'Result not published yet. '
              )}
              <span className="font-mono text-ivory">{orders.length}</span> orders, <span className="font-mono text-ivory">{ticketCount}</span> tickets, <span className="font-mono text-ivory">{points}</span> points spent.{' '}
              <Link href={`/admin/draws`} className="text-gold-bright underline-offset-4 hover:underline">Draws</Link>
            </p>
            <h3 className="mb-2 mt-5 text-sm text-mute">Times each number was picked</h3>
            <ol className="grid grid-cols-7 gap-1.5 sm:grid-cols-10" aria-label="Pick counts per number">
              {ALL_BALLS.map((n) => (
                <li key={n} className={cn('flex flex-col items-center rounded-lg border p-1', winning.includes(n) ? 'border-gold' : 'border-line/50')}>
                  <NumberBall n={n} size="sm" className={freq[n] === 0 ? 'opacity-30' : undefined} />
                  <span className="mt-1 font-mono text-xs tabular-nums" style={{ opacity: 0.4 + (0.6 * freq[n]) / max }}>{freq[n]}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <AdminTable
            caption={`Orders for draw ${current.drawNo}`}
            head={['Order', 'User', 'Placed (UTC)', 'Status', 'Points', 'Numbers', '']}
            empty={orders.length === 0 ? <p className="p-6 text-sm text-mute">No orders for this draw yet.</p> : null}
          >
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <th scope="row" className="px-4 py-3 font-mono">{o.orderNo}</th>
                <td className="max-w-[14rem] truncate px-4 py-3">{o.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-mute">{o.createdAt.slice(0, 16)}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs', o.status === 'pending' ? 'border-gold/60 text-gold-bright' : o.status === 'accepted' ? 'border-win/50 text-win' : 'border-line text-mute')}>{o.status}</span>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">{o.points}</td>
                <td className="px-4 py-3">
                  {o.refunded ? <p className="text-sm text-mute">{o.status === 'rejected' ? 'Rejected' : 'Refunded'}, {o.points} points returned.</p> : null}
                  <ul className="space-y-2">
                    {o.tickets.map((t, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-1.5">
                        {parseNumbers(t.nums).map((n) => <NumberBall key={n} n={n} size="sm" className={winning.length && !winning.includes(n) ? 'opacity-40' : undefined} />)}
                        {t.units > 1 ? <span className="text-xs text-mute">multiple, {t.units} tickets</span> : null}
                        {t.won !== null ? <span className={cn('text-xs', t.won ? 'text-win' : 'text-mute')}>{t.won ? `won ${t.won} pts` : 'no prize'}</span> : null}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  {canAct && !o.refunded ? (
                    <div className="flex flex-wrap gap-2">
                      {o.status === 'pending' ? (
                        <form action={approveOrderAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="draw" value={current.drawNo} />
                          <Button type="submit" size="sm">Approve</Button>
                        </form>
                      ) : null}
                      <form action={refundOrderAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="draw" value={current.drawNo} />
                        {o.status === 'pending' ? <input type="hidden" name="decision" value="reject" /> : null}
                        <Button type="submit" size="sm" variant="outline">{o.status === 'pending' ? 'Reject' : 'Refund'}</Button>
                      </form>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </AdminTable>
        </>
      )}
    </>
  );
}
