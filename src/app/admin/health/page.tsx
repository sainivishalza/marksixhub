import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/admin/ui';
import { clientIpDiagnostics, requireRole } from '@/lib/auth';
import { problems, runHealth } from '@/lib/health';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Health check' };
export const dynamic = 'force-dynamic';

const STYLE = {
  ok: { icon: CheckCircle2, text: 'text-win', label: 'OK' },
  warn: { icon: TriangleAlert, text: 'text-gold-bright', label: 'Note' },
  bad: { icon: CircleAlert, text: 'text-miss', label: 'Problem' },
} as const;

export default async function HealthPage() {
  await requireRole('manage');
  const checks = await runHealth();
  // Only the page knows who is asking, so the address check lives here and not in the daily email.
  const ip = await clientIpDiagnostics();
  checks.push({
    id: 'clientip',
    label: 'Visitor address and rate limits',
    status: ip.hops > 0 ? 'ok' : 'warn',
    detail: ip.hops > 0
      ? `The app sees your address as ${ip.chosen} (proxy chain: ${ip.chain}; ${ip.hops} trusted proxy hop${ip.hops === 1 ? '' : 's'}).`
      : `The app sees: ${ip.chain}. If that shows your own address as the LAST entry, set TRUSTED_PROXY_HOPS to the number of proxies (usually 1) in the hosting settings, so a visitor cannot forge their address to get around the rate limits. The default is 1; set 0 only if the list shows a single entry that is always the visitor.`,
  });
  checks.push({
    id: 'staff2fa',
    label: 'Two-step login rule for staff',
    status: process.env.REQUIRE_STAFF_2FA === '1' ? 'ok' : 'warn',
    detail: process.env.REQUIRE_STAFF_2FA === '1' ? 'Staff must have two-step login to use the admin area.' : 'Not required. Set REQUIRE_STAFF_2FA=1 in the hosting settings after you have turned on two-step login for your own account.',
  });
  const bad = problems(checks).length;
  return (
    <>
      <PageHeader title="Health check" description="Things that can quietly go wrong. A short email goes to you each morning (8am Hong Kong time) when anything needs a look." />
      <p role="status" className={cn('mb-5 rounded-lg border px-4 py-3 text-sm', bad ? 'border-miss/40 bg-miss/10 text-miss' : 'border-win/40 bg-win/10 text-win')}>
        {bad ? `${bad} thing${bad === 1 ? '' : 's'} to look at.` : 'Everything looks fine.'}
      </p>
      <ul className="space-y-3">
        {checks.map((c) => {
          const s = STYLE[c.status];
          return (
            <li key={c.id} className="surface flex items-start gap-3 p-4">
              <s.icon aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', s.text)} />
              <div className="min-w-0">
                <p className="font-medium"><span className="sr-only">{s.label}: </span>{c.label}</p>
                <p className="mt-0.5 break-words text-sm text-mute">{c.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
