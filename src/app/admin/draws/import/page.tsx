import { ImportForm } from '@/components/admin/import-form';
import { PageHeader, Panel } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'Import draws' };

const EXAMPLE = `draw_no,draw_date,n1,n2,n3,n4,n5,n6,extra,est_jackpot_hkd,w1,p1,w2,p2,w3,p3,w4,p4,w5,p5,w6,p6,w7,p7
26/081,2026-10-06,3,12,25,31,40,49,7,0,0,0,3,612540,98,38640,211,9600,4310,640,6120,320,81200,40
26/082,2026-10-09,,,,,,,,28000000`;

export default async function ImportPage() {
  await requireRole('content');
  return (
    <>
      <PageHeader title="Import draws from CSV" description="Add many draws at once. A draw whose number already exists is updated." />
      <div className="mb-6 max-w-3xl space-y-3 text-sm text-mute">
        <p>The first row is a header. Required columns: <code className="text-ivory">draw_no</code> and <code className="text-ivory">draw_date</code> (YYYY-MM-DD). Optional: <code className="text-ivory">n1</code> to <code className="text-ivory">n6</code>, <code className="text-ivory">extra</code>, <code className="text-ivory">status</code>, <code className="text-ivory">est_jackpot_hkd</code>, <code className="text-ivory">w1</code> to <code className="text-ivory">w7</code> (winners) and <code className="text-ivory">p1</code> to <code className="text-ivory">p7</code> (prize per unit in HK$).</p>
        <p>A row with winning numbers is published. A row without them is saved as an upcoming draw. If any row has a problem, nothing is imported and you see which lines to fix.</p>
      </div>
      <Panel title="Example" className="mb-6 max-w-3xl">
        <pre className="overflow-x-auto text-xs text-ivory">{EXAMPLE}</pre>
      </Panel>
      <ImportForm />
    </>
  );
}
