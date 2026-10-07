import { JsonLd } from '@/components/json-ld';
import { Picker } from '@/components/picker';
import { getCurrentCurrency, getLatestDraw, getPrizes } from '@/lib/data';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Mark Six Number Picker: Free Quick Pick for 6 from 49',
  description: 'Free Mark Six number picker. Choose your own six numbers or use Quick Pick, then check them against the latest Hong Kong result.',
  path: '/picker',
});

export default async function PickerPage() {
  const [{ current }, latest] = await Promise.all([getCurrentCurrency(), getLatestDraw()]);
  const prizes = latest ? await getPrizes(latest.id) : [];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Mark Six number picker</h1>
      <p className="mb-8 mt-3 max-w-[60ch] text-mute">
        Pick six numbers from 1 to 49, or press Quick pick. Share your ticket with a link. Every combination has the same chance, so choose whatever feels right.
      </p>
      <Picker latest={latest ? { drawNo: latest.drawNo, numbers: latest.numbers, extra: latest.extra } : null} prizes={prizes} currency={current} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Number picker', path: '/picker' }])} />
    </div>
  );
}
