import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { PageHeader, Panel } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { can } from '@/lib/perms';

export const metadata = { title: 'Search' };

const like = (q: string) => `%${q.replace(/[%_\\]/g, '\\$&')}%`;

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireRole('view');
  const q = ((await searchParams).q ?? '').trim().slice(0, 100);
    const [draws, users, orders] = q
    ? await Promise.all([
        query<RowDataPacket & { id: number; draw_no: string; status: string }>('SELECT id, draw_no, status FROM draws WHERE draw_no LIKE ? ORDER BY draw_date DESC LIMIT 10', [like(q)]),
        can(me.role, 'support') ? query<RowDataPacket & { id: number; email: string }>('SELECT id, email FROM users WHERE email LIKE ? ORDER BY id DESC LIMIT 10', [like(q)]) : Promise.resolve([]),
        /^\d{4,20}$/.test(q) ? query<RowDataPacket & { id: number; order_no: string | null; draw_no: string; email: string }>('SELECT o.id, o.order_no, o.draw_no, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.order_no=?', [q]) : Promise.resolve([]),
      ])
    : [[], [], []];
  const none = q && !draws.length && !users.length && !orders.length;
  return (
    <>
      <PageHeader title="Search" description={q ? `Results for "${q}"` : 'Type in the box above: a draw number, an email address or an order number.'} />
      {none ? <p className="text-mute">Nothing found.</p> : null}
      {draws.length ? (
        <Panel title="Draws" className="mb-4">
          <ul className="space-y-2 text-sm">
            {draws.map((d) => (
              <li key={d.id} className="flex flex-wrap gap-3">
                <span className="font-mono">{d.draw_no}</span> <span className="text-mute">{d.status}</span>
                <Link href={`/admin/orders?draw=${encodeURIComponent(d.draw_no)}`} className="text-gold-bright underline-offset-4 hover:underline">Orders</Link>
                {can(me.role, 'content') ? <Link href={`/admin/draws/${d.id}`} className="text-gold-bright underline-offset-4 hover:underline">Edit</Link> : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {users.length ? (
        <Panel title="Users" className="mb-4">
          <ul className="space-y-2 text-sm">
            {users.map((u) => <li key={u.id}><Link href={`/admin/users/${u.id}`} className="text-gold-bright underline-offset-4 hover:underline">{u.email}</Link></li>)}
          </ul>
        </Panel>
      ) : null}
      {orders.length ? (
        <Panel title="Orders" className="mb-4">
          <ul className="space-y-2 text-sm">
            {orders.map((o) => <li key={o.id}>Order {o.order_no ?? `#${o.id}`}, draw {o.draw_no}, {o.email}. <Link href={`/admin/orders?draw=${encodeURIComponent(o.draw_no)}`} className="text-gold-bright underline-offset-4 hover:underline">Open</Link></li>)}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
