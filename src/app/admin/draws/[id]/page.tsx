import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { toggleDrawStatusAction } from '@/actions/admin';
import { Button, buttonVariants } from '@/components/ui/button';
import { getDrawChecklist, getDrawFull, previewPayout } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { parseNumbers } from '@/lib/mark6';

export const metadata = { title: 'Edit draw' };

export default async function EditDrawPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pn?: string; px?: string }> }) {
  await requireRole('content');
  const id = parseInt((await params).id, 10);
  const found = Number.isInteger(id) ? await getDrawFull(id) : null;
  if (!found) notFound();
  const { pn = '', px = '' } = await searchParams;
  const c = await getDrawChecklist(found.draw.drawNo);
  const previewNums = parseNumbers(pn);
  const previewExtra = parseInt(px, 10);
  const preview = previewNums.length === 6 && previewExtra >= 1 && previewExtra <= 49 && !previewNums.includes(previewExtra) ? await previewPayout(found.draw.drawNo, previewNums, previewExtra) : null;
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
      {!published ? (
        <form className="mb-6 rounded-2xl border border-line p-4" aria-label="Preview payout">
          <p className="mb-2 text-sm text-mute">Preview the payout before you publish: type the six winning numbers and the extra, and see how many tickets win and how many points would be paid.</p>
          <div className="flex flex-wrap items-end gap-2">
            <input name="pn" defaultValue={pn} placeholder="3 12 25 31 40 49" aria-label="Six winning numbers" className="h-10 w-56 rounded-lg border border-line bg-night px-3 text-sm text-ivory" />
            <input name="px" defaultValue={px} placeholder="Extra" aria-label="Extra number" className="h-10 w-24 rounded-lg border border-line bg-night px-3 text-sm text-ivory" />
            <Button type="submit" variant="outline">Preview</Button>
          </div>
          {pn && !preview ? <p className="mt-2 text-sm text-miss">Enter 6 different numbers and a different extra number, all from 1 to 49.</p> : null}
          {preview ? (
            <div className="mt-3 text-sm">
              <p className="text-ivory">{preview.totalPoints} points would be paid across {preview.winningTickets} winning ticket{preview.winningTickets === 1 ? '' : 's'} (of {preview.tickets}).</p>
              <ul className="mt-1 text-mute">
                {preview.byDivision.map((n, i) => (n ? <li key={i}>Division {i + 1}: {n} ticket{n === 1 ? '' : 's'}</li> : null))}
              </ul>
            </div>
          ) : null}
        </form>
      ) : null}
      <DrawForm draw={found.draw} prizes={found.prizes} />
    </>
  );
}
