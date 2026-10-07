import Link from 'next/link';
import { logoutAction } from '@/actions/account';
import { CurrencySwitch } from '@/components/currency-switch';
import { MobileMenu } from '@/components/mobile-menu';
import { getCurrentCurrency } from '@/lib/data';
import { can } from '@/lib/perms';
import type { User } from '@/lib/auth';

const NAV = [
  { href: '/picker', label: 'Number picker' },
  { href: '/results', label: 'Results' },
  { href: '/guide', label: 'Guide' },
  { href: '/faq', label: 'FAQ' },
];

const linkClass = 'whitespace-nowrap rounded-lg px-3 py-2 text-sm text-mute transition-colors hover:text-gold-bright';

export async function SiteHeader({ siteName, user }: { siteName: string; user: User | null }) {
  const { all, current } = await getCurrentCurrency();
  const canAdmin = Boolean(user && can(user.role, 'view'));
  const logo = (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 font-serif text-xl font-semibold">
      <span aria-hidden className="ball ball-red h-7 w-7 shrink-0 text-xs">6</span>
      <span className="truncate">{siteName}</span>
    </Link>
  );

  return (
    <header className="relative border-b border-line/60">
      {/* Phones: logo, currency and a menu button. */}
      <div className="flex items-center gap-2 px-4 py-3 md:hidden">
        {logo}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CurrencySwitch currencies={all} current={current.code} />
          <MobileMenu nav={NAV} loggedIn={Boolean(user)} canAdmin={canAdmin} />
        </div>
      </div>

      {/* Larger screens: everything in one row. */}
      <div className="mx-auto hidden max-w-7xl items-center gap-x-6 px-6 py-4 md:flex lg:px-8">
        {logo}
        <nav aria-label="Main" className="flex gap-1">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <CurrencySwitch currencies={all} current={current.code} />
          {user ? (
            <>
              {canAdmin ? <Link href="/admin" className={linkClass}>Admin</Link> : null}
              <Link href="/account" className={linkClass}>Account</Link>
              <form action={logoutAction}>
                <button type="submit" className={linkClass}>Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>Log in</Link>
              <Link href="/register" className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-night hover:bg-gold-bright">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
