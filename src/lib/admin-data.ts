import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { toDraw, type DrawRow } from './data';
import { query } from './db';
import { combinations, evaluate, parseNumbers } from './mark6';
import { getSettings } from './settings';
import type { Draw, EventItem, Prize } from './types';
import type { Role } from './perms';

type Count = RowDataPacket & { n: number };
const num = (v: unknown) => Number(v) || 0;

export async function getDashboard() {
  const [users, draws, today, perDay, signups, saves, [{ today: todayStr }], [pts], [ordersToday], [pendingRow]] = await Promise.all([
    query<Count>('SELECT COUNT(*) AS n FROM users'),
    query<RowDataPacket & { pub: number | null; up: number | null }>("SELECT SUM(status='published') AS pub, SUM(status='upcoming') AS up FROM draws"),
    query<Count>('SELECT COUNT(*) AS n FROM saved_sets WHERE created_at >= CURDATE()'),
    query<RowDataPacket & { d: string; n: number }>('SELECT DATE(created_at) AS d, COUNT(*) AS n FROM saved_sets WHERE created_at >= CURDATE() - INTERVAL 29 DAY GROUP BY DATE(created_at)'),
    query<RowDataPacket & { email: string; at: string }>('SELECT email, created_at AS at FROM users ORDER BY id DESC LIMIT 6'),
    query<RowDataPacket & { email: string; nums: string; at: string }>('SELECT u.email, s.nums, s.created_at AS at FROM saved_sets s JOIN users u ON u.id = s.user_id ORDER BY s.id DESC LIMIT 6'),
    query<RowDataPacket & { today: string }>('SELECT CURDATE() AS today'),
    query<RowDataPacket & { held: number | null; won: number | null }>("SELECT (SELECT SUM(points) FROM users) AS held, (SELECT SUM(delta) FROM point_log WHERE reason LIKE 'Won%') AS won"),
    query<RowDataPacket & { orders: number; tickets: number | null }>('SELECT COUNT(*) AS orders, SUM(tickets) AS tickets FROM orders WHERE created_at >= CURDATE() AND refunded=0'),
    query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM orders WHERE status='pending'"),
  ]);

  const counts = new Map(perDay.map((r) => [r.d, num(r.n)]));
  const end = new Date(`${todayStr}T00:00:00Z`);
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(end.getTime() - (29 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { date: d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }), picks: counts.get(key) ?? 0 };
  });

  const activity = [
    ...signups.map((r) => ({ at: r.at, text: `${r.email} signed up` })),
    ...saves.map((r) => ({ at: r.at, text: `${r.email} saved ${r.nums.replace(/,/g, ' ')}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return {
    users: num(users[0].n),
    published: num(draws[0].pub),
    upcoming: num(draws[0].up),
    picksToday: num(today[0].n),
    pointsHeld: num(pts.held),
    pointsWon: num(pts.won),
    ordersToday: num(ordersToday.orders),
    pendingOrders: num(pendingRow.n),
    ticketsToday: num(ordersToday.tickets),
    series,
    activity,
  };
}

/** The draw number after the latest one (26/106 becomes 26/107), to save typing. Empty if there are no draws yet. */
export async function suggestNextDrawNo(): Promise<string> {
  const rows = await query<RowDataPacket & { draw_no: string }>('SELECT draw_no FROM draws ORDER BY draw_date DESC, id DESC LIMIT 1');
  const m = /^(\d{2})\/(\d{3})$/.exec(rows[0]?.draw_no ?? '');
  return m ? `${m[1]}/${String(Number(m[2]) + 1).padStart(3, '0')}` : '';
}

export async function listDraws(q: string, page: number, perPage = 25): Promise<{ draws: Draw[]; total: number }> {
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const where = q ? 'WHERE draw_no LIKE ? OR draw_date LIKE ?' : '';
  const args = q ? [like, like] : [];
  const [rows, count] = await Promise.all([
    query<DrawRow>(`SELECT * FROM draws ${where} ORDER BY draw_date DESC, id DESC LIMIT ? OFFSET ?`, [...args, perPage, (page - 1) * perPage]),
    query<Count>(`SELECT COUNT(*) AS n FROM draws ${where}`, args),
  ]);
  return { draws: rows.map(toDraw), total: num(count[0].n) };
}

export async function getDrawFull(id: number): Promise<{ draw: Draw; prizes: Prize[] } | null> {
  const rows = await query<DrawRow>('SELECT * FROM draws WHERE id=?', [id]);
  if (!rows[0]) return null;
  const prizes = await query<RowDataPacket & { division: number; winners: number; prize_hkd: number | string }>(
    'SELECT division, winners, prize_hkd FROM draw_prizes WHERE draw_id=? ORDER BY division',
    [id],
  );
  return { draw: toDraw(rows[0]), prizes: prizes.map((p) => ({ division: p.division, winners: p.winners, prizeHkd: num(p.prize_hkd) })) };
}

export async function listAllEvents(): Promise<(EventItem & { active: boolean })[]> {
  const rows = await query<RowDataPacket & { id: number; title: string; event_date: string; body: string; active: number }>(
    'SELECT id, title, event_date, body, active FROM events ORDER BY event_date DESC LIMIT 200',
  );
  return rows.map((r) => ({ id: r.id, title: r.title, eventDate: r.event_date, body: r.body, active: Boolean(r.active) }));
}

export async function listAllCurrencies() {
  const rows = await query<RowDataPacket & { code: string; name: string; symbol: string; rate: string; active: number }>(
    "SELECT code, name, symbol, rate, active FROM currencies ORDER BY code='HKD' DESC, code",
  );
  return rows.map((r) => ({ code: r.code, name: r.name, symbol: r.symbol, rate: Number(r.rate), active: Boolean(r.active) }));
}

export type UserRowOut = { id: number; email: string; role: Role; currency: string; createdAt: string; lastLogin: string | null; picks: number; points: number };

export async function listUsers(q: string, limit = 200): Promise<UserRowOut[]> {
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const rows = await query<RowDataPacket & { id: number; email: string; role: Role; currency: string; created_at: string; last_login_at: string | null; picks: number; points: number }>(
    `SELECT u.id, u.email, u.role, u.currency, u.created_at, u.last_login_at, u.points, COUNT(s.id) AS picks
       FROM users u LEFT JOIN saved_sets s ON s.user_id = u.id
      ${q ? 'WHERE u.email LIKE ?' : ''}
      GROUP BY u.id ORDER BY u.id DESC LIMIT ?`,
    q ? [like, limit] : [limit],
  );
  return rows.map((r) => ({ id: r.id, email: r.email, role: r.role, currency: r.currency, createdAt: r.created_at, lastLogin: r.last_login_at, picks: num(r.picks), points: num(r.points) }));
}

export async function listAllFaqs() {
  const rows = await query<RowDataPacket & { id: number; question: string; answer: string; sort_order: number; active: number }>(
    'SELECT id, question, answer, sort_order, active FROM faqs ORDER BY sort_order, id',
  );
  return rows.map((r) => ({ id: r.id, question: r.question, answer: r.answer, sortOrder: r.sort_order, active: Boolean(r.active) }));
}

export type OrderRow = { id: number; orderNo: string; email: string; createdAt: string; points: number; refunded: boolean; status: string; tickets: { nums: string; units: number; won: number | null }[] };

/** Everything users placed for one draw: orders (newest first) and how often each number was picked. */
export async function getDrawOrders(drawNo: string) {
  const [orders, tickets] = await Promise.all([
    query<RowDataPacket & { id: number; email: string; created_at: string; points: number; refunded: number; status: string; order_no: string | null }>(
      'SELECT o.id, o.order_no, u.email, o.created_at, o.points, o.refunded, o.status FROM orders o JOIN users u ON u.id = o.user_id WHERE o.draw_no=? ORDER BY o.id DESC LIMIT 500',
      [drawNo],
    ),
    query<RowDataPacket & { order_id: number; nums: string; units: number; settled: number; won_points: number }>(
      'SELECT order_id, nums, units, settled, won_points FROM saved_sets WHERE draw_no=? AND order_id IS NOT NULL ORDER BY id',
      [drawNo],
    ),
  ]);
  const byOrder = new Map<number, OrderRow['tickets']>();
  const freq: number[] = Array(50).fill(0);
  for (const t of tickets) {
    for (const n of t.nums.split(',')) freq[Number(n)] += 1;
    const list = byOrder.get(t.order_id) ?? [];
    list.push({ nums: t.nums, units: num(t.units), won: t.settled ? num(t.won_points) : null });
    byOrder.set(t.order_id, list);
  }
  return {
    orders: orders.map((o): OrderRow => ({ id: o.id, orderNo: o.order_no ?? `#${o.id}`, email: o.email, createdAt: String(o.created_at), points: num(o.points), refunded: Boolean(o.refunded), status: o.status, tickets: byOrder.get(o.id) ?? [] })),
    freq,
    ticketCount: tickets.reduce((a, t) => a + num(t.units), 0),
  };
}

export async function listDrawNos(): Promise<{ drawNo: string; status: string; nums: string | null; extra: number | null }[]> {
  const rows = await query<RowDataPacket & { draw_no: string; status: string; nums: string | null; extra: number | null }>(
    'SELECT draw_no, status, nums, extra FROM draws ORDER BY draw_date DESC, id DESC LIMIT 60',
  );
  return rows.map((r) => ({ drawNo: r.draw_no, status: r.status, nums: r.nums, extra: r.extra }));
}

/** Where a draw stands, for the checklist on its edit page. */
export async function getDrawChecklist(drawNo: string) {
  const [[o], [t]] = await Promise.all([
    query<RowDataPacket & { orders: number; tickets: number | null; points: number | null; pending: number | null }>("SELECT COUNT(*) AS orders, SUM(tickets) AS tickets, SUM(points) AS points, SUM(status='pending') AS pending FROM orders WHERE draw_no=? AND refunded=0", [drawNo]),
    query<RowDataPacket & { waiting: number }>('SELECT COUNT(*) AS waiting FROM saved_sets WHERE draw_no=? AND settled=0', [drawNo]),
  ]);
  return { orders: num(o.orders), tickets: num(o.tickets), points: num(o.points), pending: num(o.pending), waiting: num(t.waiting) };
}

/** Things worth a look: unusual points activity, refunds, sign-up bursts, failed logins, negative balances. */
export async function getAlerts(): Promise<string[]> {
  const [grants, refunds, bursts, fails, negative] = await Promise.all([
    query<RowDataPacket & { action: string; detail: string }>("SELECT action, detail FROM audit_log WHERE action IN ('points.adjust','points.grant_all') AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY ORDER BY id DESC LIMIT 5"),
    query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM audit_log WHERE action='order.refund' AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY"),
    query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM users WHERE signup_ip IS NOT NULL AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY GROUP BY signup_ip HAVING n >= 4'),
    query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM login_fails WHERE created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY GROUP BY email HAVING n >= 3'),
    query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM users WHERE points < 0'),
  ]);
  const out: string[] = [];
  for (const g of grants) out.push(`Points ${g.action === 'points.grant_all' ? 'given to everyone' : 'adjusted'} in the last 24 hours: ${g.detail}`);
  if (num(refunds[0].n) >= 5) out.push(`${num(refunds[0].n)} orders refunded in the last 24 hours.`);
  if (bursts.length) out.push(`${bursts.length} address${bursts.length === 1 ? '' : 'es'} created 4 or more accounts in the last 24 hours.`);
  if (fails.length) out.push(`${fails.length} account${fails.length === 1 ? '' : 's'} with 3 or more failed logins in the last 24 hours. See Failed logins.`);
  if (num(negative[0].n)) out.push(`${num(negative[0].n)} user${num(negative[0].n) === 1 ? ' has' : 's have'} a negative points balance (after a reversed payout).`);
  return out;
}

/** What publishing a result would pay, without paying anything. Counts every unsettled ticket for the draw, pending orders included (they must be approved before publishing). */
export async function previewPayout(drawNo: string, numbers: number[], extra: number) {
  const { prizePoints } = await getSettings();
  const rows = await query<RowDataPacket & { nums: string }>('SELECT nums FROM saved_sets WHERE draw_no=? AND settled=0', [drawNo]);
  const byDivision = Array<number>(7).fill(0);
  let totalPoints = 0;
  let tickets = 0;
  for (const r of rows) {
    for (const combo of combinations(parseNumbers(r.nums))) {
      tickets += 1;
      const { division } = evaluate(combo, numbers, extra);
      if (division) {
        byDivision[division - 1] += 1;
        totalPoints += prizePoints[division - 1] ?? 0;
      }
    }
  }
  return { tickets, winningTickets: byDivision.reduce((a, b) => a + b, 0), totalPoints, byDivision };
}
