import { grantAllAction, grantPointsAction, setRoleAction } from '@/actions/admin';
import { AdminTable, Notice, PageHeader, inputClass } from '@/components/admin/ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { listUsers } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { can, ROLES } from '@/lib/perms';
import Link from 'next/link';

export const metadata = { title: 'Users' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; error?: string }> }) {
  const me = await requireRole('support');
  const canManage = can(me.role, 'manage');
  const { q = '', ok, error } = await searchParams;
  const users = await listUsers(q.trim());

  return (
    <>
      <PageHeader title="Users" description="Roles: viewer can look but not change anything. Support can look up users and refund orders. Editor can also edit draws, events, FAQs and SEO. Admin can also manage points, roles, currencies and settings.">
        {canManage ? <Link href={`/admin/users/export${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={buttonVariants({ variant: 'outline' })}>Export CSV</Link> : null}
      </PageHeader>
      <Notice ok={ok} error={error} />

      {canManage ? (
      <form action={grantAllAction} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line p-4">
        <label className="text-sm text-mute">Give every active user points
          <input name="amount" type="number" min={1} max={100000} required className={`${inputClass} mt-1 w-32`} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-mute"><input type="checkbox" name="confirm" /> I confirm this applies to all active users</label>
        <Button type="submit" variant="outline">Give points</Button>
      </form>
      ) : null}

      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} type="search" placeholder="Search by email" aria-label="Search users" className={inputClass} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <AdminTable
        caption="Users"
        head={['Email', 'Role', 'Joined', 'Last login', 'Saved sets', 'Points', 'Currency']}
        empty={users.length === 0 ? <p className="p-6 text-sm text-mute">No users match.</p> : null}
      >
        {users.map((u) => (
          <tr key={u.id} className="align-middle">
            <th scope="row" className="max-w-[16rem] truncate px-4 py-3 font-medium"><Link href={`/admin/users/${u.id}`} className="hover:text-gold-bright">{u.email}</Link>{u.id === me.id ? <span className="ml-2 text-xs text-gold-bright">(you)</span> : null}</th>
            <td className="px-4 py-3">
              {u.id === me.id || !canManage ? (
                <span className="text-mute">{u.role}</span>
              ) : (
                <form action={setRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} aria-label={`Role for ${u.email}`} className={`${inputClass} h-9 w-28`}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-mute"><input type="checkbox" name="confirm" /> Confirm admin</label>
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                </form>
              )}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{u.createdAt.slice(0, 10)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{u.lastLogin ? u.lastLogin.slice(0, 16) : 'Never'}</td>
            <td className="px-4 py-3 font-mono tabular-nums">{u.picks}</td>
            <td className="px-4 py-3">
              {canManage ? (
              <form action={grantPointsAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <span className="w-16 font-mono tabular-nums">{u.points}</span>
                <input name="amount" type="number" placeholder="+/-" aria-label={`Points to add or remove for ${u.email}`} className={`${inputClass} h-9 w-24`} />
                <Button type="submit" size="sm" variant="outline">Apply</Button>
              </form>
              ) : <span className="font-mono tabular-nums">{u.points}</span>}
            </td>
            <td className="px-4 py-3 font-mono text-mute">{u.currency}</td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
