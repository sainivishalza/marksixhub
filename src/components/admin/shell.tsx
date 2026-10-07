'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CalendarDays, ChevronsLeft, ChevronsRight, CircleDollarSign, FileText, Gauge, Globe, HelpCircle, LogOut, Search, Settings, Ticket, Users } from 'lucide-react';
import { logoutAction } from '@/actions/account';
import { can, type Level, type Role } from '@/lib/perms';
import { cn } from '@/lib/utils';

const NAV: { href: string; label: string; icon: typeof Gauge; level: Level }[] = [
  { href: '/admin', label: 'Dashboard', icon: Gauge, level: 'view' },
  { href: '/admin/draws', label: 'Draws', icon: Ticket, level: 'view' },
  { href: '/admin/orders', label: 'Orders', icon: Ticket, level: 'view' },
  { href: '/admin/events', label: 'Events', icon: CalendarDays, level: 'view' },
  { href: '/admin/faqs', label: 'Content', icon: HelpCircle, level: 'content' },
  { href: '/admin/seo', label: 'SEO', icon: FileText, level: 'content' },
  { href: '/admin/users', label: 'Users', icon: Users, level: 'manage' },
  { href: '/admin/currencies', label: 'Currencies', icon: CircleDollarSign, level: 'manage' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, level: 'manage' },
];

export function AdminShell({ user, children }: { user: { email: string; role: Role }; children: ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV.filter((n) => can(user.role, n.level));
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));

  return (
    <div className="min-h-screen bg-night md:flex">
      <aside className={cn('shrink-0 border-b border-line/60 bg-panel md:min-h-screen md:border-b-0 md:border-r', collapsed ? 'md:w-16' : 'md:w-56')}>
        <div className="flex items-center justify-between px-4 py-3 md:py-5">
          <Link href="/admin" className={cn('font-serif text-lg font-semibold text-ivory', collapsed && 'md:sr-only')}>Admin</Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-1.5 text-mute hover:bg-raised hover:text-ivory md:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active(href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors',
                active(href) ? 'bg-raised text-gold-bright' : 'text-mute hover:bg-raised/60 hover:text-ivory',
                collapsed && 'md:justify-center',
              )}
            >
              <Icon aria-hidden className="h-4 w-4 shrink-0" />
              <span className={cn(collapsed && 'md:sr-only')}>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-line/60 bg-panel/60 px-4 py-3">
          <form action="/admin/draws" className="relative max-w-sm flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <input
              name="q"
              type="search"
              placeholder="Find a draw, e.g. 26/081"
              aria-label="Search draws"
              className="h-10 w-full rounded-xl border border-line bg-night pl-9 pr-3 text-sm text-ivory placeholder:text-mute/60"
            />
          </form>
          <details className="relative ml-auto">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-line px-3 text-sm text-ivory hover:border-gold [&::-webkit-details-marker]:hidden">
              <span className="max-w-[10rem] truncate">{user.email}</span>
              <span className="rounded bg-raised px-1.5 py-0.5 text-xs text-gold-bright">{user.role}</span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-line bg-panel p-1 shadow-panel">
              <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute hover:bg-raised hover:text-ivory"><Globe aria-hidden className="h-4 w-4" />View site</Link>
              <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute hover:bg-raised hover:text-ivory"><Users aria-hidden className="h-4 w-4" />My account</Link>
              <form action={logoutAction}>
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-mute hover:bg-raised hover:text-ivory"><LogOut aria-hidden className="h-4 w-4" />Log out</button>
              </form>
            </div>
          </details>
        </header>
        <main id="main" className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
