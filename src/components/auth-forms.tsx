'use client';

import { useActionState } from 'react';
import { changePasswordAction, forgotPasswordAction, loginAction, resetPasswordAction, registerAction, type FormState } from '@/actions/account';
import { FormMessage, SubmitButton } from '@/components/submit-button';

const input = 'mt-1 h-11 w-full rounded-xl border border-line bg-night px-4 text-ivory placeholder:text-mute/60';
const none: FormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, none);
  return (
    <form key={state.email ?? ''} action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm text-mute">
        Email
        <input className={input} type="email" name="email" required autoComplete="email" maxLength={190} defaultValue={state.email} />
      </label>
      <label className="block text-sm text-mute">
        Password
        <input className={input} type="password" name="password" required autoComplete="current-password" maxLength={200} />
      </label>
      <label className="block text-sm text-mute">
        Authentication code <span className="text-mute/70">(only if you turned on two-step login)</span>
        <input className={input} type="text" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} />
      </label>
      <FormMessage error={state.error} />
      <SubmitButton size="lg" pendingText="Logging in..." className="w-full">Log in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, none);
  return (
    <form key={state.email ?? ''} action={action} className="space-y-4">
      <label className="block text-sm text-mute">
        Email
        <input className={input} type="email" name="email" required autoComplete="email" maxLength={190} defaultValue={state.email} />
      </label>
      <label className="block text-sm text-mute">
        Password (at least 10 characters)
        <input className={input} type="password" name="password" required minLength={10} maxLength={200} autoComplete="new-password" />
      </label>
      <FormMessage error={state.error} />
      <SubmitButton size="lg" pendingText="Creating account..." className="w-full">Create account</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, none);
  return (
    <form action={action} className="max-w-sm space-y-4">
      <label className="block text-sm text-mute">
        Current password
        <input className={input} type="password" name="current" required autoComplete="current-password" maxLength={200} />
      </label>
      <label className="block text-sm text-mute">
        New password (at least 10 characters)
        <input className={input} type="password" name="next_password" required minLength={10} maxLength={200} autoComplete="new-password" />
      </label>
      <FormMessage error={state.error} ok={state.ok} />
      <SubmitButton variant="outline" pendingText="Saving...">Change password</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, none);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm text-mute">
        Email
        <input className={input} type="email" name="email" required autoComplete="email" maxLength={190} defaultValue={state.email} />
      </label>
      <FormMessage error={state.error} ok={state.ok} />
      <SubmitButton size="lg" pendingText="Sending..." className="w-full">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, none);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm text-mute">
        New password (at least 10 characters)
        <input className={input} type="password" name="password" required minLength={10} maxLength={200} autoComplete="new-password" />
      </label>
      <FormMessage error={state.error} />
      <SubmitButton size="lg" pendingText="Saving..." className="w-full">Set new password</SubmitButton>
    </form>
  );
}
