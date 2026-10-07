import type { RowDataPacket } from 'mysql2/promise';
import { AdminTable, PageHeader } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata = { title: 'Failed logins' };

export default async function LoginsPage() {
  await requireRole('manage');
  const [rows, top] = await Promise.all([
    query<RowDataPacket & { id: number; email: string; ip: string; created_at: string }>('SELECT id, email, ip, created_at FROM login_fails ORDER BY id DESC LIMIT 100'),
    query<RowDataPacket & { email: string; n: number }>("SELECT email, COUNT(*) AS n FROM login_fails WHERE created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY GROUP BY email HAVING n >= 3 ORDER BY n DESC LIMIT 10"),
  ]);
  return (
    <>
      <PageHeader title="Failed logins" description="Wrong-password attempts. An account locks for 15 minutes after 5 failures. A successful login clears its failures." />
      {top.length ? (
        <p className="mb-4 rounded-lg border border-miss/40 bg-miss/10 px-4 py-2 text-sm text-miss">
          Repeated failures in the last 24 hours: {top.map((t) => `${t.email} (${Number(t.n)})`).join(', ')}
        </p>
      ) : null}
      <AdminTable caption="Failed logins" head={['Time (UTC)', 'Email tried', 'Address']} empty={rows.length === 0 ? <p className="p-6 text-sm text-mute">No failed logins recorded.</p> : null}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{String(r.created_at).slice(0, 19)}</td>
            <td className="max-w-[18rem] truncate px-4 py-3">{r.email}</td>
            <td className="px-4 py-3 font-mono text-xs text-mute">{r.ip}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
