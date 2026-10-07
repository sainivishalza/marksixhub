import { notFound } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { AdminTable, PageHeader, Panel } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata = { title: 'User' };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('manage');
  const id = parseInt((await params).id, 10);
  const [user] = Number.isInteger(id) ? await query<RowDataPacket & { email: string; points: number; created_at: string; last_login_at: string | null }>('SELECT email, points, created_at, last_login_at FROM users WHERE id=?', [id]) : [];
  if (!user) notFound();
  const [log, orders] = await Promise.all([
    query<RowDataPacket & { id: number; delta: number; reason: string; created_at: string }>('SELECT id, delta, reason, created_at FROM point_log WHERE user_id=? ORDER BY id DESC LIMIT 100', [id]),
    query<RowDataPacket & { id: number; draw_no: string; tickets: number; points: number; refunded: number; created_at: string }>('SELECT id, draw_no, tickets, points, refunded, created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 50', [id]),
  ]);
  return (
    <>
      <PageHeader title={user.email} description={`Joined ${String(user.created_at).slice(0, 10)}. Last login ${user.last_login_at ? String(user.last_login_at).slice(0, 16) : 'never'}.`} />
      <Panel className="mb-6">
        <p className="text-sm text-mute">Points balance</p>
        <p className="font-mono text-3xl tabular-nums text-gold-bright">{Number(user.points)}</p>
      </Panel>
      <h2 className="mb-2 text-xl">Orders</h2>
      <AdminTable caption="Orders" head={['Order', 'Draw', 'Tickets', 'Points', 'Placed (UTC)', '']} empty={orders.length === 0 ? <p className="p-6 text-sm text-mute">No orders.</p> : null}>
        {orders.map((o) => (
          <tr key={o.id}>
            <th scope="row" className="px-4 py-3 font-mono">#{o.id}</th>
            <td className="px-4 py-3 font-mono">{o.draw_no}</td>
            <td className="px-4 py-3 font-mono">{o.tickets}</td>
            <td className="px-4 py-3 font-mono">{o.points}</td>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{String(o.created_at).slice(0, 16)}</td>
            <td className="px-4 py-3 text-mute">{o.refunded ? 'Refunded' : ''}</td>
          </tr>
        ))}
      </AdminTable>
      <h2 className="mb-2 mt-8 text-xl">Points history</h2>
      <AdminTable caption="Points history" head={['Time (UTC)', 'Change', 'Reason']} empty={log.length === 0 ? <p className="p-6 text-sm text-mute">No points activity.</p> : null}>
        {log.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{String(l.created_at).slice(0, 16)}</td>
            <td className={`px-4 py-3 font-mono tabular-nums ${l.delta > 0 ? 'text-win' : 'text-miss'}`}>{l.delta > 0 ? '+' : ''}{l.delta}</td>
            <td className="px-4 py-3 text-mute">{l.reason}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
