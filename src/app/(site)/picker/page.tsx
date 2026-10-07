import { JsonLd } from '@/components/json-ld';
import { Picker } from '@/components/picker';
import { getUser } from '@/lib/auth';
import { getPoints } from '@/lib/points';
import { getSettings } from '@/lib/settings';
import { getCurrentCurrency, getLatestDraw, getNextDraw, getPrizes } from '@/lib/data';
import { breadcrumbLd } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-db';

export const generateMetadata = () => seoMetadata('/picker');

export default async function PickerPage() {
  const [{ current }, latest, user, next, settings] = await Promise.all([getCurrentCurrency(), getLatestDraw(), getUser(), getNextDraw(), getSettings()]);
  const prizes = latest ? await getPrizes(latest.id) : [];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Mark Six number picker</h1>
      <p className="mb-8 mt-3 max-w-[60ch] text-mute">
        Pick six numbers from 1 to 49, or press Quick pick. Share your ticket with a link. Every combination has the same chance, so choose whatever feels right.
      </p>
      <Picker latest={latest ? { drawNo: latest.drawNo, numbers: latest.numbers, extra: latest.extra } : null} prizes={prizes} currency={current} wallet={user ? { points: await getPoints(user.id), cost: settings.ticketPoints, drawNo: next?.drawNo ?? null } : null} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Number picker', path: '/picker' }])} />
    </div>
  );
}
