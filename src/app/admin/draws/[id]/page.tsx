import { notFound } from 'next/navigation';
import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { getDrawFull } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Edit draw' };

export default async function EditDrawPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('content');
  const id = parseInt((await params).id, 10);
  const found = Number.isInteger(id) ? await getDrawFull(id) : null;
  if (!found) notFound();
  return (
    <>
      <PageHeader title={`Edit draw ${found.draw.drawNo}`} />
      <DrawForm draw={found.draw} prizes={found.prizes} />
    </>
  );
}
