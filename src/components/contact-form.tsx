'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { contactAction, type ContactState } from '@/actions/contact';
import { FormMessage, SubmitButton } from '@/components/submit-button';

const input = 'mt-1 w-full rounded-xl border border-line bg-night px-4 text-ivory placeholder:text-mute/60';
const none: ContactState = {};

export function ContactForm() {
  const [state, action] = useActionState(contactAction, none);
  if (state.ok) return <FormMessage ok={state.ok} />;
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm text-mute">
        Your name
        <input className={`${input} h-11`} name="name" required autoComplete="name" maxLength={80} defaultValue={state.name} />
      </label>
      <label className="block text-sm text-mute">
        Email
        <input className={`${input} h-11`} type="email" name="email" required autoComplete="email" maxLength={190} defaultValue={state.email} />
      </label>
      <label className="block text-sm text-mute">
        Message
        <textarea className={`${input} py-3`} name="message" required minLength={10} maxLength={3000} rows={6} defaultValue={state.message} />
      </label>
      <div aria-hidden className="absolute -left-[9999px]">
        <label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className="text-xs text-mute">We use your name, email and message only to reply to you. See the <Link href="/privacy" className="text-gold-bright underline underline-offset-4">Privacy policy</Link>.</p>
      <FormMessage error={state.error} />
      <SubmitButton size="lg" pendingText="Sending..." className="w-full">Send message</SubmitButton>
    </form>
  );
}
