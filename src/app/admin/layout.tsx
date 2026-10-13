import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';
import { countPendingOrders } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

// Admin pages depend on who is signed in, so they must never be prerendered.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('view');
  const pending = await countPendingOrders().catch(() => 0);
  return <AdminShell user={{ email: user.email, role: user.role }} pending={pending}>{children}</AdminShell>;
}
