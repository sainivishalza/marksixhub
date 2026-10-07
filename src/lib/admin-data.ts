import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { toDraw, type DrawRow } from './data';
import { query } from './db';
import type { Draw, EventItem, Prize } from './types';
import type { Role } from './perms';

type Count = RowDataPacket & { n: number };
const num = (v: unknown) => Number(v) || 0;

export async function getDashboard() {
  const [users, draws, today, perDay, signups, saves, [{ today: todayStr }]] = await Promise.all([
    query<Count>('SELECT COUNT(*) AS n FROM users'),
    query<RowDataPacket & { pub: number | null; up: number | null }>("SELECT SUM(status='published') AS pub, SUM(status='upcoming') AS up FROM draws"),
    query<Count>('SELECT COUNT(*) AS n FROM saved_sets WHERE created_at >= CURDATE()'),
    query<RowDataPacket & { d: string; n: number }>('SELECT DATE(created_at) AS d, COUNT(*) AS n FROM saved_sets WHERE created_at >= CURDATE() - INTERVAL 29 DAY GROUP BY DATE(created_at)'),
    query<RowDataPacket & { email: string; at: string }>('SELECT email, created_at AS at FROM users ORDER BY id DESC LIMIT 6'),
    query<RowDataPacket & { email: string; nums: string; at: string }>('SELECT u.email, s.nums, s.created_at AS at FROM saved_sets s JOIN users u ON u.id = s.user_id ORDER BY s.id DESC LIMIT 6'),
    query<RowDataPacket & { today: string }>('SELECT CURDATE() AS today'),
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

export type DrawTicket = { id: number; email: string; nums: string; createdAt: string };

/** Tickets users saved for one draw (information only, no payments). */
export async function listDrawTickets(drawNo: string): Promise<DrawTicket[]> {
  const rows = await query<RowDataPacket & { id: number; email: string; nums: string; created_at: string }>(
    'SELECT s.id, u.email, s.nums, s.created_at FROM saved_sets s JOIN users u ON u.id = s.user_id WHERE s.draw_no=? ORDER BY s.id DESC LIMIT 1000',
    [drawNo],
  );
  return rows.map((r) => ({ id: r.id, email: r.email, nums: r.nums, createdAt: String(r.created_at) }));
}
