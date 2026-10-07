import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { buttonVariants } from '@/components/ui/button';
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
      <PageHeader title={`Edit draw ${found.draw.drawNo}`}>
        <Link href={`/admin/orders?draw=${found.draw.drawNo}`} className={buttonVariants({ variant: 'outline' })}>Orders for this draw</Link>
      </PageHeader>
      <DrawForm draw={found.draw} prizes={found.prizes} />
    </>
  );
}
