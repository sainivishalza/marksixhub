import Link from 'next/link';
import { BadgeCheck, Plus } from 'lucide-react';
import { AccountNav } from '@/components/account/nav';
import { resendVerificationAction } from '@/actions/account';
import { Button, buttonVariants } from '@/components/ui/button';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getPoints } from '@/lib/points';
import type { RowDataPacket } from 'mysql2/promise';

/** Everything under /account: who you are, your balance, and the four sections. Private, so never indexed. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/account');
  const [points, [row]] = await Promise.all([
    getPoints(user.id),
    query<RowDataPacket & { nickname: string | null }>('SELECT nickname FROM users WHERE id=?', [user.id]),
  ]);
  const name = row?.nickname || user.email.split('@')[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4 lg:rounded-2xl lg:border lg:border-line lg:bg-panel/80 lg:p-5">
            <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gold/50 bg-raised font-serif text-xl text-gold-bright">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 lg:w-full">
              <p className="truncate font-medium text-ivory">{name}</p>
              <p className="truncate text-sm text-mute">{user.email}</p>
              {user.verified ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-win"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Email confirmed</p>
              ) : null}
            </div>
            <div className="text-right lg:w-full lg:border-t lg:border-line/60 lg:pt-4 lg:text-left">
              <p className="text-xs text-mute">Points</p>
              <p className="font-mono text-2xl leading-none tabular-nums text-gold-bright">{points.toLocaleString('en-US')}</p>
            </div>
          </div>
          <AccountNav />
          <Link href="/picker" className={`${buttonVariants({ size: 'md' })} hidden w-full lg:inline-flex`}>
            <Plus aria-hidden className="h-4 w-4" />Pick numbers
          </Link>
        </aside>

        <div className="min-w-0">
          {!user.verified ? (
            <section className="mb-6 rounded-2xl border border-gold/50 bg-gold/5 p-4 sm:p-5" aria-label="Confirm your email">
              <p className="font-medium text-ivory">Confirm your email to place orders and get your welcome points.</p>
              <p className="mt-1 text-sm text-mute">We sent a link to {user.email}. It works for 24 hours. Check your spam folder if you cannot see it.</p>
              <form action={resendVerificationAction} className="mt-3">
                <Button type="submit" size="sm" variant="outline">Send me a new link</Button>
              </form>
            </section>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
