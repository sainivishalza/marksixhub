'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, History, ShieldAlert, Scale, ChevronsLeft, ChevronsRight, CircleDollarSign, FileText, Gauge, Globe, HelpCircle, LogOut, Menu, Search, Settings, Ticket, Users, X } from 'lucide-react';
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
  { href: '/admin/users', label: 'Users', icon: Users, level: 'support' },
  { href: '/admin/audit', label: 'Audit log', icon: History, level: 'manage' },
  { href: '/admin/logins', label: 'Failed logins', icon: ShieldAlert, level: 'manage' },
  { href: '/admin/points-check', label: 'Points check', icon: Scale, level: 'manage' },
  { href: '/admin/currencies', label: 'Currencies', icon: CircleDollarSign, level: 'manage' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, level: 'manage' },
];

const menuLink = 'flex items-center gap-3 rounded-xl px-3 py-3 text-base text-mute hover:bg-raised hover:text-ivory';

export function AdminShell({ user, children }: { user: { email: string; role: Role }; children: ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => can(user.role, n.level));
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  const here = items.find((n) => active(n.href))?.label ?? 'Admin';

  // The phone menu closes when you go to another page or press Escape, and the page behind it does not scroll.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-night md:flex">
      {/* Phones: a slim app bar with a menu button. */}
      <div className="sticky top-0 z-30 md:hidden">
        <header className="flex items-center gap-3 border-b border-line/60 bg-panel/95 px-4 py-2.5 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="admin-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ivory hover:border-gold"
          >
            {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <p className="text-xs leading-none text-mute">Admin</p>
            <p className="truncate font-serif text-lg leading-tight text-ivory">{here}</p>
          </div>
          <span className="ml-auto rounded-md bg-raised px-2 py-1 text-xs text-gold-bright">{user.role}</span>
        </header>
        {open ? (
          <div id="admin-menu" className="fixed inset-x-0 bottom-0 top-[3.8rem] z-20 overflow-y-auto bg-night p-4">
            <form action="/admin/search" className="relative mb-4">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
              <input
                name="q"
                type="search"
                placeholder="Search draws, users, orders"
                aria-label="Search the admin area"
                className="h-11 w-full rounded-xl border border-line bg-panel pl-9 pr-3 text-base text-ivory placeholder:text-mute/60"
              />
            </form>
            <nav aria-label="Admin" className="grid grid-cols-2 gap-2">
              {items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={active(href) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-[0.95rem]',
                    active(href) ? 'border-gold/60 bg-raised text-gold-bright' : 'border-line/60 bg-panel/60 text-ivory hover:border-gold/50',
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0 text-gold" />
                  <span className="min-w-0 truncate">{label}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t border-line/60 pt-3">
              <p className="mb-1 truncate px-3 text-sm text-mute">{user.email}</p>
              <Link href="/" className={menuLink}><Globe aria-hidden className="h-4 w-4" />View site</Link>
              <a href="/preview?on=1&next=/results" className={menuLink}><Globe aria-hidden className="h-4 w-4" />Preview as customer</a>
              <Link href="/account" className={menuLink}><Users aria-hidden className="h-4 w-4" />My account</Link>
              <form action={logoutAction}>
                <button type="submit" className={cn(menuLink, 'w-full text-left')}><LogOut aria-hidden className="h-4 w-4" />Log out</button>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      {/* Larger screens: the sidebar. */}
      <aside className={cn('hidden shrink-0 border-r border-line/60 bg-panel md:block md:min-h-screen', collapsed ? 'md:w-16' : 'md:w-56')}>
        <div className="flex items-center justify-between px-4 py-5">
          <Link href="/admin" className={cn('font-serif text-lg font-semibold text-ivory', collapsed && 'md:sr-only')}>Admin</Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1.5 text-mute hover:bg-raised hover:text-ivory"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav aria-label="Admin sidebar" className="flex flex-col gap-1 px-2">
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
        <header className="hidden items-center gap-3 border-b border-line/60 bg-panel/60 px-4 py-3 md:flex">
          <form action="/admin/search" className="relative max-w-sm flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <input
              name="q"
              type="search"
              placeholder="Search draws, users, orders"
              aria-label="Search the admin area"
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
              <a href="/preview?on=1&next=/results" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mute hover:bg-raised hover:text-ivory"><Globe aria-hidden className="h-4 w-4" />Preview as customer</a>
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
