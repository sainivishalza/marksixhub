import { ImageResponse } from 'next/og';

// Home-screen icons for the web app manifest: the three-ball logo in a gold ring (192 and 512 only).
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const px = (await params).size === '512' ? 512 : 192;
  const r = px * 0.2;
  const ball = (left: number, top: number, bg: string) => <div style={{ position: 'absolute', left: px * left - r, top: px * top - r, width: r * 2, height: r * 2, borderRadius: '50%', background: bg }} />;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#0A0E1A' }}>
        <div style={{ position: 'absolute', left: px * 0.1, top: px * 0.1, width: px * 0.8, height: px * 0.8, borderRadius: '50%', border: `${Math.max(4, px * 0.04)}px solid #D4AF37` }} />
        {ball(0.36, 0.39, '#C8102E')}
        {ball(0.64, 0.39, '#1F4FD8')}
        {ball(0.5, 0.64, '#12804A')}
      </div>
    ),
    { width: px, height: px },
  );
}
