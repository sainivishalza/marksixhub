import { AdminTable, PageHeader } from '@/components/admin/ui';
import { listAudit } from '@/lib/audit';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Audit log' };

export default async function AuditPage() {
  await requireRole('manage');
  const rows = await listAudit();
  return (
    <>
      <PageHeader title="Audit log" description="Who did what in the admin area. The latest 200 actions." />
      <AdminTable caption="Audit log" head={['Time (UTC)', 'Who', 'Action', 'Detail']} empty={rows.length === 0 ? <p className="p-6 text-sm text-mute">Nothing recorded yet.</p> : null}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{r.createdAt.slice(0, 19)}</td>
            <td className="max-w-[14rem] truncate px-4 py-3">{r.email ?? 'unknown'}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
            <td className="px-4 py-3 text-mute">{r.detail}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
