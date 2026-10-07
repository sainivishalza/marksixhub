import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetForm } from '@/components/auth-forms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = ((await searchParams).token ?? '').slice(0, 100);
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Choose a new password</h1>
      {token ? (
        <div className="surface mt-8 p-6">
          <ResetForm token={token} />
        </div>
      ) : (
        <p className="mt-4 text-mute">This link is not complete. <Link href="/forgot" className="text-gold-bright underline-offset-4 hover:underline">Ask for a new one</Link>.</p>
      )}
    </div>
  );
}
