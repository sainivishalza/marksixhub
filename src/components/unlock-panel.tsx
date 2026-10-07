import Link from 'next/link';
import { Lock, LockOpen } from 'lucide-react';
import { unlockHistoryAction } from '@/actions/history';
import { Button, buttonVariants } from '@/components/ui/button';
import type { User } from '@/lib/auth';
import { dateLabel } from '@/lib/format';
import { getTiers, type HistoryAccess } from '@/lib/history';
import { upgradeCost } from '@/lib/history-rules';
import { getPoints } from '@/lib/points';
import { getSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

const FLASH: Record<string, [string, 'ok' | 'bad']> = {
  ok: ['Unlocked. The older results are open now.', 'ok'],
  poor: ['You do not have enough points for that. Claim your daily points in My account.', 'bad'],
  owned: ['You already have that much history.', 'bad'],
  verify: ['Confirm your email address first. You can ask for a new link in My account.', 'bad'],
  wait: ['Too many tries. Please wait a little and try again.', 'bad'],
  bad: ['That did not work. Please try again.', 'bad'],
};

/** Older results are bought in years with points. `path` is where to come back to after buying. */
export async function UnlockPanel({ access, user, path, flash, highlight }: { access: HistoryAccess; user: User | null; path: string; flash?: string; highlight?: number }) {
  if (!access.latest || (access.locked === 0 && !flash)) return null;
  const [tiers, settings, points] = await Promise.all([getTiers(access.latest), getSettings(), user ? getPoints(user.id) : Promise.resolve(0)]);
  const note = flash ? FLASH[flash] : undefined;
  const loginNext = encodeURIComponent(path);

  return (
    <section id="unlock" className="surface mt-10 p-5 sm:p-7" aria-labelledby="unlock-title">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-raised">
          {access.locked > 0 ? <Lock className="h-5 w-5 text-gold-bright" /> : <LockOpen className="h-5 w-5 text-win" />}
        </span>
        <div>
          <h2 id="unlock-title" className="font-serif text-2xl">{access.locked > 0 ? 'Unlock older results' : 'All results unlocked'}</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-mute">
            {access.locked > 0
              ? `The latest 40 results are free. ${access.locked.toLocaleString('en-US')} older results are locked. Pay with points to open them: ${settings.historyYearPoints} points for 1 year, ${settings.historyYearPoints * 2} for 2 years, and so on up to 9 years.`
              : 'You can see every result in the archive.'}
          </p>
        </div>
      </div>

      {note ? (
        <p role={note[1] === 'ok' ? 'status' : 'alert'} className={cn('mt-4 rounded-xl border px-4 py-2 text-sm', note[1] === 'ok' ? 'border-win/40 bg-win/10 text-win' : 'border-miss/40 bg-miss/10 text-miss')}>{note[0]}</p>
      ) : null}

      {access.locked > 0 || access.years > 0 ? (
        <ol className="mt-5 divide-y divide-line/40 rounded-xl border border-line">
          {tiers.map((t) => {
            const owned = t.years <= access.years;
            const cost = upgradeCost(access.years, t.years, settings.historyYearPoints);
            const short = user ? Math.max(0, cost - points) : 0;
            return (
              <li key={t.years} className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3', highlight === t.years && 'bg-gold/5')}>
                <span>
                  <span className="block font-medium text-ivory">{t.years} year{t.years === 1 ? '' : 's'}</span>
                  <span className="block text-sm text-mute">Results since {dateLabel(t.since, { weekday: undefined })}, {t.draws.toLocaleString('en-US')} draws in all</span>
                </span>
                {owned ? (
                  <span className="text-sm text-win">Unlocked</span>
                ) : !user ? (
                  <span className="font-mono text-sm tabular-nums text-ivory">{cost.toLocaleString('en-US')} points</span>
                ) : (
                  <form action={unlockHistoryAction} className="flex items-center gap-3">
                    <input type="hidden" name="years" value={t.years} />
                    <input type="hidden" name="next" value={path} />
                    {short > 0 ? <span className="text-xs text-mute">{short.toLocaleString('en-US')} more points needed</span> : null}
                    <Button type="submit" size="sm" disabled={short > 0 || !user.verified}>{cost.toLocaleString('en-US')} points</Button>
                  </form>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}

      {!user && access.locked > 0 ? (
        <p className="mt-4 text-sm text-mute">
          <Link href={`/login?next=${loginNext}`} className={buttonVariants({ size: 'sm' })}>Log in to unlock</Link>{' '}
          <Link href="/register" className="ml-2 text-gold-bright underline-offset-4 hover:underline">or create a free account</Link>
        </p>
      ) : null}
      {user ? <p className="mt-4 text-xs text-mute">Your balance: <span className="font-mono text-ivory">{points.toLocaleString('en-US')}</span> points. Points are free play credits and have no cash value. Unlocked history stays yours; upgrading only charges the extra years.</p> : null}
    </section>
  );
}
