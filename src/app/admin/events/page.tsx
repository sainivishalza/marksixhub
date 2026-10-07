import { deleteEventAction, saveEventAction } from '@/actions/admin';
import { Field, Notice, PageHeader, Panel, inputClass } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { listAllEvents } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { can } from '@/lib/perms';

export const metadata = { title: 'Events' };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireRole('view');
  const canEdit = can(user.role, 'content');
  const { ok, error } = await searchParams;
  const events = await listAllEvents();

  return (
    <>
      <PageHeader title="Events" description="Special draws and announcements shown under Coming up on the home page. Past events are hidden automatically." />
      <Notice ok={ok} error={error} />

      {canEdit ? (
        <Panel title="Add an event" className="mb-8 max-w-3xl">
          <form action={saveEventAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Title"><input name="title" required maxLength={120} className={inputClass} /></Field>
            <Field label="Date"><input type="date" name="event_date" required className={inputClass} /></Field>
            <Field label="Details" className="sm:col-span-2"><input name="body" maxLength={500} className={inputClass} /></Field>
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked /> Show on the site</label>
            <div className="sm:col-span-2"><Button type="submit">Add event</Button></div>
          </form>
        </Panel>
      ) : null}

      <h2 className="mb-3 text-xl">All events</h2>
      {events.length === 0 ? <p className="text-sm text-mute">No events yet.</p> : null}
      <div className="space-y-3">
        {events.map((e) => (
          <form key={e.id} action={saveEventAction} className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-panel/50 p-3">
            <input type="hidden" name="id" value={e.id} />
            <input name="title" defaultValue={e.title} required maxLength={120} aria-label="Title" disabled={!canEdit} className={`${inputClass} w-56`} />
            <input type="date" name="event_date" defaultValue={e.eventDate} required aria-label="Date" disabled={!canEdit} className={`${inputClass} w-44`} />
            <input name="body" defaultValue={e.body} maxLength={500} aria-label="Details" disabled={!canEdit} className={`${inputClass} min-w-48 flex-1`} />
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked={e.active} disabled={!canEdit} /> Show</label>
            {canEdit ? (
              <>
                <Button type="submit" size="sm" variant="outline">Save</Button>
                <Button type="submit" size="sm" variant="ghost" className="text-miss" formAction={deleteEventAction} formNoValidate>Delete</Button>
              </>
            ) : null}
          </form>
        ))}
      </div>
    </>
  );
}
