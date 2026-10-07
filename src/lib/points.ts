import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { query, tx } from './db';
import { combinations, evaluate, parseNumbers } from './mark6';
import { getSettings } from './settings';

// Points are free play credits: never sold, never redeemable for money. Every change is logged in point_log.

export async function getPoints(userId: number): Promise<number> {
  const [r] = await query<RowDataPacket & { points: number }>('SELECT points FROM users WHERE id=?', [userId]);
  return r ? Number(r.points) : 0;
}

/** Adds (or removes, when negative) points and logs why. Returns false if the balance would go below zero. */
export async function addPoints(userId: number, delta: number, reason: string): Promise<boolean> {
  return tx(async (t) => {
    const res = await t.exec('UPDATE users SET points = points + ? WHERE id=? AND points + ? >= 0', [delta, userId, delta]);
    if (!res.affectedRows) return false;
    await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [userId, delta, reason.slice(0, 80)]);
    return true;
  });
}

/** Pays points for every unsettled ticket whose draw is published. Safe to call repeatedly: each ticket pays once. */
export async function settleTickets() {
  const { prizePoints } = await getSettings();
  const rows = await query<RowDataPacket & { id: number; user_id: number; nums: string; draw_no: string; w: string; extra: number | null }>(
    `SELECT s.id, s.user_id, s.nums, s.draw_no, d.nums AS w, d.extra FROM saved_sets s
       JOIN draws d ON d.draw_no = s.draw_no AND d.status='published' AND d.nums IS NOT NULL
       LEFT JOIN orders o ON o.id = s.order_id
      WHERE s.settled=0 AND (o.id IS NULL OR o.status='accepted')`,
  );
  for (const r of rows) {
    // A multiple entry wins on every 6-number combination inside it.
    const winning = parseNumbers(r.w);
    const won = combinations(parseNumbers(r.nums)).reduce((sum, c) => {
      const { division } = evaluate(c, winning, r.extra);
      return sum + (division ? prizePoints[division - 1] ?? 0 : 0);
    }, 0);
    await tx(async (t) => {
      const res = await t.exec('UPDATE saved_sets SET settled=1, won_points=?, notified=0 WHERE id=? AND settled=0', [won, r.id]);
      if (res.affectedRows && won > 0) {
        await t.exec('UPDATE users SET points = points + ? WHERE id=?', [won, r.user_id]);
        await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [r.user_id, won, `Won, draw ${r.draw_no}`]);
      }
    });
  }
}

/** Draws close for orders at their stop selling time, or the end of the draw day, Hong Kong time. */
export async function openDraw(): Promise<{ drawNo: string; closesAt: Date } | null> {
  const rows = await query<RowDataPacket & { draw_no: string; draw_date: string; t: string | null }>(
    "SELECT draw_no, draw_date, stop_selling_time AS t FROM draws WHERE status='upcoming' ORDER BY draw_date ASC LIMIT 10",
  );
  const now = Date.now();
  for (const r of rows) {
    const closesAt = new Date(`${String(r.draw_date).slice(0, 10)}T${r.t ? String(r.t).slice(0, 8) : '23:59:59'}+08:00`);
    if (closesAt.getTime() > now) return { drawNo: r.draw_no, closesAt };
  }
  return null;
}

export async function walletFor(userId: number, cost: number) {
  const [points, open, favs, [w], [v]] = await Promise.all([
    getPoints(userId),
    openDraw(),
    query<RowDataPacket & { id: number; nums: string }>('SELECT id, nums FROM favourites WHERE user_id=? ORDER BY id DESC', [userId]),
    query<RowDataPacket & { n: number | null }>('SELECT SUM(won_points) AS n FROM saved_sets WHERE user_id=? AND settled=1 AND notified=0 AND won_points>0', [userId]),
    query<RowDataPacket & { ok: number }>('SELECT email_verified AS ok FROM users WHERE id=?', [userId]),
  ]);
  return {
    points,
    cost,
    drawNo: open?.drawNo ?? null,
    closesAt: open?.closesAt.toISOString() ?? null,
    favourites: favs.map((f) => ({ id: f.id, nums: f.nums.split(',').map(Number) })),
    unseenWins: Number(w?.n) || 0,
    verified: Boolean(v?.ok),
  };
}

/** Takes back every payout for a draw and marks its tickets unsettled, so a corrected result pays fresh. Balances may go below zero if points were spent. */
export async function reversePayouts(drawNo: string): Promise<number> {
  return tx(async (t) => {
    const rows = await t.query<RowDataPacket & { user_id: number; total: number }>(
      'SELECT user_id, SUM(won_points) AS total FROM saved_sets WHERE draw_no=? AND settled=1 AND won_points>0 GROUP BY user_id',
      [drawNo],
    );
    for (const r of rows) {
      await t.exec('UPDATE users SET points = points - ? WHERE id=?', [Number(r.total), r.user_id]);
      await t.exec('INSERT INTO point_log (user_id, delta, reason) VALUES (?,?,?)', [r.user_id, -Number(r.total), `Win reversed, draw ${drawNo}`]);
    }
    await t.exec('UPDATE saved_sets SET settled=0, won_points=0, notified=1 WHERE draw_no=? AND settled=1', [drawNo]);
    return rows.length;
  });
}
