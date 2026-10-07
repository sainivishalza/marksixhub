'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { saveDrawAction, type DrawFormState } from '@/actions/admin';
import { Field, inputClass, Panel } from '@/components/admin/ui';
import { FormMessage, SubmitButton } from '@/components/submit-button';
import { buttonVariants } from '@/components/ui/button';
import { DIVISION_LABEL, DIVISION_RULE } from '@/lib/mark6';
import type { Draw, Prize } from '@/lib/types';

const none: DrawFormState = {};

export function DrawForm({ draw, prizes }: { draw?: Draw; prizes?: Prize[] }) {
  const [state, action] = useActionState(saveDrawAction, none);
  const raw = state.raw;
  // After a failed save, show what the person typed; otherwise show the saved draw.
  const val = (name: string, fallback: string | number | null | undefined) => raw?.[name] ?? (fallback ?? '').toString();
  const prize = (division: number) => prizes?.find((p) => p.division === division);

  return (
    <form action={action} className="max-w-4xl space-y-6">
      <input type="hidden" name="id" value={draw?.id ?? ''} />
      {state.errors?.map((e) => <FormMessage key={e} error={e} />)}

      <Panel title="Draw">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Draw number" hint="Like 26/081">
            <input name="draw_no" required pattern="\d{2}/\d{3}" maxLength={6} defaultValue={val('draw_no', draw?.drawNo)} className={inputClass} />
          </Field>
          <Field label="Draw date">
            <input type="date" name="draw_date" required defaultValue={val('draw_date', draw?.drawDate)} className={inputClass} />
          </Field>
          <Field label="Status" hint="Drafts are hidden from the public">
            <select name="status" defaultValue={val('status', draw?.status ?? 'upcoming')} className={inputClass}>
              <option value="upcoming">Draft or upcoming</option>
              <option value="published">Published (result known)</option>
            </select>
          </Field>
          <Field label="Estimated first prize (HK$)" hint="Shown for upcoming draws">
            <input type="number" name="est_jackpot_hkd" min={0} defaultValue={val('est_jackpot_hkd', draw?.estJackpotHkd || '')} className={inputClass} />
          </Field>
          <Field label="Note (shown publicly)" className="sm:col-span-2">
            <input name="note" maxLength={255} defaultValue={val('note', draw?.note)} className={inputClass} />
          </Field>
        </div>
      </Panel>

      <Panel title="Winning numbers">
        <p className="mb-3 text-sm text-mute">Required when the status is Published: six different numbers and a different extra number, all from 1 to 49.</p>
        <div className="flex flex-wrap items-end gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <label key={i} className="text-xs text-mute">
              <span className="mb-1 block">No. {i}</span>
              <input type="number" name={`n${i}`} min={1} max={49} defaultValue={val(`n${i}`, draw?.numbers[i - 1])} className={`${inputClass} w-20 font-mono`} />
            </label>
          ))}
          <label className="text-xs text-gold-bright">
            <span className="mb-1 block">Extra</span>
            <input type="number" name="extra" min={1} max={49} defaultValue={val('extra', draw?.extra)} className={`${inputClass} w-20 border-gold/60 font-mono`} />
          </label>
        </div>
      </Panel>

      <Panel title="Prizes by division (HK$)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-mute">
              <tr><th scope="col" className="py-2 pr-3 font-medium">Prize</th><th scope="col" className="py-2 pr-3 font-medium">Match</th><th scope="col" className="py-2 pr-3 font-medium">Winners</th><th scope="col" className="py-2 font-medium">Prize per unit (HK$)</th></tr>
            </thead>
            <tbody>
              {DIVISION_LABEL.map((label, i) => {
                const n = i + 1;
                return (
                  <tr key={label} className="border-t border-line/40">
                    <th scope="row" className="py-2 pr-3 font-serif text-base font-medium text-gold-bright">{label}</th>
                    <td className="py-2 pr-3 text-mute">{DIVISION_RULE[i]}</td>
                    <td className="py-2 pr-3"><input type="number" name={`w${n}`} min={0} aria-label={`Winners, ${label} prize`} defaultValue={val(`w${n}`, prize(n)?.winners ?? 0)} className={`${inputClass} w-28 font-mono`} /></td>
                    <td className="py-2"><input type="number" name={`p${n}`} min={0} aria-label={`Prize per unit, ${label} prize`} defaultValue={val(`p${n}`, prize(n)?.prizeHkd ?? 0)} className={`${inputClass} w-40 font-mono`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-mute">Prizes are saved only for published draws. Use 0 for a division with no winner.</p>
      </Panel>

      <div className="flex gap-3">
        <SubmitButton size="lg" pendingText="Saving...">{draw ? 'Save changes' : 'Add draw'}</SubmitButton>
        <Link href="/admin/draws" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>Cancel</Link>
      </div>
    </form>
  );
}
