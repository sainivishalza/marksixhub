'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** Share sheet on phones, copy-to-clipboard elsewhere. */
export function ShareLink({ url, title, text }: { url: string; title: string; text: string }) {
  const [note, setNote] = useState('');
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote('Link copied.');
    } catch {
      setNote('Select the link above and copy it.');
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={share}>Share my invite link</Button>
      <span role="status" className="text-sm text-mute">{note}</span>
    </div>
  );
}
