import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyEmailAction } from '@/actions/account';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Confirm email', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = '', error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Confirm your email</h1>
      {error ? (
        <p role="alert" className="mt-4 text-miss">
          This link has expired or was already used. Log in and press &ldquo;Send me a new link&rdquo; in <Link href="/account" className="underline underline-offset-4">My account</Link>.
        </p>
      ) : token ? (
        <form action={verifyEmailAction} className="mt-6">
          <input type="hidden" name="token" value={token.slice(0, 100)} />
          <p className="mb-4 text-mute">One more click to confirm that this address is yours.</p>
          <Button type="submit" size="lg">Confirm my email</Button>
        </form>
      ) : (
        <p className="mt-4 text-mute">This link is not complete. Open the link from your email again.</p>
      )}
    </div>
  );
}
