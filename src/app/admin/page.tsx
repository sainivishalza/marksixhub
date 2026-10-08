import Link from 'next/link';
import { Panel, PageHeader, StatCard } from '@/components/admin/ui';
import { PicksChart } from '@/components/admin/picks-chart';
import { buttonVariants } from '@/components/ui/button';
import { getAlerts, getDashboard } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { can } from '@/lib/perms';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireRole('view');
  const [d, alerts] = await Promise.all([getDashboard(), can(user.role, 'manage') ? getAlerts() : Promise.resolve([])]);
  return (
    <>
      <PageHeader title="Dashboard" description="A quick look at the site today.">
        {can(user.role, 'content') ? (
          <Link href="/admin/draws/new" className={buttonVariants({ size: 'md' })}>Add draw or result</Link>
        ) : null}
      </PageHeader>

      {d.pendingOrders > 0 ? (
        <Link href="/admin/orders?status=pending" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/50 bg-raised/60 p-4 hover:border-gold">
          <span className="text-ivory"><span className="font-mono text-2xl text-gold-bright">{d.pendingOrders}</span> order{d.pendingOrders === 1 ? '' : 's'} waiting for approval</span>
          <span className="text-sm text-gold-bright">Review →</span>
        </Link>
      ) : null}

      {alerts.length ? (
        <section aria-label="Alerts" className="mb-6 rounded-2xl border border-miss/40 bg-miss/10 p-4">
          <h2 className="mb-2 text-lg text-miss">Needs a look</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ivory">{alerts.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Registered users" value={d.users} />
        <StatCard label="Published draws" value={d.published} hint={`${d.upcoming} upcoming`} />
        <StatCard label="Saved sets today" value={d.picksToday} />
        <StatCard label="Orders waiting for approval" value={d.pendingOrders} hint={d.pendingOrders ? 'Open Orders to approve' : 'All handled'} />
        <StatCard label="Orders today" value={d.ordersToday} hint={`${d.ticketsToday} tickets`} />
        <StatCard label="Points held by users" value={d.pointsHeld} />
        <StatCard label="Points paid as winnings" value={d.pointsWon} hint="All time" />
        <StatCard label="Page views" value="Not tracked" hint="Add Plausible or Umami for visitor stats" className="col-span-2 lg:col-span-1" />
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
