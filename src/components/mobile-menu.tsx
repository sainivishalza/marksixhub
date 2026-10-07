'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import { logoutAction } from '@/actions/account';
import { cn } from '@/lib/utils';

type Props = { nav: { href: string; label: string }[]; loggedIn: boolean; canAdmin: boolean };

const row = 'flex items-center gap-3 rounded-xl px-4 py-3 text-base text-ivory hover:bg-raised';

/** The phone menu: a button in the header that opens a full-width panel. Closes on navigation and Escape. */
export function MobileMenu({ nav, loggedIn, canAdmin }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

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
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ivory hover:border-gold"
      >
        {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
      </button>
      {open ? (
        <div id="site-menu" className="absolute inset-x-0 top-full z-40 h-[calc(100dvh-4.1rem)] overflow-y-auto border-t border-line/60 bg-night p-3">
          <nav aria-label="Main menu" className="flex flex-col">
            {nav.map((l) => (
              <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? 'page' : undefined} className={cn(row, path.startsWith(l.href) && 'bg-raised text-gold-bright')}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 border-t border-line/60 pt-3">
            {loggedIn ? (
              <div className="flex flex-col">
                {canAdmin ? (
                  <Link href="/admin" className={row}><ShieldCheck aria-hidden className="h-4 w-4 text-gold" />Admin</Link>
                ) : null}
                <Link href="/account" className={row}><User aria-hidden className="h-4 w-4 text-gold" />My account</Link>
                <form action={logoutAction}>
                  <button type="submit" className={cn(row, 'w-full text-left text-mute')}><LogOut aria-hidden className="h-4 w-4" />Log out</button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" className="rounded-xl border border-line px-4 py-3 text-center text-base text-ivory hover:border-gold">Log in</Link>
                <Link href="/register" className="rounded-xl bg-gold px-4 py-3 text-center text-base font-medium text-night hover:bg-gold-bright">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
