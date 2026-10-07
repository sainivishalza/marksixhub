import Link from 'next/link';
import { NumberBall } from '@/components/ball';
import { AdminTable, PageHeader, Panel, inputClass } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { getDrawOrders, listDrawNos } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { ALL_BALLS, parseNumbers } from '@/lib/mark6';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ draw?: string }> }) {
  await requireRole('view');
  const draws = await listDrawNos();
  const { draw: wanted } = await searchParams;
  const current = draws.find((d) => d.drawNo === wanted) ?? draws.find((d) => d.status === 'upcoming') ?? draws[0];
  const { orders, freq, ticketCount } = current ? await getDrawOrders(current.drawNo) : { orders: [], freq: [] as number[], ticketCount: 0 };
  const winning = current?.nums ? parseNumbers(current.nums) : [];
  const max = Math.max(1, ...freq.slice(1));
  const points = orders.reduce((a, o) => a + o.points, 0);

  return (
    <>
      <PageHeader title="Orders" description="Everything users placed with free points, by draw: who picked what, and how often each number was picked.">
        <form className="flex gap-2">
          <select name="draw" defaultValue={current?.drawNo} aria-label="Draw" className={`${inputClass} w-48`}>
            {draws.map((d) => <option key={d.drawNo} value={d.drawNo}>{d.drawNo} ({d.status})</option>)}
          </select>
          <Button type="submit" variant="outline">Show</Button>
        </form>
      </PageHeader>

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
            head={['Order', 'User', 'Placed (UTC)', 'Points', 'Numbers']}
            empty={orders.length === 0 ? <p className="p-6 text-sm text-mute">No orders for this draw yet.</p> : null}
          >
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <th scope="row" className="px-4 py-3 font-mono">#{o.id}</th>
                <td className="max-w-[14rem] truncate px-4 py-3">{o.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-mute">{o.createdAt.slice(0, 16)}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{o.points}</td>
                <td className="px-4 py-3">
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
              </tr>
            ))}
          </AdminTable>
        </>
      )}
    </>
  );
}
