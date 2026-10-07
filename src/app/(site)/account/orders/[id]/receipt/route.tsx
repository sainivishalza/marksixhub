import { createHash } from 'node:crypto';
import { ImageResponse } from 'next/og';
import type { RowDataPacket } from 'mysql2/promise';
import { getUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { parseNumbers, sortAsc } from '@/lib/mark6';
import { groupRef, receiptDate, receiptLine, STATUS_LABEL } from '@/lib/receipt';
import { BASE_URL } from '@/lib/seo';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const W = 600;
const INK = '#16181d';
const MUTE = '#5b616e';
const rule = { display: 'flex', flexShrink: 0, width: '100%', borderTop: '2px dashed #9aa0ac', marginTop: 18, marginBottom: 18 } as const;

// The receipt is a PNG so it can be saved or shared as it is. Only the owner can fetch it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  const user = await getUser();
  if (!user || !Number.isInteger(id)) return new Response('Not found', { status: 404 });
  const [order] = await query<RowDataPacket & { draw_no: string; tickets: number; points: number; status: string; created_at: string }>(
    'SELECT draw_no, tickets, points, status, created_at FROM orders WHERE id=? AND user_id=?',
    [id, user.id],
  );
  if (!order) return new Response('Not found', { status: 404 });
  const sets = await query<RowDataPacket & { nums: string }>('SELECT nums FROM saved_sets WHERE order_id=? AND user_id=? ORDER BY id', [id, user.id]);
  const lines = sets.map((s) => receiptLine(sortAsc(parseNumbers(s.nums))));
  const { siteName } = await getSettings();
  const unit = order.tickets ? Math.round(Number(order.points) / Number(order.tickets)) : 0;
  const ref = groupRef(createHash('sha256').update(`${process.env.SESSION_SECRET ?? 'dev'}|receipt|${id}|${order.created_at}`).digest('hex'));
  const host = new URL(BASE_URL).host;
  const height = 830 + Math.max(lines.length, 1) * 60;
  const label = STATUS_LABEL[order.status] ?? order.status.toUpperCase();

  const image = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fbfaf6', color: INK, padding: '36px 44px', fontSize: 28 }}>
        <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'center', fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>Receipt</div>
        <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'center', fontSize: 22, color: MUTE, marginTop: 6, lineHeight: 1.3 }}>{siteName}</div>
        <div style={rule} />
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 22, color: MUTE, lineHeight: 1.35 }}>
          Free play points order. Points have no cash value and cannot be bought or withdrawn. Points won are added to your points balance.
        </div>
        <div style={rule} />
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 40, fontWeight: 700 }}>Mark Six</div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 30, marginTop: 10 }}>Draw No. {order.draw_no}</div>
        <div style={{ display: 'flex', flexShrink: 0, flexDirection: 'column', marginTop: 18 }}>
          {lines.length ? lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 38, fontWeight: 700, marginTop: 8 }}>{l}</div>
          )) : <div style={{ display: 'flex', flexShrink: 0, fontSize: 26, color: MUTE }}>No tickets left on this order.</div>}
        </div>
        <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'space-between', marginTop: 30, fontSize: 30 }}>
          <span>Unit Bet</span><span>{unit} points</span>
        </div>
        <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'space-between', marginTop: 6, fontSize: 36, fontWeight: 700 }}>
          <span>Total</span><span>{order.points} points</span>
        </div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 26, marginTop: 22 }}>{receiptDate(order.created_at)} HKT</div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 26, marginTop: 8, fontWeight: 700 }}>Status: {label}</div>
        <div style={rule} />
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 24 }}>Order No.: {String(id).padStart(6, '0')}</div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 24, marginTop: 6 }}>Ref.: {ref}</div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 20, color: MUTE, marginTop: 18 }}>{host}</div>
      </div>
    ),
    { width: W, height },
  );

  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'private, no-store');
  if (new URL(request.url).searchParams.get('download')) headers.set('Content-Disposition', `attachment; filename="receipt-order-${id}.png"`);
  return new Response(image.body, { status: 200, headers });
}
