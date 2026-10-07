'use client';

import { Grid3x3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fire = (name: string) => () => {
  document.getElementById('board')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.dispatchEvent(new Event(name));
};

export function HeroActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button size="lg" onClick={fire('mh:quickpick')}>
        <Sparkles aria-hidden className="h-4 w-4" />
        Quick pick
      </Button>
      <Button size="lg" variant="outline" onClick={fire('mh:focusboard')}>
        <Grid3x3 aria-hidden className="h-4 w-4" />
        Choose manually
      </Button>
    </div>
  );
}
