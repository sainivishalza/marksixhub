import Link from 'next/link';
import type { ReactNode } from 'react';
import { deleteDrawAction, toggleDrawStatusAction } from '@/actions/admin';
import { AdminTable } from '@/components/admin/ui';
import { BallRow } from '@/components/ball';
import { Button, buttonVariants } from '@/components/ui/button';
import { dateLabel, money } from '@/lib/format';
import type { Draw } from '@/lib/types';
import { cn } from '@/lib/utils';

const touch = 'max-md:h-11 max-md:w-full';

function StatusChip({ d }: { d: Draw }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs', d.status === 'published' ? 'bg-win/15 text-win' : 'bg-raised text-mute')}>
      {d.status === 'published' ? 'Published' : 'Draft'}
    </span>
  );
}

/** Edit, publish and delete. Three big buttons on a phone; the delete button opens its confirmation in place. */
function DrawActions({ d }: { d: Draw }) {
  return (
    <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-center">
      <Link href={`/admin/draws/${d.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), touch)}>Edit</Link>
      <form action={toggleDrawStatusAction}>
        <input type="hidden" name="id" value={d.id} />
        <Button type="submit" variant="outline" size="sm" className={cn(touch, 'md:border-transparent md:text-mute')}>{d.status === 'published' ? 'Unpublish' : 'Publish'}</Button>
      </form>
      <details className="group open:col-span-3">
        <summary className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), touch, 'cursor-pointer list-none border-miss/40 text-miss group-open:hidden md:border-transparent [&::-webkit-details-marker]:hidden')}>Delete</summary>
        <form action={deleteDrawAction} className="flex flex-wrap items-center gap-3 rounded-xl border border-miss/40 bg-miss/5 p-3">
          <input type="hidden" name="id" value={d.id} />
          <p className="min-w-0 flex-1 text-sm text-mute">Delete draw {d.drawNo} and its prizes for good?</p>
          <Button type="submit" size="sm" className="bg-miss text-white hover:bg-miss/80 max-md:h-11">Yes, delete</Button>
        </form>
      </details>
    </div>
  );
}

/** The draws: a card per draw on phones, a table from md up. */
export function DrawList({ draws, canEdit, none }: { draws: Draw[]; canEdit: boolean; none: ReactNode }) {
  return (
    <>
      {/* Phones: one card per draw. */}
      <ul className="space-y-3 md:hidden" aria-label="Draws">
        {draws.length === 0 ? <li>{none}</li> : null}
        {draws.map((d) => (
          <li key={d.id} className="rounded-2xl border border-line bg-panel/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-semibold text-gold-bright">{d.drawNo}</p>
                <p className="text-sm text-mute">{dateLabel(d.drawDate)}</p>
              </div>
              <StatusChip d={d} />
            </div>
            <div className="mt-3">
              {d.status === 'published' ? <BallRow numbers={d.numbers} extra={d.extra} size="sm" /> : <p className="text-sm text-mute">Not drawn yet</p>}
            </div>
            {d.estJackpotHkd ? (
              <p className="mt-3 text-sm text-mute">
                Estimated first prize <span className="font-mono text-ivory">{money(d.estJackpotHkd)}</span>
              </p>
            ) : null}
            {canEdit ? (
              <div className="mt-4 border-t border-line/50 pt-3">
                <DrawActions d={d} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Larger screens: the table. */}
      <div className="hidden md:block">
        <AdminTable
          caption="Draws"
          head={['Draw', 'Date', 'Winning numbers and extra', 'Est. first prize', 'Status', canEdit ? 'Actions' : '']}
          empty={draws.length === 0 ? <div className="p-4">{none}</div> : null}
        >
          {draws.map((d) => (
            <tr key={d.id} className="align-middle">
              <th scope="row" className="px-4 py-3 font-mono font-medium">{d.drawNo}</th>
              <td className="whitespace-nowrap px-4 py-3 text-mute">{dateLabel(d.drawDate)}</td>
              <td className="px-4 py-3">{d.status === 'published' ? <BallRow numbers={d.numbers} extra={d.extra} size="sm" /> : <span className="text-mute">Not drawn yet</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-mute">{d.estJackpotHkd ? money(d.estJackpotHkd) : '-'}</td>
              <td className="px-4 py-3"><StatusChip d={d} /></td>
              <td className="px-4 py-3">{canEdit ? <DrawActions d={d} /> : null}</td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
