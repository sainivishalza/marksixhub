import { Award, Lock } from 'lucide-react';
import type { AchievementView } from '@/lib/achievements';
import { cn } from '@/lib/utils';

/** Earned badges in gold, the rest dimmed with their goal. Badges never pay points. */
export function Achievements({ items }: { items: AchievementView[] }) {
  const earned = items.filter((a) => a.earned).length;
  return (
    <section aria-labelledby="achievements" className="surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="achievements" className="font-serif text-xl">Achievements</h2>
        <p className="text-sm text-mute">{earned} of {items.length}</p>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <li key={a.code} className={cn('flex items-start gap-3 rounded-xl border p-3', a.earned ? 'border-gold/50 bg-gold/10' : 'border-line/60 opacity-70')}>
            {a.earned ? <Award aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-gold-bright" /> : <Lock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-mute" />}
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-ivory">
                {a.title}
                <span className="sr-only">{a.earned ? ', earned' : ', locked'}</span>
                {a.isNew ? <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase text-night">New</span> : null}
              </span>
              <span className="block text-mute">{a.text}</span>
              {!a.earned && a.progress ? <span className="mt-1 block font-mono text-xs text-mute">{a.progress.have} of {a.progress.goal}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
