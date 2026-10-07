import { deleteFaqAction, saveFaqAction } from '@/actions/admin';
import { Field, Notice, PageHeader, Panel, inputClass, textareaClass } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { listAllFaqs } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Content' };

export default async function FaqsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('content');
  const { ok, error } = await searchParams;
  const faqs = await listAllFaqs();

  return (
    <>
      <PageHeader title="FAQ content" description="These questions appear on the FAQ page and in the home page preview. The same text feeds the FAQ structured data that search engines read. Lower order numbers come first." />
      <Notice ok={ok} error={error} />

      <Panel title="Add a question" className="mb-8 max-w-3xl">
        <form action={saveFaqAction} className="space-y-4">
          <Field label="Question"><input name="question" required maxLength={200} className={inputClass} /></Field>
          <Field label="Answer"><textarea name="answer" required rows={4} maxLength={2000} className={textareaClass} /></Field>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Order"><input type="number" name="sort_order" defaultValue={(faqs.at(-1)?.sortOrder ?? 0) + 10} className={`${inputClass} w-24`} /></Field>
            <label className="flex items-center gap-2 pb-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked /> Show on the site</label>
            <Button type="submit">Add question</Button>
          </div>
        </form>
      </Panel>

      <h2 className="mb-3 text-xl">All questions</h2>
      <div className="space-y-4">
        {faqs.map((f) => (
          <form key={f.id} action={saveFaqAction} className="space-y-3 rounded-xl border border-line/60 bg-panel/50 p-4">
            <input type="hidden" name="id" value={f.id} />
            <Field label="Question"><input name="question" defaultValue={f.question} required maxLength={200} className={inputClass} /></Field>
            <Field label="Answer"><textarea name="answer" defaultValue={f.answer} required rows={3} maxLength={2000} className={textareaClass} /></Field>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Order"><input type="number" name="sort_order" defaultValue={f.sortOrder} className={`${inputClass} w-24`} /></Field>
              <label className="flex items-center gap-2 pb-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked={f.active} /> Show</label>
              <Button type="submit" size="sm" variant="outline">Save</Button>
              <Button type="submit" size="sm" variant="ghost" className="text-miss" formAction={deleteFaqAction} formNoValidate>Delete</Button>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
