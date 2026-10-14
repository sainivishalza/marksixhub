'use client';

import { useActionState } from 'react';
import { findPayAction, sendPointsAction, type TransferState } from '@/actions/transfer';
import { FormMessage, SubmitButton } from '@/components/submit-button';

const input = 'mt-1 h-11 w-full rounded-xl border border-line bg-night px-4 text-ivory placeholder:text-mute/60';
const none: TransferState = {};

export function FindPayForm() {
  const [state, action] = useActionState(findPayAction, none);
  return (
    <form action={action} className="max-w-md space-y-3">
      <label className="block text-sm text-mute">
        Pay code or link
        <input className={input} name="code" required maxLength={200} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABCDE23456 or the pay link" />
      </label>
      <FormMessage error={state.error} />
      <SubmitButton variant="outline" pendingText="Checking...">Continue</SubmitButton>
    </form>
  );
}

export function PayForm({ code, idem, needsOtp, max }: { code: string; idem: string; needsOtp: boolean; max: number }) {
  const [state, action] = useActionState(sendPointsAction, none);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="idem" value={idem} />
      <label className="block text-sm text-mute">
        Points to send
        <input className={`${input} font-mono text-lg`} name="amount" type="text" inputMode="numeric" pattern="[0-9]*" required maxLength={9} autoComplete="off" placeholder={`1 to ${max.toLocaleString('en-US')}`} defaultValue={state.amount} />
      </label>
      <label className="block text-sm text-mute">
        Your password, to confirm
        <input className={input} type="password" name="password" required autoComplete="current-password" maxLength={200} />
      </label>
      {needsOtp ? (
        <label className="block text-sm text-mute">
          Authenticator code
          <input className={input} name="otp" required inputMode="numeric" autoComplete="one-time-code" maxLength={8} />
        </label>
      ) : null}
      <FormMessage error={state.error} />
      <SubmitButton size="lg" pendingText="Sending..." className="w-full">Send points</SubmitButton>
    </form>
  );
}
