'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { importDrawsAction, type ImportState } from '@/actions/admin';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import { FormMessage, SubmitButton } from '@/components/submit-button';
import { buttonVariants } from '@/components/ui/button';

const none: ImportState = {};

export function ImportForm() {
  const [state, action] = useActionState(importDrawsAction, none);
  return (
    <form action={action} className="max-w-3xl space-y-4">
      {state.imported !== undefined ? <FormMessage ok={`Imported ${state.imported} draw${state.imported === 1 ? '' : 's'}.`} /> : null}
      {state.errors?.length ? (
        <div role="alert" className="rounded-lg border border-miss/40 bg-miss/10 px-4 py-3 text-sm text-miss">
          <ul className="list-disc space-y-1 pl-5">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}
      <Field label="CSV file">
        <input type="file" name="file" accept=".csv,text/csv" className={inputClass} />
      </Field>
      <Field label="Or paste CSV text">
        <textarea name="csv" rows={8} className={`${textareaClass} font-mono`} placeholder="draw_no,draw_date,n1,n2,n3,n4,n5,n6,extra,w1,p1,w2,p2" />
      </Field>
      <div className="flex gap-3">
        <SubmitButton size="lg" pendingText="Importing...">Import draws</SubmitButton>
        <Link href="/admin/draws" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>Back to draws</Link>
      </div>
    </form>
  );
}
