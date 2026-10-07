import { ImageResponse } from 'next/og';
import { ballTone } from '@/lib/mark6';

export const alt = 'Mark Six Hub: free Mark Six number picker and results';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TONE = { red: '#C8102E', blue: '#1F4FD8', green: '#12804A' };

export default function OgImage() {
  const demo = [3, 12, 25, 31, 40, 49];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0A0E1A', color: '#F3EFE4' }}>
        <div style={{ fontSize: 30, color: '#D4AF37' }}>Mark Six Hub</div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 16, color: '#F5C542' }}>Pick your lucky 6</div>
        <div style={{ fontSize: 34, marginTop: 12, color: '#A9B0C0' }}>Free number picker and the latest Mark Six results</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 56 }}>
          {demo.map((n) => (
            <div key={n} style={{ width: 96, height: 96, borderRadius: 48, background: TONE[ballTone(n)], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 700, color: '#fff', border: '3px solid rgba(255,255,255,0.35)' }}>
              {n}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
