import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth-forms';
import { AuthShell } from '@/components/auth-shell';
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
    <AuthShell title="Welcome back" intro="Log in to see your orders, receipts and points.">
      <div className="surface p-6 sm:p-8">
        <h2 className="mb-5 font-serif text-2xl">Log in</h2>
        {reset ? <p role="status" className="mb-4 rounded-xl border border-win/40 bg-win/10 px-4 py-2 text-sm text-win">Password changed. Log in with your new password.</p> : null}
        <LoginForm next={requested} />
        <p className="mt-6 space-y-2 text-sm text-mute">
          <Link href="/forgot" className="block text-gold-bright underline-offset-4 hover:underline">Forgot your password?</Link>
          <span className="block">New here? <Link href="/register" className="text-gold-bright underline-offset-4 hover:underline">Create a free account</Link></span>
        </p>
      </div>
    </AuthShell>
  );
}
