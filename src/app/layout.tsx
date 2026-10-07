import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { BASE_URL, SITE_NAME, absolute } from '@/lib/seo';
import './globals.css';

const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const DESCRIPTION =
  'Free Hong Kong Mark Six number picker with the latest results, jackpot estimates and prize breakdown. Pick 6 numbers from 1 to 49 in seconds.';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: `Mark Six Number Picker & Results | ${SITE_NAME}`, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['Mark Six results', 'Mark Six number picker', 'HK Mark Six', '六合彩', 'Mark Six jackpot HKD', 'Mark Six quick pick'],
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: SITE_NAME, title: `Mark Six Number Picker & Results | ${SITE_NAME}`, description: DESCRIPTION, url: '/', locale: 'en_HK' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#0A0E1A', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} dark`}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-night">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absolute('/'), inLanguage: 'en' }} />
      </body>
    </html>
  );
}
