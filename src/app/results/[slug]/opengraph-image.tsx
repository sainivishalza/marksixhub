import { ImageResponse } from 'next/og';
import { getDrawByNo } from '@/lib/data';
import { dateLabel } from '@/lib/format';
import { ballTone } from '@/lib/mark6';
import { isDrawSlug, slugToDrawNo } from '@/lib/types';

export const alt = 'Mark Six result';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TONE = { red: '#C8102E', blue: '#1F4FD8', green: '#12804A' };

export default async function ResultOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draw = isDrawSlug(slug) ? await getDrawByNo(slugToDrawNo(slug)) : null;
  const ball = (n: number, extra = false) => (
    <div key={`${n}-${extra}`} style={{ width: 104, height: 104, borderRadius: 52, background: TONE[ballTone(n)], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 700, color: '#fff', border: extra ? '5px solid #F5C542' : '3px solid rgba(255,255,255,0.35)' }}>
      {n}
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0A0E1A', color: '#F3EFE4' }}>
        <div style={{ fontSize: 30, color: '#D4AF37' }}>Mark Six Hub</div>
        <div style={{ fontSize: 80, fontWeight: 700, marginTop: 12 }}>{draw ? `Draw ${draw.drawNo}` : 'Mark Six result'}</div>
        <div style={{ fontSize: 34, marginTop: 8, color: '#A9B0C0' }}>{draw ? dateLabel(draw.drawDate) : ''}</div>
        {draw ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 52 }}>
            {draw.numbers.map((n) => ball(n))}
            <div style={{ fontSize: 56, color: '#D4AF37' }}>+</div>
            {draw.extra ? ball(draw.extra, true) : null}
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
