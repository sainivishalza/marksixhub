import { deleteCurrencyAction, saveCurrencyAction } from '@/actions/admin';
import { Field, Notice, PageHeader, Panel, inputClass } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { listAllCurrencies } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Currencies' };

export default async function CurrenciesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('manage');
  const { ok, error } = await searchParams;
  const currencies = await listAllCurrencies();

  return (
    <>
      <PageHeader title="Currencies" description="Prizes are stored in Hong Kong dollars. Rate means how many units of that currency equal 1 HKD. Visitors pick a currency in the site header and see converted, indicative amounts." />
      <Notice ok={ok} error={error} />

      <div className="space-y-3">
        {currencies.map((c) => (
          <form key={c.code} action={saveCurrencyAction} className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-panel/50 p-3">
            <input type="hidden" name="code" value={c.code} />
            <span className="w-12 font-mono font-semibold text-gold-bright">{c.code}</span>
            <input name="name" defaultValue={c.name} required maxLength={40} aria-label={`${c.code} name`} className={`${inputClass} w-56`} />
            <input name="symbol" defaultValue={c.symbol} maxLength={6} aria-label={`${c.code} symbol`} className={`${inputClass} w-20`} />
            <input name="rate" type="number" step="any" min="0" defaultValue={c.rate} required readOnly={c.code === 'HKD'} aria-label={`${c.code} rate per 1 HKD`} className={`${inputClass} w-36 font-mono`} />
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked={c.active} disabled={c.code === 'HKD'} /> Active</label>
            <Button type="submit" size="sm" variant="outline">Save</Button>
            {c.code !== 'HKD' ? <Button type="submit" size="sm" variant="ghost" className="text-miss" formAction={deleteCurrencyAction} formNoValidate>Delete</Button> : null}
          </form>
        ))}
      </div>

      <Panel title="Add a currency" className="mt-8 max-w-3xl">
        <form action={saveCurrencyAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Code (3 letters)"><input name="code" required pattern="[A-Za-z]{3}" maxLength={3} className={inputClass} /></Field>
          <Field label="Name"><input name="name" required maxLength={40} className={inputClass} /></Field>
          <Field label="Symbol"><input name="symbol" maxLength={6} className={inputClass} /></Field>
          <Field label="Rate per 1 HKD"><input name="rate" type="number" step="any" min="0" required className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked /> Active</label>
          <div className="sm:col-span-2"><Button type="submit">Add currency</Button></div>
        </form>
      </Panel>
    </>
  );
}
