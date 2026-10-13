import { cookies } from 'next/headers';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getUser } from '@/lib/auth';
import { PREVIEW_COOKIE } from '@/lib/history';
import { can } from '@/lib/perms';
import { getSettings } from '@/lib/settings';

/** Public pages: header, footer, announcement banner and maintenance mode. The admin area has its own shell. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getUser()]);
  // Staff can still browse while maintenance mode is on.
  const closed = settings.maintenance && !can(user?.role, 'view');
  const previewing = can(user?.role, 'view') && (await cookies()).get(PREVIEW_COOKIE)?.value === '1';

  if (closed) {
    return (
      <main id="main" className="mx-auto grid min-h-screen max-w-xl place-items-center px-6 text-center">
        <div>
          <h1 className="text-4xl">Back soon</h1>
          <p className="mt-3 text-mute">{settings.siteName} is down for a short update. Please check again in a few minutes.</p>
          <p className="mt-6">
            <a href="/login" className="text-sm text-mute underline-offset-4 hover:text-gold-bright hover:underline">Staff log in</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {previewing ? (
        <p role="status" className="border-b border-win/40 bg-win/10 px-4 py-2 text-center text-sm text-win">
          Previewing as a customer: locked results and points rules apply, as visitors see them.{' '}
          <a href="/preview?on=0&next=/results" className="font-medium underline underline-offset-4">Exit preview</a>
        </p>
      ) : null}
      {settings.announcement ? (
        <p role="status" className="border-b border-gold/30 bg-gold/10 px-4 py-2 text-center text-sm text-gold-bright">{settings.announcement}</p>
      ) : null}
      <SiteHeader siteName={settings.siteName} user={user} />
      <main id="main">{children}</main>
      <SiteFooter siteName={settings.siteName} />
    </>
  );
}
