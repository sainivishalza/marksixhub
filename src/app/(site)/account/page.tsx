import type { Metadata } from 'next';
import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { BallRow } from '@/components/ball';
import { ChangePasswordForm } from '@/components/auth-forms';
import { Button } from '@/components/ui/button';
import { deleteSetAction } from '@/actions/account';
import { requireUser } from '@/lib/auth';
import { getCurrentCurrency } from '@/lib/data';
import { query } from '@/lib/db';
import { dateLabel } from '@/lib/format';
import { DIVISION_LABEL, evaluate, parseNumbers } from '@/lib/mark6';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUser('/account');
  const [sets, { current }] = await Promise.all([
    query<RowDataPacket & { id: number; nums: string; created_at: string; draw_no: string | null; r_nums: string | null; r_extra: number | null }>(
      `SELECT s.id, s.nums, s.created_at, s.draw_no, d.nums AS r_nums, d.extra AS r_extra FROM saved_sets s LEFT JOIN draws d ON d.draw_no = s.draw_no AND d.status='published' WHERE s.user_id=? ORDER BY s.id DESC`,
      [user.id],
    ),
    getCurrentCurrency(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">My account</h1>
      <p className="mt-2 text-mute">
        {user.email}. Prizes show in <span className="font-mono text-ivory">{current.code}</span>; change it with the selector in the header.
      </p>

      <h2 className="mb-4 mt-10 text-2xl">Saved numbers</h2>
      {sets.length === 0 ? (
        <p className="text-mute">
          Nothing saved yet. Choose numbers in the <Link href="/picker" className="text-gold-bright underline-offset-4 hover:underline">number picker</Link> and press Save.
        </p>
      ) : (
        <ul className="divide-y divide-line/50 rounded-2xl border border-line">
          {sets.map((s) => {
            const numbers = parseNumbers(s.nums);
            const ev = s.r_nums ? evaluate(numbers, parseNumbers(s.r_nums), s.r_extra) : null;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <BallRow numbers={numbers} size="sm" />
                  <p className="mt-2 text-xs text-mute">
                    Saved {dateLabel(s.created_at.slice(0, 10), { weekday: undefined })}
                    {s.draw_no ? `. Draw ${s.draw_no}: ` : ''}
                    {ev ? `${ev.matches} match${ev.matches === 1 ? '' : 'es'}${ev.extraHit ? ' + extra' : ''}${ev.division ? `, ${DIVISION_LABEL[ev.division - 1]} prize` : ', no prize'}.` : s.draw_no ? 'result pending.' : ''}
                  </p>
                </div>
                <form action={deleteSetAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label={`Delete saved set ${s.nums}`}>Delete</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-4 mt-12 text-2xl">Change password</h2>
      <ChangePasswordForm />
    </div>
  );
}
