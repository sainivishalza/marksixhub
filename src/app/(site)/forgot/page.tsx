import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotForm } from '@/components/auth-forms';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Forgot your password?</h1>
      <p className="mb-8 mt-2 text-mute">Enter your email and we will send you a link to choose a new one.</p>
      <div className="surface p-6">
        <ForgotForm />
      </div>
      <p className="mt-6 text-sm text-mute"><Link href="/login" className="text-gold-bright underline-offset-4 hover:underline">Back to log in</Link></p>
    </div>
  );
}
