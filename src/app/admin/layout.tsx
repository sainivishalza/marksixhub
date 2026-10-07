import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';
import { requireRole } from '@/lib/auth';

// Admin pages depend on who is signed in, so they must never be prerendered.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('view');
  return <AdminShell user={{ email: user.email, role: user.role }}>{children}</AdminShell>;
}
