import type { Metadata } from 'next';
import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '@/lib/db';

export const metadata: Metadata = { title: 'Leaderboard', robots: { index: false, follow: true } };
export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const rows = await query<RowDataPacket & { nickname: string; points: number }>(
    'SELECT nickname, points FROM users WHERE nickname IS NOT NULL AND blocked=0 ORDER BY points DESC, id ASC LIMIT 20',
  );
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">Leaderboard</h1>
      <p className="mb-6 mt-2 text-mute">Top free play point balances. Points have no cash value. Add a nickname in <Link href="/account" className="text-gold-bright underline-offset-4 hover:underline">My account</Link> to join.</p>
      {rows.length === 0 ? (
        <p className="text-mute">No one has joined yet.</p>
      ) : (
        <ol className="divide-y divide-line/50 rounded-2xl border border-line">
          {rows.map((r, i) => (
            <li key={r.nickname} className="flex items-center justify-between gap-3 px-4 py-3">
              <span><span className="mr-3 inline-block w-6 font-mono text-mute">{i + 1}</span>{r.nickname}</span>
              <span className="font-mono tabular-nums text-gold-bright">{Number(r.points)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
