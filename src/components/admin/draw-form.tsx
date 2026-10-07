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
const money = `${inputClass} font-mono`;

export function DrawForm({ draw, prizes, suggestedNo }: { draw?: Draw; prizes?: Prize[]; suggestedNo?: string }) {
  const [state, action] = useActionState(saveDrawAction, none);
  const raw = state.raw;
  // After a failed save, show what the person typed; otherwise show the saved draw.
  const val = (name: string, fallback: string | number | null | undefined) => raw?.[name] ?? (fallback ?? '').toString();
  const prize = (division: number) => prizes?.find((p) => p.division === division);

  return (
    <form action={action} className="max-w-4xl">
      {/* The key changes after every failed save, so the fields remount with exactly what was typed. */}
      <div key={state.n ?? 0} className="space-y-6">
        <input type="hidden" name="id" value={draw?.id ?? ''} />
        {state.errors?.map((e) => <FormMessage key={e} error={e} />)}

        <Panel title="Next draw details">
          <p className="mb-4 text-sm text-mute">Only the draw number and date are needed to announce a draw. Fill in the rest when the HKJC publishes it; leave any box empty if it is not known yet.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Draw number" hint="Like 26/107">
              <input name="draw_no" required pattern="\d{2}/\d{3}" maxLength={6} defaultValue={val('draw_no', draw?.drawNo ?? suggestedNo)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Draw date">
              <input type="date" name="draw_date" required defaultValue={val('draw_date', draw?.drawDate)} className={inputClass} />
            </Field>
            <Field label="Stop selling time" hint="Hong Kong time, like 21:15 for 9:15 PM">
              <input type="time" name="stop_selling" defaultValue={val('stop_selling', draw?.stopSelling)} className={inputClass} />
            </Field>
            <Field label="Turnover (HK$)">
              <input name="turnover_hkd" inputMode="numeric" placeholder="14675740" defaultValue={val('turnover_hkd', draw?.turnoverHkd)} className={money} />
            </Field>
            <Field label="Jackpot / Snowball (HK$)">
              <input name="snowball_hkd" inputMode="numeric" placeholder="8000000" defaultValue={val('snowball_hkd', draw?.snowballHkd)} className={money} />
            </Field>
            <Field label="Estimated 1st division prize (HK$)">
              <input name="est_jackpot_hkd" inputMode="numeric" placeholder="13000000" defaultValue={val('est_jackpot_hkd', draw?.estJackpotHkd || '')} className={money} />
            </Field>
            <Field label="Fund (HK$)">
              <input name="fund_hkd" inputMode="numeric" defaultValue={val('fund_hkd', draw?.fundHkd)} className={money} />
            </Field>
            <Field label="Note (shown publicly)" className="sm:col-span-2">
              <input name="note" maxLength={255} defaultValue={val('note', draw?.note)} className={inputClass} />
            </Field>
            <Field label="Show on the site as" hint="Keep Upcoming until the numbers are drawn">
              <select name="status" defaultValue={val('status', draw?.status ?? 'upcoming')} className={inputClass}>
                <option value="upcoming">Upcoming draw</option>
                <option value="published">Result published</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Result (add after the draw)">
          <p className="mb-3 text-sm text-mute">Leave these empty while the draw is upcoming. After the draw: enter the six winning numbers and the extra number, then set &quot;Show on the site as&quot; to Result published.</p>
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

        <Panel title="Prizes by division (add after the draw)">
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
                      <td className="py-2 pr-3"><input name={`w${n}`} inputMode="numeric" aria-label={`Winners, ${label} prize`} defaultValue={val(`w${n}`, prize(n)?.winners ?? 0)} className={`${money} w-28`} /></td>
                      <td className="py-2"><input name={`p${n}`} inputMode="numeric" aria-label={`Prize per unit, ${label} prize`} defaultValue={val(`p${n}`, prize(n)?.prizeHkd ?? 0)} className={`${money} w-40`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-mute">Prizes are saved only for a published result. Use 0 for a division with no winner.</p>
        </Panel>

        <div className="flex gap-3">
          <SubmitButton size="lg" pendingText="Saving...">{draw ? 'Save changes' : 'Save draw'}</SubmitButton>
          <Link href="/admin/draws" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>Cancel</Link>
        </div>
      </div>
    </form>
  );
}
