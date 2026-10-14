'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';

const KEY = 'mh-analytics';

/** Google Analytics sets cookies, so it only loads after the visitor says yes. The choice is remembered in this browser. */
export function Analytics({ id }: { id: string }) {
  const [choice, setChoice] = useState<'yes' | 'no' | null | undefined>(undefined);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setChoice(v === 'yes' || v === 'no' ? v : null);
    } catch {
      setChoice(null);
    }
  }, []);
  const pick = (v: 'yes' | 'no') => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setChoice(v);
  };
  return (
    <>
      {choice === 'yes' ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}</Script>
        </>
      ) : null}
      {choice === null ? (
        <div role="region" aria-label="Cookies" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel p-4 shadow-2xl">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-mute">
              May we use Google Analytics cookies to count visits? We use them only to see which pages are read. See the{' '}
              <Link href="/privacy" className="text-gold-bright underline underline-offset-4">Privacy policy</Link>.
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => pick('no')} className="h-11 rounded-xl border border-line px-5 text-sm text-ivory hover:border-gold">Decline</button>
              <button type="button" onClick={() => pick('yes')} className="h-11 rounded-xl bg-gold px-5 text-sm font-medium text-night hover:bg-gold-bright">Accept</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
