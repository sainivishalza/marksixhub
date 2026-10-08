import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from './db';
import { mailConfigured, sendMail } from './mail';
import { BASE_URL } from './seo';

type Row = RowDataPacket & { id: number; order_no: string | null; draw_no: string; points: number; tickets: number; email: string };

/** Tells buyers what happened to their orders. Runs in the background: a mail problem never blocks the admin. */
export function notifyOrders(kind: 'accepted' | 'rejected', ids: number[]): void {
  if (!ids.length || !mailConfigured) return;
  void (async () => {
    const rows = await query<Row>(
      `SELECT o.id, o.order_no, o.draw_no, o.points, o.tickets, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    for (const o of rows) {
      const no = o.order_no ?? `#${o.id}`;
      const link = `${BASE_URL}/account/orders/${o.id}`;
      if (kind === 'accepted') {
        await sendMail(
          o.email,
          `Your receipt is ready: order ${no}`,
          `Good news: your order ${no} for draw ${o.draw_no} (${o.tickets} ticket${o.tickets === 1 ? '' : 's'}) has been accepted.\n\nYour receipt is ready. Log in and open it here to view or download it:\n${link}\n\nThe numbers now wait for the draw result. If you win, the points are added to your balance automatically.`,
        );
      } else {
        await sendMail(
          o.email,
          `Order ${no} was not accepted`,
          `Your order ${no} for draw ${o.draw_no} was not accepted, so no receipt was issued. The ${o.points} points have been returned to your balance.\n\nYou can place a new order any time before the draw closes:\n${BASE_URL}/picker`,
        );
      }
    }
  })().catch((err) => console.error('order mail failed:', err));
}

/** Emails players whose tickets just won. `wins` maps user id to the points won per draw in this settlement. */
export function notifyWins(wins: Map<number, Map<string, number>>): void {
  if (!wins.size || !mailConfigured) return;
  void (async () => {
    const ids = [...wins.keys()];
    const users = await query<RowDataPacket & { id: number; email: string }>(`SELECT id, email FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    for (const u of users) {
      for (const [drawNo, points] of wins.get(u.id) ?? []) {
        await sendMail(u.email, `You won ${points} points in draw ${drawNo}`, `Good news: your tickets for draw ${drawNo} won ${points} points. They are already in your balance.

See your orders:
${BASE_URL}/account

Points are free play credits with no cash value.`);
      }
    }
  })().catch((err) => console.error('win mail failed:', err));
}
