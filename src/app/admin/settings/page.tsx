import { saveSettingsAction } from '@/actions/admin';
import { Field, Notice, PageHeader, Panel, inputClass, textareaClass } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('manage');
  const { ok, error } = await searchParams;
  const s = await getSettings();

  return (
    <>
      <PageHeader title="Settings" />
      <Notice ok={ok} error={error} />
      <form action={saveSettingsAction} className="max-w-3xl space-y-6">
        <Panel title="Site">
          <div className="space-y-4">
            <Field label="Site name"><input name="site_name" required maxLength={60} defaultValue={s.siteName} className={inputClass} /></Field>
            <Field label="Default description" hint="Used by search engines when a page has no description of its own. Under 160 characters is best.">
              <textarea name="site_description" rows={3} maxLength={300} defaultValue={s.siteDescription} className={textareaClass} />
            </Field>
            <Field label="Announcement banner" hint="Shown at the top of every public page. Leave empty to hide it.">
              <input name="announcement" maxLength={300} defaultValue={s.announcement} className={inputClass} />
            </Field>
          </div>
        </Panel>

        <Panel title="Display">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="show_jackpot" defaultChecked={s.showJackpot} className="mt-1" />
            <span><span className="text-ivory">Show the estimated jackpot on the home page</span><span className="block text-mute">Untick to hide the large prize figure.</span></span>
          </label>
        </Panel>

        <Panel title="Points (free play, no cash value)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Points per ticket"><input name="ticket_points" type="number" min={0} defaultValue={s.ticketPoints} className={inputClass} /></Field>
            <Field label="Daily free points"><input name="daily_points" type="number" min={0} defaultValue={s.dailyPoints} className={inputClass} /></Field>
            <Field label="Sign-up points"><input name="signup_points" type="number" min={0} defaultValue={s.signupPoints} className={inputClass} /></Field>
          </div>
          <p className="mb-2 mt-4 text-sm text-mute">Points won per prize division</p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {s.prizePoints.map((v, i) => (
              <Field key={i} label={`${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'}`}><input name={`prize_${i + 1}`} type="number" min={0} defaultValue={v} className={inputClass} /></Field>
            ))}
          </div>
        </Panel>

        <Panel title="Maintenance mode">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="maintenance" defaultChecked={s.maintenance} className="mt-1" />
            <span><span className="text-ivory">Close the public site</span><span className="block text-mute">Visitors see a Back soon page. Staff (viewer, editor, admin) can still browse and use this admin area.</span></span>
          </label>
        </Panel>

        <Button type="submit" size="lg">Save settings</Button>
      </form>
    </>
  );
}
