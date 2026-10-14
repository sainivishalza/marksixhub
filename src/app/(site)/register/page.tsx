import { parseInviteCode } from '@/lib/referral-rules';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth-forms';
import { AuthShell } from '@/components/auth-shell';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Create account', robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const invite = parseInviteCode((await searchParams).ref ?? '') ?? '';
  if (await getUser()) redirect('/account');
  const { signupPoints, inviteWelcome } = await getSettings();
  return (
    <AuthShell title="Create a free account" intro="Place orders with free play points, keep your receipts and follow every result. The picker stays free to use without an account." welcome={signupPoints}>
      <div className="surface p-6 sm:p-8">
        <h2 className="mb-5 font-serif text-2xl">Sign up</h2>
        {invite && inviteWelcome > 0 ? <p role="status" className="mb-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold-bright">A friend invited you. Get your first order approved and you get {inviteWelcome.toLocaleString('en-US')} extra points.</p> : null}
        <RegisterForm invite={invite} />
        <p className="mt-6 text-sm text-mute">
          Already registered? <Link href="/login" className="text-gold-bright underline-offset-4 hover:underline">Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
