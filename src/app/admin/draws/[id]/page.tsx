import { notFound } from 'next/navigation';
import { DrawForm } from '@/components/admin/draw-form';
import { PageHeader } from '@/components/admin/ui';
import { BallRow } from '@/components/ball';
import { evaluate, parseNumbers, DIVISION_LABEL } from '@/lib/mark6';
import { getDrawFull, listDrawTickets } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Edit draw' };

export default async function EditDrawPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('content');
  const id = parseInt((await params).id, 10);
  const found = Number.isInteger(id) ? await getDrawFull(id) : null;
  if (!found) notFound();
  const tickets = await listDrawTickets(found.draw.drawNo);
  const { numbers, extra } = found.draw;
  return (
    <>
      <PageHeader title={`Edit draw ${found.draw.drawNo}`} />
      <DrawForm draw={found.draw} prizes={found.prizes} />
      <h2 className="mb-3 mt-10 text-xl">Saved tickets for this draw ({tickets.length})</h2>
      {tickets.length === 0 ? (
        <p className="text-mute">No one has saved numbers for this draw.</p>
      ) : (
        <ul className="divide-y divide-line/50 rounded-2xl border border-line">
          {tickets.map((t) => {
            const n = parseNumbers(t.nums);
            const ev = numbers.length === 6 ? evaluate(n, numbers, extra) : null;
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <span className="text-sm">{t.email}</span>
                <BallRow numbers={n} size="sm" />
                <span className="text-xs text-mute">{ev ? (ev.division ? `${DIVISION_LABEL[ev.division - 1]} prize` : `${ev.matches} match${ev.matches === 1 ? '' : 'es'}`) : 'pending'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
