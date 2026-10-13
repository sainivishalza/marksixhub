import { ImageResponse } from 'next/og';

// Home-screen icons for the web app manifest: a gold ball on the night background (192 and 512 only).
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const px = (await params).size === '512' ? 512 : 192;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0E1A' }}>
        <div style={{ width: px * 0.62, height: px * 0.62, borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px * 0.3, fontWeight: 700, color: '#0A0E1A' }}>6</div>
      </div>
    ),
    { width: px, height: px },
  );
}
