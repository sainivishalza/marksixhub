import Link from 'next/link';
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME } from '@/lib/seo';

const LINKS = [
  { href: '/picker', label: 'Number picker' },
  { href: '/results', label: 'Results' },
  { href: '/guide', label: 'How to play' },
  { href: '/statistics', label: 'Statistics' },
  { href: '/check', label: 'Number checker' },
  { href: '/faq', label: 'FAQ' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function SiteFooter({ siteName = SITE_NAME }: { siteName?: string }) {
  return (
    <footer className="mt-24 border-t border-line/60 bg-panel/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div className="max-w-[68ch] space-y-3 text-sm leading-relaxed text-mute">
          <p className="font-serif text-lg text-ivory"><Link href="/" className="hover:text-gold-bright">{siteName}</Link></p>
          <p>
            {siteName} is an independent information site. It is not affiliated with or endorsed by the Hong Kong Jockey Club. We do not
            sell tickets, take bets or hold money. Mark Six can only be played through the HKJC, where it is legal.
          </p>
          <p>Play responsibly. Gambling can be addictive and is for adults only. Never spend money you cannot afford to lose.</p>
          <p>
            Email: <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block py-2 text-gold-bright hover:underline">{CONTACT_EMAIL}</a>
            {CONTACT_PHONE ? (
              <>
                {' · '}
                <a href={`tel:${CONTACT_PHONE.replace(/[^\d+]/g, '')}`} className="text-gold-bright hover:underline">{CONTACT_PHONE}</a>
              </>
            ) : null}
          </p>
          <p>Prize amounts in other currencies are indicative conversions from Hong Kong dollars.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-block py-2 text-mute hover:text-gold-bright">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="border-t border-line/40 py-4 text-center text-xs text-mute">&copy; {new Date().getFullYear()} {siteName}</p>
    </footer>
  );
}
