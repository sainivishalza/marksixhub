import { HistoryImportForm } from '@/components/admin/history-import-form';
import { PageHeader, Panel } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { FREE_RESULTS } from '@/lib/history-rules';

export const metadata = { title: 'Import past results' };

export default async function HistoryImportPage() {
  await requireRole('content');
  return (
    <>
      <PageHeader title="Import past results (Excel)" description="Upload years of past results in one go. Draws that are already on the site are left as they are." />
      <div className="mb-6 max-w-3xl space-y-3 text-sm text-mute">
        <p>
          The first sheet needs a header row with <code className="text-ivory">Draw No.</code>, <code className="text-ivory">Draw Date</code>, <code className="text-ivory">Num 1</code> to <code className="text-ivory">Num 6</code> and <code className="text-ivory">Special Number</code>. Dates can be 30/12/2018 or 2018-12-30. Rows can be in any order.
        </p>
        <p>
          Visitors see the latest {FREE_RESULTS} results for free. Everything older is locked and opened with points, by year (see Settings for the price). If any row has a problem, nothing is imported and you see which lines to fix.
        </p>
      </div>
      <Panel title="Example" className="mb-6 max-w-3xl">
        <pre className="overflow-x-auto text-xs text-ivory">{`Draw No.  Draw Date   Num 1  Num 2  Num 3  Num 4  Num 5  Num 6  Special Number
18/149    30/12/2018  6      7      13     33     35     46     43`}</pre>
      </Panel>
      <HistoryImportForm />
    </>
  );
}
