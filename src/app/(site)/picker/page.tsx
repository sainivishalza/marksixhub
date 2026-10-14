import { JsonLd } from '@/components/json-ld';
import { Picker } from '@/components/picker';
import { getUser } from '@/lib/auth';
import { walletFor } from '@/lib/points';
import { getSettings } from '@/lib/settings';
import { getCurrentCurrency, getLatestDraw, getNextDraw, getPrizes } from '@/lib/data';
import { breadcrumbLd } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-db';

export const generateMetadata = () => seoMetadata('/picker');

export default async function PickerPage() {
  const [{ current }, latest, next, user, settings] = await Promise.all([getCurrentCurrency(), getLatestDraw(), getNextDraw(), getUser(), getSettings()]);
  const prizes = latest ? await getPrizes(latest.id) : [];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Mark Six number picker</h1>
      <p className="mb-8 mt-3 max-w-[60ch] text-mute">
        Pick six numbers from 1 to 49, or press Quick pick. Share your ticket with a link. Every combination has the same chance, so choose whatever feels right.
      </p>
      <ol aria-label="How it works" className="mb-8 grid gap-2 text-sm text-mute sm:grid-cols-3">
        {[
          ['1', 'Pick', 'Choose six numbers, or Quick pick. Add each ticket to your slip.'],
          ['2', 'Submit', `Log in and submit. ${settings.ticketPoints} free points per ticket. Our team approves it.`],
          ['3', 'Wait for the draw', 'Follow the status in your account. Wins are added as points.'],
        ].map(([n, title, text]) => (
          <li key={n} className="flex gap-3 rounded-xl border border-line/60 p-3">
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold font-mono text-xs text-gold-bright">{n}</span>
            <span><strong className="block text-ivory">{title}</strong>{text}</span>
          </li>
        ))}
      </ol>
      <Picker latest={latest ? { drawNo: latest.drawNo, numbers: latest.numbers, extra: latest.extra } : null} nextNo={next?.drawNo ?? null} prizes={prizes} currency={current} wallet={user ? await walletFor(user.id, settings.ticketPoints) : null} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Number picker', path: '/picker' }])} />
    </div>
  );
}
