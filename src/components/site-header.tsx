import Link from 'next/link';
import { CurrencySwitch } from '@/components/currency-switch';
import { getCurrentCurrency } from '@/lib/data';
import { SITE_NAME } from '@/lib/seo';

const NAV = [
  { href: '/picker', label: 'Number picker' },
  { href: '/results', label: 'Results' },
  { href: '/guide', label: 'Guide' },
  { href: '/faq', label: 'FAQ' },
];

export async function SiteHeader() {
  const { all, current } = await getCurrentCurrency();
  return (
    <header className="border-b border-line/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-xl font-semibold">
          <span aria-hidden className="ball ball-red h-7 w-7 text-xs">6</span>
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-mute transition-colors hover:text-gold-bright">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <CurrencySwitch currencies={all} current={current.code} />
        </div>
      </div>
    </header>
  );
}
