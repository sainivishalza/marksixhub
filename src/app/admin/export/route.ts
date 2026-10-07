import { audit } from '@/lib/audit';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Table names are fixed here, never user input. Password hashes, 2FA secrets and sign-up address hashes are left out.
const TABLES: [string, string][] = [
  ['users', 'id, email, role, currency, points, streak, nickname, blocked, totp_on, created_at, last_login_at'],
  ['orders', '*'],
  ['saved_sets', '*'],
  ['point_log', '*'],
  ['favourites', '*'],
  ['draws', '*'],
  ['draw_prizes', '*'],
  ['events', '*'],
  ['faqs', '*'],
  ['currencies', '*'],
  ['settings', '*'],
  ['audit_log', '*'],
];

export async function GET() {
  const me = await requireRole('manage');
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const [table, cols] of TABLES) out[table] = await query(`SELECT ${cols} FROM ${table}`);
  await audit(me.id, 'export.all', 'full data export');
  return new Response(JSON.stringify(out), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="marksixhub-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
