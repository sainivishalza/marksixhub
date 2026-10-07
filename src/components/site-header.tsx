import Link from 'next/link';
import { logoutAction } from '@/actions/account';
import { CurrencySwitch } from '@/components/currency-switch';
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
  return (
    <header className="border-b border-line/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-xl font-semibold">
          <span aria-hidden className="ball ball-red h-7 w-7 text-xs">6</span>
          {siteName}
        </Link>
        <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
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
              {can(user.role, 'view') ? <Link href="/admin" className={linkClass}>Admin</Link> : null}
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
