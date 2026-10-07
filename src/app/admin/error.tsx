'use client';

import { Button } from '@/components/ui/button';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl">This page could not load</h1>
      <p className="mt-2 text-mute">Your changes up to the last save are safe. Check the database connection, then try again.</p>
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </div>
  );
}
