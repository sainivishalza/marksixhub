import type { Metadata } from 'next';
import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { BallRow } from '@/components/ball';
import { ChangePasswordForm } from '@/components/auth-forms';
import { Button } from '@/components/ui/button';
import { beginTotpAction, claimDailyAction, confirmTotpAction, deleteSetAction, disableTotpAction, dismissWinsAction, saveNicknameAction } from '@/actions/account';
import { requireUser } from '@/lib/auth';
import { getCurrentCurrency } from '@/lib/data';
import { query } from '@/lib/db';
import { getPoints } from '@/lib/points';
import { getSettings } from '@/lib/settings';
import { dateLabel } from '@/lib/format';
import { DIVISION_LABEL, evaluate, parseNumbers } from '@/lib/mark6';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ nick?: string; two?: string }> }) {
  const { nick, two } = await searchParams;
  const user = await requireUser('/account');
  const [points, settings, [claim]] = await Promise.all([
    getPoints(user.id),
    getSettings(),
    query<RowDataPacket & { done: number; streak: number; nickname: string | null; totp_on: number; totp_secret: string | null }>('SELECT (last_claim = UTC_DATE()) AS done, streak, nickname, totp_on, totp_secret FROM users WHERE id=?', [user.id]),
  ]);
  const [win] = await query<RowDataPacket & { n: number | null; draws: string | null }>("SELECT SUM(won_points) AS n, GROUP_CONCAT(DISTINCT draw_no) AS draws FROM saved_sets WHERE user_id=? AND settled=1 AND notified=0 AND won_points>0", [user.id]);
  const [stat] = await query<RowDataPacket & { orders: number; won: number | null }>('SELECT (SELECT COUNT(*) FROM orders WHERE user_id=? AND refunded=0) AS orders, (SELECT SUM(won_points) FROM saved_sets WHERE user_id=? AND settled=1) AS won', [user.id, user.id]);
  const badges = [
    [Number(stat.orders) >= 1, 'First order'],
    [Number(stat.orders) >= 10, '10 orders'],
    [Number(claim?.streak) >= 7, '7-day streak'],
    [Number(stat.won) > 0, 'First win'],
    [Number(stat.won) >= 1000, '1,000 points won'],
    [Boolean(claim?.nickname), 'On the leaderboard'],
  ].filter(([ok]) => ok).map(([, label]) => label as string);
  const [orders, log] = await Promise.all([
    query<RowDataPacket & { id: number; draw_no: string; tickets: number; points: number; refunded: number; created_at: string }>('SELECT id, draw_no, tickets, points, refunded, created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 30', [user.id]),
    query<RowDataPacket & { id: number; delta: number; reason: string; created_at: string }>('SELECT id, delta, reason, created_at FROM point_log WHERE user_id=? ORDER BY id DESC LIMIT 25', [user.id]),
  ]);
  const [sets, { current }] = await Promise.all([
    query<RowDataPacket & { id: number; nums: string; created_at: string; draw_no: string | null; order_id: number | null; won_points: number; settled: number; units: number; r_nums: string | null; r_extra: number | null }>(
      `SELECT s.id, s.nums, s.created_at, s.draw_no, s.order_id, s.won_points, s.settled, s.units, d.nums AS r_nums, d.extra AS r_extra FROM saved_sets s LEFT JOIN draws d ON d.draw_no = s.draw_no AND d.status='published' WHERE s.user_id=? ORDER BY s.id DESC`,
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

      <section className="surface mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-mute">Points balance</p>
          <p className="font-mono text-3xl tabular-nums text-gold-bright">{points}</p>
          {Number(claim?.streak) > 0 ? <p className="mt-1 text-sm text-mute">Daily streak: {Number(claim.streak)} day{Number(claim.streak) === 1 ? '' : 's'}. Each extra day adds 10 points, up to day 7.</p> : null}
          <p className="mt-1 text-xs text-mute">Free play points. They are not money, cannot be bought and cannot be cashed out. A ticket costs {settings.ticketPoints} points.</p>
        </div>
        <form action={claimDailyAction}>
          <Button type="submit" disabled={Boolean(Number(claim?.done))}>{Number(claim?.done) ? 'Claimed today' : `Claim ${settings.dailyPoints} free points`}</Button>
        </form>
      </section>

      {badges.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Badges">
          {badges.map((b) => <li key={b} className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold-bright">{b}</li>)}
        </ul>
      ) : null}

      {Number(win?.n) ? (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-win/40 bg-win/10 p-4">
          <p className="text-win">You won {Number(win.n)} points in draw {win.draws}.</p>
          <form action={dismissWinsAction}><Button type="submit" size="sm" variant="outline">Dismiss</Button></form>
        </section>
      ) : null}

      <h2 className="mb-4 mt-10 text-2xl">My orders</h2>
      {orders.length === 0 && sets.length === 0 ? (
        <p className="text-mute">
          No orders yet. Choose numbers in the <Link href="/picker" className="text-gold-bright underline-offset-4 hover:underline">number picker</Link> and place an order.
        </p>
      ) : null}
      <div className="space-y-4">
        {orders.map((o) => {
          const mine = sets.filter((s) => s.order_id === o.id);
          const again = mine.map((s) => s.nums).join('|');
          return (
            <section key={o.id} className="rounded-2xl border border-line">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line/50 px-4 py-3 text-sm">
                <span>
                  <Link href={`/account/orders/${o.id}`} className="font-mono text-ivory underline-offset-4 hover:underline">Order #{o.id}</Link> <span className="text-mute">for draw {o.draw_no}, {dateLabel(String(o.created_at).slice(0, 10), { weekday: undefined })}. {o.tickets} ticket{o.tickets === 1 ? '' : 's'}, {o.points} points{o.refunded ? ' (refunded)' : ''}.</span>
                </span>
                {mine.length ? <Link href={`/picker?t=${again}`} className="text-gold-bright underline-offset-4 hover:underline">Play these again</Link> : null}
              </header>
              <ul className="divide-y divide-line/50">
                {mine.map((s) => <TicketRow key={s.id} s={s} />)}
              </ul>
            </section>
          );
        })}
        {sets.some((s) => !s.order_id) ? (
          <section className="rounded-2xl border border-line">
            <header className="border-b border-line/50 px-4 py-3 text-sm text-mute">Earlier saved numbers</header>
            <ul className="divide-y divide-line/50">
              {sets.filter((s) => !s.order_id).map((s) => <TicketRow key={s.id} s={s} deletable />)}
            </ul>
          </section>
        ) : null}
      </div>

      <details className="mt-10 rounded-2xl border border-line p-4">
        <summary className="cursor-pointer text-lg">Points history</summary>
        {log.length === 0 ? <p className="mt-3 text-sm text-mute">Nothing yet.</p> : (
          <ul className="mt-3 divide-y divide-line/50 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2">
                <span className="text-mute">{String(l.created_at).slice(0, 10)} {l.reason}</span>
                <span className={`font-mono tabular-nums ${l.delta > 0 ? 'text-win' : 'text-miss'}`}>{l.delta > 0 ? '+' : ''}{l.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      <h2 className="mb-2 mt-12 text-2xl">Leaderboard nickname</h2>
      <p className="mb-3 text-sm text-mute">Optional. A nickname puts your points balance on the <Link href="/leaderboard" className="text-gold-bright underline-offset-4 hover:underline">leaderboard</Link>. Your email is never shown. Leave it empty to stay off.</p>
      <form action={saveNicknameAction} className="flex max-w-sm gap-2">
        <input name="nickname" defaultValue={claim?.nickname ?? ''} maxLength={20} aria-label="Nickname" className="h-10 w-full rounded-lg border border-line bg-night px-3 text-sm text-ivory" />
        <Button type="submit" variant="outline">Save</Button>
      </form>
      {nick ? <p role="status" className="mt-2 text-sm text-mute">{nick}</p> : null}

      <h2 id="two-step" className="mb-2 mt-12 text-2xl">Two-step login</h2>
      {two === 'on' ? <p role="status" className="mb-2 text-sm text-win">Two-step login is on.</p> : null}
      {two === 'off' ? <p role="status" className="mb-2 text-sm text-mute">Two-step login is off.</p> : null}
      {two === 'bad' ? <p role="alert" className="mb-2 text-sm text-miss">That did not work. Check the code (and password) and try again.</p> : null}
      {Number(claim?.totp_on) ? (
        <form action={disableTotpAction} className="max-w-sm space-y-3">
          <p className="text-sm text-mute">On. Logging in needs a code from your authenticator app. To turn it off, enter your password and a current code.</p>
          <input name="password" type="password" required placeholder="Password" aria-label="Password" autoComplete="current-password" className="h-10 w-full rounded-lg border border-line bg-night px-3 text-sm text-ivory" />
          <input name="code" inputMode="numeric" required placeholder="6-digit code" aria-label="Code" autoComplete="one-time-code" className="h-10 w-full rounded-lg border border-line bg-night px-3 text-sm text-ivory" />
          <Button type="submit" variant="outline">Turn off</Button>
        </form>
      ) : claim?.totp_secret ? (
        <form action={confirmTotpAction} className="max-w-md space-y-3">
          <p className="text-sm text-mute">In an authenticator app (Google Authenticator, Microsoft Authenticator, Authy), add an account by key and enter this secret, then type the 6-digit code it shows.</p>
          <p className="break-all rounded-lg border border-line bg-night px-3 py-2 font-mono text-sm tracking-wider text-ivory">{claim.totp_secret.match(/.{1,4}/g)?.join(' ')}</p>
          <input name="code" inputMode="numeric" required placeholder="6-digit code" aria-label="Code" autoComplete="one-time-code" className="h-10 w-full max-w-xs rounded-lg border border-line bg-night px-3 text-sm text-ivory" />
          <Button type="submit">Turn on</Button>
        </form>
      ) : (
        <form action={beginTotpAction}>
          <p className="mb-3 max-w-[60ch] text-sm text-mute">Adds a code from your phone to every login. Recommended for admin and staff accounts.</p>
          <Button type="submit" variant="outline">Set up two-step login</Button>
        </form>
      )}

      <h2 className="mb-4 mt-12 text-2xl">Change password</h2>
      <ChangePasswordForm />
    </div>
  );
}

type Set = { id: number; nums: string; draw_no: string | null; won_points: number; settled: number; units: number; r_nums: string | null; r_extra: number | null };

function TicketRow({ s, deletable = false }: { s: Set; deletable?: boolean }) {
  const numbers = parseNumbers(s.nums);
  const multi = numbers.length > 6;
  const ev = !multi && s.r_nums ? evaluate(numbers, parseNumbers(s.r_nums), s.r_extra) : null;
  const result = ev
    ? `${ev.matches} match${ev.matches === 1 ? '' : 'es'}${ev.extraHit ? ' + extra' : ''}${ev.division ? `, ${DIVISION_LABEL[ev.division - 1]} prize: ${s.won_points} points` : ', no prize'}.`
    : s.settled
      ? s.won_points ? `Won ${s.won_points} points.` : 'No prize.'
      : s.draw_no ? 'Result pending.' : '';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <BallRow numbers={numbers} size="sm" />
        <p className="mt-2 text-xs text-mute">{multi ? `Multiple entry, ${s.units} tickets. ` : ''}{result}</p>
      </div>
      {deletable && s.settled ? (
        <form action={deleteSetAction}>
          <input type="hidden" name="id" value={s.id} />
          <Button type="submit" variant="ghost" size="sm" aria-label={`Delete saved set ${s.nums}`}>Delete</Button>
        </form>
      ) : null}
    </li>
  );
}
