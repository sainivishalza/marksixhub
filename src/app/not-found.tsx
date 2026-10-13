import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const metadata = { title: 'Page not found', robots: { index: false, follow: false } };

const link = 'rounded-lg border border-line px-4 py-3 text-gold-bright hover:border-gold';

export default async function NotFound() {
  const [settings, user] = await Promise.all([getSettings(), getUser()]);
  return (
    <>
      <SiteHeader siteName={settings.siteName} user={user} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="font-mono text-gold-bright">404</p>
        <h1 className="mt-2 text-4xl">That page does not exist</h1>
        <p className="mt-3 text-mute">The link may be old or mistyped. Try one of these instead.</p>
        <p className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={link}>Home</Link>
          <Link href="/picker" className={link}>Number picker</Link>
          <Link href="/results" className={link}>Results</Link>
          <Link href="/faq" className={link}>FAQ</Link>
        </p>
      </main>
      <SiteFooter siteName={settings.siteName} />
    </>
  );
}
