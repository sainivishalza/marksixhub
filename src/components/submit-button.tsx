'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';

export function SubmitButton({ children, pendingText = 'Working...', ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded-lg border border-miss/40 bg-miss/10 px-3 py-2 text-sm text-miss">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">{ok}</p>;
  return null;
}
