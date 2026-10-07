import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from './db';
import { evaluate, parseNumbers, sortAsc } from './mark6';

export type TicketView = {
  id: number;
  numbers: number[];
  settled: boolean;
  won: number;
  /** Winning numbers of the draw once it is published, to highlight the matches. */
  winning: number[] | null;
  matches: number | null;
};

export type OrderView = {
  id: number;
  orderNo: string;
  drawNo: string;
  createdAt: string;
  tickets: number;
  points: number;
  status: 'pending' | 'accepted' | 'rejected' | 'refunded';
  settled: boolean;
  won: number;
  sets: TicketView[];
};

export type OrderFilter = 'all' | 'waiting' | 'results';

/** "2026-10-05 13:37:00" (UTC as stored) as a short Hong Kong date: "5 Oct, 9:37 pm". */
export function shortWhen(createdAtUtc: string): string {
  const d = new Date(`${createdAtUtc.slice(0, 19).replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

type OrderRow = RowDataPacket & { id: number; order_no: string | null; draw_no: string; created_at: string; tickets: number; points: number; status: OrderView['status'] };
type SetRow = RowDataPacket & { id: number; order_id: number; nums: string; settled: number; won_points: number; r_nums: string | null; r_extra: number | null };

/** A player's orders, newest first, each with its tickets and how they did. */
export async function getOrders(userId: number, opts: { limit?: number; filter?: OrderFilter } = {}): Promise<OrderView[]> {
  const rows = await query<OrderRow>(
    'SELECT id, order_no, draw_no, created_at, tickets, points, status FROM orders WHERE user_id=? ORDER BY id DESC LIMIT ?',
    [userId, opts.filter && opts.filter !== 'all' ? 200 : opts.limit ?? 50],
  );
  if (!rows.length) return [];
  const sets = await query<SetRow>(
    `SELECT s.id, s.order_id, s.nums, s.settled, s.won_points, d.nums AS r_nums, d.extra AS r_extra
       FROM saved_sets s LEFT JOIN draws d ON d.draw_no = s.draw_no AND d.status='published' AND d.nums IS NOT NULL
      WHERE s.order_id IN (${rows.map(() => '?').join(',')}) ORDER BY s.id`,
    rows.map((r) => r.id),
  );
  const byOrder = new Map<number, TicketView[]>();
  for (const s of sets) {
    const numbers = sortAsc(parseNumbers(s.nums));
    const winning = s.r_nums ? parseNumbers(s.r_nums) : null;
    const ev = winning && numbers.length === 6 ? evaluate(numbers, winning, s.r_extra) : null;
    const list = byOrder.get(s.order_id) ?? [];
    list.push({ id: s.id, numbers, settled: Boolean(s.settled), won: Number(s.won_points) || 0, winning, matches: ev ? ev.matches : null });
    byOrder.set(s.order_id, list);
  }
  const all = rows.map((r): OrderView => {
    const list = byOrder.get(r.id) ?? [];
    return {
      id: r.id,
      orderNo: r.order_no ?? `#${r.id}`,
      drawNo: r.draw_no,
      createdAt: String(r.created_at),
      tickets: Number(r.tickets),
      points: Number(r.points),
      status: r.status,
      settled: list.length > 0 && list.every((t) => t.settled),
      won: list.reduce((a, t) => a + t.won, 0),
      sets: list,
    };
  });
  if (opts.filter === 'waiting') return all.filter((o) => o.status === 'pending' || (o.status === 'accepted' && !o.settled));
  if (opts.filter === 'results') return all.filter((o) => o.status === 'accepted' && o.settled);
  return all.slice(0, opts.limit ?? 50);
}

export async function getOrder(userId: number, id: number): Promise<OrderView | null> {
  const rows = await query<RowDataPacket & { id: number }>('SELECT id FROM orders WHERE id=? AND user_id=?', [id, userId]);
  if (!rows.length) return null;
  // Reuse the list query: the newest 200 contain any order a person is likely to open.
  return (await getOrders(userId, { limit: 200 })).find((o) => o.id === id) ?? null;
}
