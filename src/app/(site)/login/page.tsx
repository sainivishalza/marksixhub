import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth-forms';
import { getUser } from '@/lib/auth';
import { can } from '@/lib/perms';
import { safeNext } from '@/lib/validate';

export const metadata: Metadata = { title: 'Log in', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getUser();
  const target = safeNext(next, user && can(user.role, 'view') ? '/admin' : '/account');
  if (user) redirect(target);
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Log in</h1>
      <p className="mb-8 mt-2 text-mute">Save your favourite number sets and keep your currency.</p>
      <div className="surface p-6">
        <LoginForm next={target} />
      </div>
      <p className="mt-6 text-sm text-mute">
        New here? <Link href="/register" className="text-gold-bright underline-offset-4 hover:underline">Create a free account</Link>
      </p>
    </div>
  );
}
