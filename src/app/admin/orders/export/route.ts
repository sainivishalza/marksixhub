import { getDrawOrders } from '@/lib/admin-data';
import { requireRole } from '@/lib/auth';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await requireRole('view');
  const draw = new URL(request.url).searchParams.get('draw')?.trim() ?? '';
  const { orders } = await getDrawOrders(draw);
  const csv = toCsv([
    ['draw', 'order', 'email', 'placed_utc', 'order_points', 'refunded', 'numbers', 'tickets', 'result_points'],
    ...orders.flatMap((o) =>
      (o.tickets.length ? o.tickets : [{ nums: '', units: 0, won: null }]).map((t) => [draw, o.id, o.email, o.createdAt, o.points, o.refunded ? 'yes' : 'no', t.nums.replace(/,/g, ' '), t.units, t.won ?? '']),
    ),
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${draw.replace(/[^0-9A-Za-z-]/g, '-')}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
