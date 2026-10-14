import type { RowDataPacket } from 'mysql2/promise';
import Link from 'next/link';
import { AdminTable, PageHeader } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata = { title: 'Transfers' };
export const dynamic = 'force-dynamic';

type Row = RowDataPacket & { id: number; amount: number; created_at: string; from_id: number; from_email: string | null; to_id: number; to_email: string | null };

export default async function TransfersPage() {
  await requireRole('manage');
  const rows = await query<Row>(
    `SELECT t.id, t.amount, t.created_at, t.from_user AS from_id, f.email AS from_email, t.to_user AS to_id, r.email AS to_email
       FROM transfers t LEFT JOIN users f ON f.id = t.from_user LEFT JOIN users r ON r.id = t.to_user ORDER BY t.id DESC LIMIT 200`,
  );
  const who = (id: number, email: string | null) => <Link href={`/admin/users/${id}`} className="hover:text-gold-bright">{email ?? `user ${id}`}</Link>;
  return (
    <>
      <PageHeader title="Transfers" description="Points members sent to each other, newest first. Look for many small transfers into one account. Switch sending off in Settings if you see abuse." />
      {rows.length === 0 ? (
        <p className="text-mute">No transfers yet.</p>
      ) : (
        <AdminTable caption="Recent transfers" head={['When', 'From', 'To', 'Points']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-3 text-mute">{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
              <td className="max-w-[14rem] truncate px-4 py-3">{who(r.from_id, r.from_email)}</td>
              <td className="max-w-[14rem] truncate px-4 py-3">{who(r.to_id, r.to_email)}</td>
              <td className="px-4 py-3 font-mono tabular-nums">{Number(r.amount).toLocaleString('en-US')}</td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
