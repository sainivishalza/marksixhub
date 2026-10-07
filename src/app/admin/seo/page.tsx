import { saveSeoAction } from '@/actions/admin';
import { Field, Notice, PageHeader, Panel, inputClass, textareaClass } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { SEO_DEFAULTS } from '@/lib/seo-db';
import { getSeoOverrides } from '@/lib/settings';

export const metadata = { title: 'SEO' };

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('content');
  const { ok, error } = await searchParams;
  const overrides = await getSeoOverrides();

  return (
    <>
      <PageHeader title="SEO titles and descriptions" description="What Google shows for each page. Leave a box empty to use the built-in text (shown as the grey hint). Keep titles under 60 characters and descriptions under 160." />
      <Notice ok={ok} error={error} />
      <div className="max-w-3xl space-y-5">
        {Object.values(SEO_DEFAULTS).map((p) => {
          const o = overrides[p.path];
          return (
            <Panel key={p.path} title={`${p.label}  ${p.path}`}>
              <form action={saveSeoAction} className="space-y-4">
                <input type="hidden" name="path" value={p.path} />
                <Field label="Title" hint={`${(o?.title || p.title).length} characters. The site name is added after it.`}>
                  <input name="title" maxLength={120} defaultValue={o?.title ?? ''} placeholder={p.title} className={inputClass} />
                </Field>
                <Field label="Description" hint={`${(o?.description || p.description).length} characters`}>
                  <textarea name="description" rows={3} maxLength={300} defaultValue={o?.description ?? ''} placeholder={p.description} className={textareaClass} />
                </Field>
                <Button type="submit" variant="outline" size="sm">Save {p.label}</Button>
              </form>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
