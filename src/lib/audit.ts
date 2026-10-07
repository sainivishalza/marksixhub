import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { exec, query } from './db';

/** Records an admin action. Never throws: a logging failure must not block the action itself. */
export async function audit(userId: number, action: string, detail = '') {
  try {
    await exec('INSERT INTO audit_log (user_id, action, detail) VALUES (?,?,?)', [userId, action.slice(0, 40), detail.slice(0, 250)]);
  } catch (err) {
    console.error('audit log failed:', err);
  }
}

export type AuditRow = { id: number; email: string | null; action: string; detail: string; createdAt: string };

export async function listAudit(limit = 200): Promise<AuditRow[]> {
  const rows = await query<RowDataPacket & { id: number; email: string | null; action: string; detail: string; created_at: string }>(
    'SELECT a.id, u.email, a.action, a.detail, a.created_at FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT ?',
    [limit],
  );
  return rows.map((r) => ({ id: r.id, email: r.email, action: r.action, detail: r.detail, createdAt: String(r.created_at) }));
}
