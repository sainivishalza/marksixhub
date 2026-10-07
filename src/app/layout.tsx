import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import { JsonLd } from '@/components/json-ld';
import { BASE_URL, IS_STAGING, absolute } from '@/lib/seo';
import { getSettings } from '@/lib/settings';
import './globals.css';

const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = `Mark Six Number Picker & Results | ${s.siteName}`;
  return {
    metadataBase: new URL(BASE_URL),
    title: { default: title, template: `%s | ${s.siteName}` },
    description: s.siteDescription,
    applicationName: s.siteName,
    keywords: ['Mark Six results', 'Mark Six number picker', 'HK Mark Six', '六合彩', 'Mark Six jackpot HKD', 'Mark Six quick pick'],
    alternates: { canonical: '/' },
    robots: IS_STAGING ? { index: false, follow: false } : undefined,
    openGraph: { type: 'website', siteName: s.siteName, title, description: s.siteDescription, url: '/', locale: 'en_HK' },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = { themeColor: '#0A0E1A', colorScheme: 'dark' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} dark`}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-night">
          Skip to content
        </a>
        {children}
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: settings.siteName, url: absolute('/'), inLanguage: 'en' }} />
      </body>
    </html>
  );
}
