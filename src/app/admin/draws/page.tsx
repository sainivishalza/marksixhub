import Link from 'next/link';
import { DrawList } from '@/components/admin/draw-list';
import { Notice, PageHeader, inputClass } from '@/components/admin/ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { listDraws } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
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
  const none = <p className="rounded-2xl border border-line p-6 text-sm text-mute">{q ? 'No draws match that search.' : 'No draws yet. Add the first one.'}</p>;

  return (
    <>
      <PageHeader title="Draws" description="Enter results here. Published draws appear on the site straight away; drafts stay hidden.">
        {canEdit ? (
          <>
            <Link href="/admin/draws/new" className={cn(buttonVariants(), 'order-first max-sm:basis-full')}>Add draw</Link>
            <Link href="/admin/draws/import" className={buttonVariants({ variant: 'outline' })}>Import CSV</Link>
            <Link href="/admin/draws/history" className={buttonVariants({ variant: 'outline' })}>Import past results</Link>
          </>
        ) : null}
      </PageHeader>
      <Notice ok={ok} error={error} />

      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Search by draw number or date" aria-label="Search draws" className={inputClass} />
        <Button type="submit" variant="outline" className="max-sm:h-11">Search</Button>
      </form>

      <DrawList draws={draws} canEdit={canEdit} none={none} />

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="rounded-lg px-2 py-2 text-gold-bright hover:underline">Previous</Link> : <span />}
          <span className="text-center text-mute">Page {page} of {pages} ({total} draws)</span>
          {page < pages ? <Link href={href(page + 1)} className="rounded-lg px-2 py-2 text-gold-bright hover:underline">Next</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
