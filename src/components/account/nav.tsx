'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, LayoutDashboard, Settings, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/orders', label: 'Orders', icon: Ticket },
  { href: '/account/points', label: 'Points', icon: Coins },
  { href: '/account/settings', label: 'Settings', icon: Settings },
];

/** Sidebar on large screens, scrolling pills on phones. */
export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="My account" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/account' ? path === '/account' : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors lg:rounded-xl lg:px-3 lg:py-2.5',
              active ? 'bg-gold text-night lg:bg-raised lg:text-gold-bright' : 'border border-line text-mute hover:text-ivory lg:border-0 lg:hover:bg-raised/60',
            )}
          >
            <Icon aria-hidden className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
