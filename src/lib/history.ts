import 'server-only';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';
import type { User } from './auth';
import { dbConfigured, query } from './db';
import { effectiveFrom, FREE_RESULTS, HISTORY_MAX_YEARS, yearsBefore } from './history-rules';
import { can } from './perms';

export type HistoryAccess = {
  /** Earliest result date this visitor may see; null means no limit. */
  from: string | null;
  /** Earliest date of the free window (the latest 40 results). */
  freeFrom: string | null;
  /** Date of the newest published result. */
  latest: string | null;
  /** How many published results are hidden from this visitor. */
  locked: number;
  /** Years of history the visitor has bought. */
  years: number;
  staff: boolean;
  /** A staff member who chose to see the site as a customer does (locks and points rules apply). */
  previewing: boolean;
};

export const PREVIEW_COOKIE = 'mh_preview';

const OPEN: HistoryAccess = { from: null, freeFrom: null, latest: null, locked: 0, years: 0, staff: false, previewing: false };

/** What can this visitor see of the results archive? The latest 40 are free; the rest are bought in years; staff see everything. */
export async function getHistoryAccess(user: User | null): Promise<HistoryAccess> {
  if (!dbConfigured) return OPEN;
  const [free] = await query<RowDataPacket & { d: string | null }>(
    "SELECT draw_date AS d FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT 1 OFFSET ?",
    [FREE_RESULTS - 1],
  );
  const [newest] = await query<RowDataPacket & { d: string | null }>("SELECT MAX(draw_date) AS d FROM draws WHERE status='published'");
  const freeFrom = free?.d ? String(free.d).slice(0, 10) : null;
  const latest = newest?.d ? String(newest.d).slice(0, 10) : null;
  const isStaff = Boolean(user && can(user.role, 'view'));
  const previewing = isStaff && (await cookies()).get(PREVIEW_COOKIE)?.value === '1';
  const staff = isStaff && !previewing;
  const from = staff ? null : effectiveFrom(freeFrom, user?.historyFrom ?? null);
  let locked = 0;
  if (from) {
    const [n] = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM draws WHERE status='published' AND draw_date < ?", [from]);
    locked = Number(n.n);
  }
  return { from, freeFrom, latest, locked, years: user?.historyYears ?? 0, staff, previewing };
}

export type Tier = { years: number; since: string; draws: number };

/** The nine purchasable steps: how far back each reaches and how many results it opens in total. */
export async function getTiers(latest: string): Promise<Tier[]> {
  const froms = Array.from({ length: HISTORY_MAX_YEARS }, (_, i) => yearsBefore(latest, i + 1));
  const sums = froms.map((_, i) => `SUM(draw_date >= ?) AS t${i + 1}`).join(', ');
  const [row] = await query<RowDataPacket>(`SELECT ${sums} FROM draws WHERE status='published'`, froms);
  return froms.map((since, i) => ({ years: i + 1, since, draws: Number(row[`t${i + 1}`]) || 0 }));
}
