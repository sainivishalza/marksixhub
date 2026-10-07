import type { Metadata } from 'next';
import type { RowDataPacket } from 'mysql2/promise';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { shortWhen } from '@/lib/account-data';
import Link from 'next/link';
import { getPoints } from '@/lib/points';

export const metadata: Metadata = { title: 'My points', robots: { index: false, follow: false } };

export default async function PointsPage() {
  const user = await requireUser('/account/points');
  const [points, [sum], log] = await Promise.all([
    getPoints(user.id),
    query<RowDataPacket & { earned: number | null; spent: number | null }>('SELECT SUM(CASE WHEN delta > 0 THEN delta END) AS earned, SUM(CASE WHEN delta < 0 THEN -delta END) AS spent FROM point_log WHERE user_id=?', [user.id]),
    query<RowDataPacket & { id: number; delta: number; reason: string; created_at: string }>('SELECT id, delta, reason, created_at FROM point_log WHERE user_id=? ORDER BY id DESC LIMIT 200', [user.id]),
  ]);
  const tile = 'surface p-5';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">My points</h1>
        <p className="mt-1 max-w-[60ch] text-mute">Points are free play credits. They have no cash value, cannot be bought and cannot be withdrawn.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={tile}><p className="text-sm text-mute">Balance</p><p className="mt-1 font-mono text-3xl tabular-nums text-gold-bright">{points.toLocaleString('en-US')}</p></div>
        <div className={tile}><p className="text-sm text-mute">Earned so far</p><p className="mt-1 font-mono text-3xl tabular-nums text-win">{(Number(sum?.earned) || 0).toLocaleString('en-US')}</p></div>
        <div className={tile}><p className="text-sm text-mute">Used on orders</p><p className="mt-1 font-mono text-3xl tabular-nums">{(Number(sum?.spent) || 0).toLocaleString('en-US')}</p></div>
      </div>

      <div className={`${tile} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="text-sm text-mute">Older results</p>
          <p className="mt-1 text-ivory">
            {user.historyYears ? `${user.historyYears} year${user.historyYears === 1 ? '' : 's'} unlocked, since ${user.historyFrom}` : 'Only the latest 40 results are open to you.'}
          </p>
        </div>
        <Link href="/results#unlock" className="text-sm text-gold-bright underline-offset-4 hover:underline">{user.historyYears >= 9 ? 'See results' : 'Unlock more'}</Link>
      </div>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 font-serif text-2xl">History</h2>
        {log.length === 0 ? (
          <p className="text-mute">Nothing yet. Your first points show up here.</p>
        ) : (
          <ul className="surface divide-y divide-line/40 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate text-ivory">{l.reason}</span>
                  <span className="block text-xs text-mute">{shortWhen(String(l.created_at))}</span>
                </span>
                <span className={`font-mono text-base tabular-nums ${l.delta > 0 ? 'text-win' : 'text-ivory'}`}>{l.delta > 0 ? '+' : ''}{l.delta.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
