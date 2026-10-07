'use client';

import { useRouter } from 'next/navigation';
import type { Currency } from '@/lib/types';

export function CurrencySwitch({ currencies, current }: { currencies: Currency[]; current: string }) {
  const router = useRouter();
  if (currencies.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-mute">
      <span className="sr-only">Show prizes in</span>
      <select
        value={current}
        onChange={(e) => {
          document.cookie = `cur=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className="h-9 rounded-lg border border-line bg-night px-2 font-mono text-ivory"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </label>
  );
}
