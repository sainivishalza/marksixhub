import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { suggestNextDrawNo } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Add draw' };

export default async function NewDrawPage() {
  await requireRole('content');
  return (
    <>
      <PageHeader title="Add draw" description="Announce the next draw first. Add the winning numbers and prizes after it takes place." />
      <DrawForm suggestedNo={await suggestNextDrawNo()} />
    </>
  );
}
