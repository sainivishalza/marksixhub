import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth-forms';
import { getUser } from '@/lib/auth';
import { can } from '@/lib/perms';
import { safeNext } from '@/lib/validate';

export const metadata: Metadata = { title: 'Log in', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  const user = await getUser();
  // Only an explicit ?next= is forced; otherwise the form lets staff land on /admin and everyone else on /account.
  const requested = safeNext(next, '');
  if (user) redirect(requested || (can(user.role, 'view') ? '/admin' : '/account'));
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Log in</h1>
      <p className="mb-8 mt-2 text-mute">Save your favourite number sets and keep your currency.</p>
      {reset ? <p role="status" className="mb-4 rounded-lg border border-win/40 bg-win/10 px-4 py-2 text-sm text-win">Password changed. Log in with your new password.</p> : null}
      <div className="surface p-6">
        <LoginForm next={requested} />
      </div>
      <p className="mt-6 text-sm text-mute">
        <Link href="/forgot" className="text-gold-bright underline-offset-4 hover:underline">Forgot your password?</Link>
        <br />
        New here? <Link href="/register" className="text-gold-bright underline-offset-4 hover:underline">Create a free account</Link>
      </p>
    </div>
  );
}
