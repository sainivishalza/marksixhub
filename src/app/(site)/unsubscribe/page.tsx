import type { Metadata } from 'next';
import Link from 'next/link';
import { unsubscribeAction } from '@/actions/account';
import { Button } from '@/components/ui/button';
import { readUnsubscribeToken } from '@/lib/reminders';

export const metadata: Metadata = { title: 'Stop draw reminders', robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t = '', done } = await searchParams;
  const valid = readUnsubscribeToken(t.slice(0, 60)) !== null;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Draw reminders</h1>
      {done === '1' ? (
        <p role="status" className="mt-6 rounded-xl border border-win/40 bg-win/10 px-4 py-3 text-win">Done. You will not get draw reminder emails any more.</p>
      ) : valid ? (
        <form action={unsubscribeAction} className="mt-6 space-y-4">
          <p className="text-mute">Stop the reminder emails sent before each draw closes?</p>
          <input type="hidden" name="t" value={t} />
          <Button type="submit" size="lg">Stop reminders</Button>
        </form>
      ) : (
        <p role="alert" className="mt-6 rounded-xl border border-miss/40 bg-miss/10 px-4 py-3 text-miss">
          This link is not valid. You can change reminders any time under Account → Settings.
        </p>
      )}
      <p className="mt-8 text-sm text-mute"><Link href="/account/settings#reminders" className="text-gold-bright underline underline-offset-4">Account settings</Link></p>
    </div>
  );
}
