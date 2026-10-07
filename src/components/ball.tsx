import { ballTone } from '@/lib/mark6';
import { cn } from '@/lib/utils';

const SIZE = { sm: 'h-8 w-8 text-xs', md: 'h-11 w-11 text-base', lg: 'h-14 w-14 text-xl' } as const;

// Written out in full so Tailwind can see every class name (it cannot read `ball-${tone}`).
const TONE_CLASS = { red: 'ball ball-red', blue: 'ball ball-blue', green: 'ball ball-green' } as const;

export const ballClass = (n: number) => TONE_CLASS[ballTone(n)];

// A number that is not picked yet: a coloured ring. Picking it turns it into the full ball above.
const RING_CLASS = { red: 'border-tone-red', blue: 'border-tone-blue', green: 'border-tone-green' } as const;
export const ringClass = (n: number) => `rounded-full border-2 bg-transparent font-mono font-bold tabular-nums text-ivory ${RING_CLASS[ballTone(n)]}`;

type Props = { n: number; size?: keyof typeof SIZE; extra?: boolean; className?: string };

/** Static ball, safe in server components. */
export function NumberBall({ n, size = 'md', extra = false, className }: Props) {
  return (
    <span
      className={cn(ballClass(n), SIZE[size], extra && 'ball-extra', className)}
      aria-label={extra ? `Extra number ${n}` : `Number ${n}`}
    >
      {n}
    </span>
  );
}

export function BallRow({ numbers, extra, size = 'md' }: { numbers: number[]; extra?: number | null; size?: keyof typeof SIZE }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Winning numbers">
      {numbers.map((n) => (
        <NumberBall key={n} n={n} size={size} />
      ))}
      {extra ? (
        <>
          <span aria-hidden className="mx-1 font-mono text-gold">+</span>
          <NumberBall n={extra} size={size} extra />
        </>
      ) : null}
    </div>
  );
}
