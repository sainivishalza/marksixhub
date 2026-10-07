import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputClass = 'h-10 w-full rounded-lg border border-line bg-night px-3 text-sm text-ivory placeholder:text-mute/60';
export const textareaClass = 'w-full rounded-lg border border-line bg-night px-3 py-2 text-sm text-ivory placeholder:text-mute/60';

export function PageHeader({ title, children, description }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-[70ch] text-sm text-mute">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

/** Success / error banner driven by ?ok= and ?error= after an action redirects back. */
export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="mb-4 rounded-lg border border-miss/40 bg-miss/10 px-4 py-2 text-sm text-miss">{error}</p>;
  if (ok) return <p role="status" className="mb-4 rounded-lg border border-win/40 bg-win/10 px-4 py-2 text-sm text-win">{ok}</p>;
  return null;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block text-sm text-mute', className)}>
      <span className="mb-1 block">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-mute/80">{hint}</span> : null}
    </label>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-panel/70 p-5', className)}>
      {title ? <h2 className="mb-4 text-xl">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-5">
      <p className="text-sm text-mute">{label}</p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-ivory">{typeof value === 'number' ? value.toLocaleString('en') : value}</p>
      {hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

/** Responsive data table: scrolls sideways inside its own box instead of breaking the page. */
export function AdminTable({ caption, head, children, empty }: { caption: string; head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-panel text-mute">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line/50">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
