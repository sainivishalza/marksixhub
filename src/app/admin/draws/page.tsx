import Link from 'next/link';
import { deleteDrawAction, toggleDrawStatusAction } from '@/actions/admin';
import { AdminTable, Notice, PageHeader, inputClass } from '@/components/admin/ui';
import { BallRow } from '@/components/ball';
import { Button, buttonVariants } from '@/components/ui/button';
import { listDraws } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { dateLabel, money } from '@/lib/format';
import { can } from '@/lib/perms';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Draws' };
const PER_PAGE = 25;

type Search = Promise<{ q?: string; page?: string; ok?: string; error?: string }>;

export default async function DrawsPage({ searchParams }: { searchParams: Search }) {
  const user = await requireRole('view');
  const canEdit = can(user.role, 'content');
  const { q = '', page: rawPage, ok, error } = await searchParams;
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const { draws, total } = await listDraws(q.trim(), page, PER_PAGE);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => `/admin/draws?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Draws" description="Enter results here. Published draws appear on the site straight away; drafts stay hidden.">
        {canEdit ? (
          <>
            <Link href="/admin/draws/import" className={buttonVariants({ variant: 'outline' })}>Import CSV</Link>
            <Link href="/admin/draws/history" className={buttonVariants({ variant: 'outline' })}>Import past results</Link>
            <Link href="/admin/draws/new" className={buttonVariants()}>Add draw</Link>
          </>
        ) : null}
      </PageHeader>
      <Notice ok={ok} error={error} />

      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Search by draw number or date" aria-label="Search draws" className={inputClass} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <AdminTable
        caption="Draws"
        head={['Draw', 'Date', 'Winning numbers and extra', 'Est. first prize', 'Status', canEdit ? 'Actions' : '']}
        empty={draws.length === 0 ? <p className="p-6 text-sm text-mute">{q ? 'No draws match that search.' : 'No draws yet. Add the first one.'}</p> : null}
      >
        {draws.map((d) => (
          <tr key={d.id} className="align-middle">
            <th scope="row" className="px-4 py-3 font-mono font-medium">{d.drawNo}</th>
            <td className="whitespace-nowrap px-4 py-3 text-mute">{dateLabel(d.drawDate)}</td>
            <td className="px-4 py-3">{d.status === 'published' ? <BallRow numbers={d.numbers} extra={d.extra} size="sm" /> : <span className="text-mute">Not drawn yet</span>}</td>
            <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-mute">{d.estJackpotHkd ? money(d.estJackpotHkd) : '-'}</td>
            <td className="px-4 py-3">
              <span className={cn('rounded-full px-2.5 py-1 text-xs', d.status === 'published' ? 'bg-win/15 text-win' : 'bg-raised text-mute')}>
                {d.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </td>
            <td className="px-4 py-3">
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/draws/${d.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Edit</Link>
                  <form action={toggleDrawStatusAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" variant="ghost" size="sm">{d.status === 'published' ? 'Unpublish' : 'Publish'}</Button>
                  </form>
                  <details className="relative">
                    <summary className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'cursor-pointer list-none text-miss [&::-webkit-details-marker]:hidden')}>Delete</summary>
                    <form action={deleteDrawAction} className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-miss/40 bg-panel p-3 shadow-panel">
                      <input type="hidden" name="id" value={d.id} />
                      <p className="mb-2 text-xs text-mute">Delete draw {d.drawNo} and its prizes for good?</p>
                      <Button type="submit" size="sm" className="bg-miss text-white hover:bg-miss/80">Yes, delete</Button>
                    </form>
                  </details>
                </div>
              ) : null}
            </td>
          </tr>
        ))}
      </AdminTable>

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="text-gold-bright hover:underline">Previous</Link> : <span />}
          <span className="text-mute">Page {page} of {pages} ({total} draws)</span>
          {page < pages ? <Link href={href(page + 1)} className="text-gold-bright hover:underline">Next</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
