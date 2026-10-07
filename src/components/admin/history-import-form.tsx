'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { importHistoryAction, type HistoryImportState } from '@/actions/admin';
import { Field, inputClass } from '@/components/admin/ui';
import { FormMessage, SubmitButton } from '@/components/submit-button';
import { buttonVariants } from '@/components/ui/button';

const none: HistoryImportState = {};

export function HistoryImportForm() {
  const [state, action] = useActionState(importHistoryAction, none);
  return (
    <form action={action} className="max-w-3xl space-y-4">
      {state.added !== undefined ? (
        <FormMessage ok={`${state.added.toLocaleString('en-US')} results added${state.skipped ? `, ${state.skipped.toLocaleString('en-US')} were already there and left as they are` : ''}. Dates ${state.range}.`} />
      ) : null}
      {state.errors?.length ? (
        <div role="alert" className="rounded-lg border border-miss/40 bg-miss/10 px-4 py-3 text-sm text-miss">
          <ul className="list-disc space-y-1 pl-5">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}
      <Field label="Excel file (.xlsx)">
        <input type="file" name="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className={inputClass} />
      </Field>
      <div className="flex gap-3">
        <SubmitButton size="lg" pendingText="Importing...">Import results</SubmitButton>
        <Link href="/admin/draws" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>Back to draws</Link>
      </div>
    </form>
  );
}
