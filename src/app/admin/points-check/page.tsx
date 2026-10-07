import type { RowDataPacket } from 'mysql2/promise';
import { AdminTable, PageHeader } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import Link from 'next/link';

export const metadata = { title: 'Points check' };

export default async function PointsCheckPage() {
  await requireRole('manage');
  const rows = await query<RowDataPacket & { id: number; email: string; points: number; ledger: number }>(
    `SELECT * FROM (
       SELECT u.id, u.email, u.points, COALESCE(SUM(l.delta), 0) AS ledger
         FROM users u LEFT JOIN point_log l ON l.user_id = u.id GROUP BY u.id
     ) t WHERE points <> ledger ORDER BY ABS(points - ledger) DESC LIMIT 200`,
  );
  const [{ n }] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM users');
  return (
    <>
      <PageHeader title="Points check" description="Compares every balance with the sum of that user's points history. They should always match." />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-win/40 bg-win/10 px-4 py-3 text-win">All {Number(n)} balances match their history.</p>
      ) : (
        <AdminTable caption="Balances that do not match" head={['User', 'Balance', 'History total', 'Difference']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="max-w-[16rem] truncate px-4 py-3 font-medium"><Link href={`/admin/users/${r.id}`} className="hover:text-gold-bright">{r.email}</Link></th>
              <td className="px-4 py-3 font-mono tabular-nums">{Number(r.points)}</td>
              <td className="px-4 py-3 font-mono tabular-nums">{Number(r.ledger)}</td>
              <td className="px-4 py-3 font-mono tabular-nums text-miss">{Number(r.points) - Number(r.ledger)}</td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
