'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 text-mute">We could not load this page. Your numbers are not affected. Try again in a moment.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
