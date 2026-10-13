import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 16px text on phones: smaller text makes iPhones zoom the page when a field is tapped.
export const inputClass = 'h-11 w-full rounded-lg border border-line bg-night px-3 text-base text-ivory placeholder:text-mute/60 sm:h-10 sm:text-sm';
export const textareaClass = 'w-full rounded-lg border border-line bg-night px-3 py-2 text-base text-ivory placeholder:text-mute/60 sm:text-sm';

export function PageHeader({ title, children, description }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="break-words text-2xl sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-[70ch] text-sm text-mute">{description}</p> : null}
      </div>
      {children ? (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap max-sm:w-full max-sm:[&>*:first-child:nth-last-child(n+3)]:col-span-2 max-sm:[&>*:only-child]:col-span-2">{children}</div>
      ) : null}
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
    <section className={cn('rounded-2xl border border-line bg-panel/70 p-4 sm:p-5', className)}>
      {title ? <h2 className="mb-4 text-lg sm:text-xl">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, className }: { label: string; value: string | number; hint?: string; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-panel/70 p-4 sm:p-5', className)}>
      <p className="text-sm text-mute">{label}</p>
      <p className="mt-1 break-words font-mono text-2xl font-semibold tabular-nums text-ivory sm:text-3xl">{typeof value === 'number' ? value.toLocaleString('en') : value}</p>
      {hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

type Cell = ReactElement<{ children?: ReactNode; scope?: string }>;

/**
 * Data table. From md up it is a table that scrolls inside its own box. On a phone every row becomes a card:
 * the first cell is the title, the others sit in two columns with a small caption above each value, and cells
 * whose column is listed in `wide` (or has no heading, like an actions column) take the full width.
 */
export function AdminTable({ caption, head, children, empty, wide = [] }: { caption: string; head: string[]; children: ReactNode; empty?: ReactNode; wide?: string[] }) {
  const rows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    const cells = Children.toArray((row as ReactElement<{ children?: ReactNode }>).props.children) as Cell[];
    let col = 0;
    const labelled = cells.map((cell) => {
      if (!isValidElement(cell)) return cell;
      const index = col++;
      if (cell.type === 'th' && cell.props.scope === 'row') return cell;
      const label = head[index] ?? '';
      const full = label === '' || wide.includes(label);
      return cloneElement(cell, { 'data-label': label || undefined, 'data-wide': full ? '' : undefined } as Record<string, unknown>);
    });
    return cloneElement(row as ReactElement, undefined, ...labelled);
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-line max-md:overflow-visible max-md:border-0">
      <table className="rt w-full min-w-[40rem] text-left text-sm max-md:min-w-0">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-panel text-mute">
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} scope="col" className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line/50">{rows}</tbody>
      </table>
      {empty}
    </div>
  );
}
