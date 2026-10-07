import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { toggleDrawStatusAction } from '@/actions/admin';
import { Button, buttonVariants } from '@/components/ui/button';
import { getDrawChecklist, getDrawFull } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Edit draw' };

export default async function EditDrawPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('content');
  const id = parseInt((await params).id, 10);
  const found = Number.isInteger(id) ? await getDrawFull(id) : null;
  if (!found) notFound();
  const c = await getDrawChecklist(found.draw.drawNo);
  const published = found.draw.status === 'published';
  const steps: [boolean, string][] = [
    [true, 'Draw announced'],
    [published ? true : false, `Orders: ${c.orders} orders, ${c.tickets} tickets, ${c.points} points (check them under Orders for this draw)`],
    [published && found.draw.numbers.length === 6, 'Winning numbers and extra entered'],
    [published, c.waiting ? `Set the status to Published and save: ${c.waiting} tickets will be paid in points automatically` : 'Published: points for every ticket have been paid'],
  ];
  return (
    <>
      <PageHeader title={`Edit draw ${found.draw.drawNo}`}>
        <Link href={`/admin/orders?draw=${found.draw.drawNo}`} className={buttonVariants({ variant: 'outline' })}>Orders for this draw</Link>
      </PageHeader>
      {published ? (
        <form action={toggleDrawStatusAction} className="mb-4">
          <input type="hidden" name="id" value={found.draw.id} />
          <Button type="submit" variant="outline">Undo payout and unpublish</Button>
          <span className="ml-3 text-sm text-mute">Takes back the points paid for this draw. Publish again to pay with a corrected result.</span>
        </form>
      ) : null}
      <ol className="mb-6 space-y-1 rounded-2xl border border-line p-4 text-sm" aria-label="Draw checklist">
        {steps.map(([done, text]) => (
          <li key={text} className={done ? 'text-win' : 'text-mute'}>{done ? '✓' : '○'} {text}</li>
        ))}
      </ol>
      <DrawForm draw={found.draw} prizes={found.prizes} />
    </>
  );
}
