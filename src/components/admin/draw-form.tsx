'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { saveDrawAction, type DrawFormState } from '@/actions/admin';
import { Field, inputClass, Panel } from '@/components/admin/ui';
import { NumberBoxes } from '@/components/number-boxes';
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
          <p className="mb-2 text-sm text-ivory">Six winning numbers</p>
          <NumberBoxes
            label="Six winning numbers"
            fieldNames={['n1', 'n2', 'n3', 'n4', 'n5', 'n6']}
            defaultCells={[1, 2, 3, 4, 5, 6].map((i) => val(`n${i}`, draw?.numbers[i - 1]))}
            className="max-w-md"
          />
          <p className="mb-2 mt-5 text-sm text-gold-bright">Extra number</p>
          <NumberBoxes label="Extra number" count={1} variant="gold" fieldNames={['extra']} defaultCells={[val('extra', draw?.extra)]} className="w-[3.25rem] sm:w-14" />
        </Panel>

        <Panel title="Prizes by division (add after the draw)">
          <div className="hidden grid-cols-[4.5rem_1fr_9rem_11rem] gap-3 border-b border-line/50 pb-2 text-sm text-mute sm:grid" aria-hidden>
            <span>Prize</span>
            <span>Match</span>
            <span>Winning units</span>
            <span>Prize per unit (HK$)</span>
          </div>
          <div className="divide-y divide-line/40">
            {DIVISION_LABEL.map((label, i) => {
              const n = i + 1;
              return (
                <div key={label} className="grid grid-cols-2 gap-x-3 gap-y-2 py-3 sm:grid-cols-[4.5rem_1fr_9rem_11rem] sm:items-center">
                  <p className="col-span-2 font-serif text-lg font-medium text-gold-bright sm:col-span-1">{label}</p>
                  <p className="col-span-2 text-sm text-mute sm:col-span-1">{DIVISION_RULE[i]}</p>
                  <label className="block text-xs text-mute">
                    <span className="mb-1 block sm:sr-only">Winning units</span>
                    <input name={`w${n}`} inputMode="decimal" aria-label={`Winning units, ${label} prize`} defaultValue={val(`w${n}`, prize(n)?.winners ?? 0)} className={money} />
                  </label>
                  <label className="block text-xs text-mute">
                    <span className="mb-1 block sm:sr-only">Prize per unit (HK$)</span>
                    <input name={`p${n}`} inputMode="numeric" aria-label={`Prize per unit, ${label} prize`} defaultValue={val(`p${n}`, prize(n)?.prizeHkd ?? 0)} className={money} />
                  </label>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-mute">Prizes are saved only for a published result. Winning units can have one decimal, like 2.5. Use 0 for a division with no winner.</p>
        </Panel>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton size="lg" pendingText="Saving..." className="max-sm:w-full">{draw ? 'Save changes' : 'Save draw'}</SubmitButton>
          <Link href="/admin/draws" className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'max-sm:w-full' })}>Cancel</Link>
        </div>
      </div>
    </form>
  );
}
