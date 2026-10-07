import type { Metadata } from 'next';
import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { BadgeCheck } from 'lucide-react';
import { beginTotpAction, confirmTotpAction, disableTotpAction, saveNicknameAction } from '@/actions/account';
import { ChangePasswordForm } from '@/components/auth-forms';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata: Metadata = { title: 'Account settings', robots: { index: false, follow: false } };

const field = 'h-11 w-full rounded-xl border border-line bg-night px-4 text-sm text-ivory placeholder:text-mute/60';
const card = 'surface p-5 sm:p-6';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ nick?: string; two?: string }> }) {
  const user = await requireUser('/account/settings');
  const { nick, two } = await searchParams;
  const [me] = await query<RowDataPacket & { nickname: string | null; totp_on: number; totp_secret: string | null }>('SELECT nickname, totp_on, totp_secret FROM users WHERE id=?', [user.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Settings</h1>
        <p className="mt-1 text-mute">Your sign-in details and how you appear on the leaderboard.</p>
      </div>

      <section className={card} aria-labelledby="email">
        <h2 id="email" className="font-serif text-xl">Email</h2>
        <p className="mt-2 text-ivory">{user.email}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-mute">
          {user.verified ? <><BadgeCheck aria-hidden className="h-4 w-4 text-win" />Confirmed. We use it for password resets and order updates.</> : 'Not confirmed yet. Use the banner above to get a new link.'}
        </p>
      </section>

      <section className={card} aria-labelledby="nickname">
        <h2 id="nickname" className="font-serif text-xl">Leaderboard nickname</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-mute">
          Optional. A nickname puts your points balance on the <Link href="/leaderboard" className="text-gold-bright underline-offset-4 hover:underline">leaderboard</Link>. Your email is never shown. Leave it empty to stay off.
        </p>
        <form action={saveNicknameAction} className="mt-4 flex max-w-sm gap-2">
          <input name="nickname" defaultValue={me?.nickname ?? ''} maxLength={20} aria-label="Nickname" className={field} />
          <Button type="submit" variant="outline">Save</Button>
        </form>
        {nick ? <p role="status" className="mt-3 text-sm text-mute">{nick}</p> : null}
      </section>

      <section id="two-step" className={card} aria-labelledby="two-step-h">
        <h2 id="two-step-h" className="font-serif text-xl">Two-step login</h2>
        {two === 'on' ? <p role="status" className="mt-2 text-sm text-win">Two-step login is on.</p> : null}
        {two === 'off' ? <p role="status" className="mt-2 text-sm text-mute">Two-step login is off.</p> : null}
        {two === 'bad' ? <p role="alert" className="mt-2 text-sm text-miss">That did not work. Check the code (and password) and try again.</p> : null}
        {Number(me?.totp_on) ? (
          <form action={disableTotpAction} className="mt-3 max-w-sm space-y-3">
            <p className="text-sm text-mute">On. Logging in needs a code from your authenticator app. To turn it off, enter your password and a current code.</p>
            <input name="password" type="password" required placeholder="Password" aria-label="Password" autoComplete="current-password" className={field} />
            <input name="code" inputMode="numeric" required placeholder="6-digit code" aria-label="Code" autoComplete="one-time-code" className={field} />
            <Button type="submit" variant="outline">Turn off</Button>
          </form>
        ) : me?.totp_secret ? (
          <form action={confirmTotpAction} className="mt-3 max-w-md space-y-3">
            <p className="text-sm text-mute">In an authenticator app (Google Authenticator, Microsoft Authenticator, Authy), add an account by key and enter this secret, then type the 6-digit code it shows.</p>
            <p className="break-all rounded-xl border border-line bg-night px-4 py-3 font-mono text-sm tracking-wider text-ivory">{me.totp_secret.match(/.{1,4}/g)?.join(' ')}</p>
            <input name="code" inputMode="numeric" required placeholder="6-digit code" aria-label="Code" autoComplete="one-time-code" className={`${field} max-w-xs`} />
            <Button type="submit">Turn on</Button>
          </form>
        ) : (
          <form action={beginTotpAction} className="mt-2">
            <p className="mb-4 max-w-[60ch] text-sm text-mute">Adds a code from your phone to every login. Recommended for admin and staff accounts.</p>
            <Button type="submit" variant="outline">Set up two-step login</Button>
          </form>
        )}
      </section>

      <section className={card} aria-labelledby="password">
        <h2 id="password" className="mb-4 font-serif text-xl">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
