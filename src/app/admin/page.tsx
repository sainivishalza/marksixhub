import Link from 'next/link';
import { Panel, PageHeader, StatCard } from '@/components/admin/ui';
import { PicksChart } from '@/components/admin/picks-chart';
import { buttonVariants } from '@/components/ui/button';
import { getDashboard } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { can } from '@/lib/perms';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireRole('view');
  const d = await getDashboard();
  return (
    <>
      <PageHeader title="Dashboard" description="A quick look at the site today.">
        {can(user.role, 'content') ? (
          <Link href="/admin/draws/new" className={buttonVariants({ size: 'md' })}>Add draw or result</Link>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={d.users} />
        <StatCard label="Published draws" value={d.published} hint={`${d.upcoming} upcoming`} />
        <StatCard label="Saved sets today" value={d.picksToday} />
        <StatCard label="Orders today" value={d.ordersToday} hint={`${d.ticketsToday} tickets`} />
        <StatCard label="Points held by users" value={d.pointsHeld} />
        <StatCard label="Points paid as winnings" value={d.pointsWon} hint="All time" />
        <StatCard label="Page views" value="Not tracked" hint="Add Plausible or Umami for visitor stats" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Saved sets, last 30 days">
          <PicksChart data={d.series} />
        </Panel>
        <Panel title="Recent activity">
          {d.activity.length === 0 ? (
            <p className="text-sm text-mute">Nothing yet. Sign-ups and saved sets appear here.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {d.activity.map((a, i) => (
                <li key={i} className="flex flex-col">
                  <span className="break-words text-ivory">{a.text}</span>
                  <span className="text-xs text-mute">{a.at}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
