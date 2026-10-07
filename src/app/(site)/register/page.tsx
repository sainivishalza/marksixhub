import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth-forms';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create account', robots: { index: false, follow: false } };

export default async function RegisterPage() {
  if (await getUser()) redirect('/account');
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Create a free account</h1>
      <p className="mb-8 mt-2 text-mute">An account lets you save number sets and keep your display currency. You never need one to use the picker.</p>
      <div className="surface p-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-mute">
        Already registered? <Link href="/login" className="text-gold-bright underline-offset-4 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
