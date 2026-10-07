import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Add draw' };

export default async function NewDrawPage() {
  await requireRole('content');
  return (
    <>
      <PageHeader title="Add draw" description="Create an upcoming draw with an estimated prize, or publish a result with its winning numbers and prizes." />
      <DrawForm />
    </>
  );
}
