import { setRoleAction } from '@/actions/admin';
import { AdminTable, Notice, PageHeader, inputClass } from '@/components/admin/ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { listUsers } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/perms';
import Link from 'next/link';

export const metadata = { title: 'Users' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; error?: string }> }) {
  const me = await requireRole('manage');
  const { q = '', ok, error } = await searchParams;
  const users = await listUsers(q.trim());

  return (
    <>
      <PageHeader title="Users" description="Roles: viewer can look but not change anything. Editor can edit draws, events, FAQs and SEO. Admin can also manage users, currencies and settings.">
        <Link href={`/admin/users/export${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={buttonVariants({ variant: 'outline' })}>Export CSV</Link>
      </PageHeader>
      <Notice ok={ok} error={error} />

      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} type="search" placeholder="Search by email" aria-label="Search users" className={inputClass} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <AdminTable
        caption="Users"
        head={['Email', 'Role', 'Joined', 'Last login', 'Saved sets', 'Currency']}
        empty={users.length === 0 ? <p className="p-6 text-sm text-mute">No users match.</p> : null}
      >
        {users.map((u) => (
          <tr key={u.id} className="align-middle">
            <th scope="row" className="max-w-[16rem] truncate px-4 py-3 font-medium">{u.email}{u.id === me.id ? <span className="ml-2 text-xs text-gold-bright">(you)</span> : null}</th>
            <td className="px-4 py-3">
              {u.id === me.id ? (
                <span className="text-mute">{u.role}</span>
              ) : (
                <form action={setRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} aria-label={`Role for ${u.email}`} className={`${inputClass} h-9 w-28`}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                </form>
              )}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{u.createdAt.slice(0, 10)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{u.lastLogin ? u.lastLogin.slice(0, 16) : 'Never'}</td>
            <td className="px-4 py-3 font-mono tabular-nums">{u.picks}</td>
            <td className="px-4 py-3 font-mono text-mute">{u.currency}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
