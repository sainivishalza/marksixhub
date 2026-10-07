import { cn } from '@/lib/utils';

/** Seven days of daily points: filled dots are days kept in a row. */
export function Streak({ days }: { days: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Daily streak: ${days} of 7 days`}>
      {Array.from({ length: 7 }, (_, i) => (
        <li key={i} aria-hidden className={cn('h-2.5 w-7 rounded-full', i < days ? 'bg-gold-bright' : 'bg-white/10')} />
      ))}
    </ol>
  );
}
