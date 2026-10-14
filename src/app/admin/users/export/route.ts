import { listUsers } from '@/lib/admin-data';
import { audit } from '@/lib/audit';
import { requireRole } from '@/lib/auth';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const me = await requireRole('manage');
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const users = await listUsers(q, 10_000);
  await audit(me.id, 'export.users', `users csv, ${users.length} rows${q ? `, filter ${q.slice(0, 40)}` : ''}`);
  const csv = toCsv([
    ['email', 'role', 'currency', 'signed_up', 'last_login', 'saved_sets'],
    ...users.map((u) => [u.email, u.role, u.currency, u.createdAt, u.lastLogin ?? '', u.picks]),
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
