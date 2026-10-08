import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mark Six Hub',
    short_name: 'Mark Six',
    description: 'Free Mark Six number picker and results.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0E1A',
    theme_color: '#0A0E1A',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
