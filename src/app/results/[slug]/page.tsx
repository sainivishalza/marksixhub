import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { ResultStub } from '@/components/result-stub';
import { getCurrentCurrency, getDrawByNo, getPrizes } from '@/lib/data';
import { dateLabel, drawMoment } from '@/lib/format';
import { SITE_NAME, absolute, breadcrumbLd, pageMetadata } from '@/lib/seo';
import { isDrawSlug, slugToDrawNo } from '@/lib/types';

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  return isDrawSlug(slug) ? getDrawByNo(slugToDrawNo(slug)) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const draw = await load(slug);
  if (!draw) return { title: 'Result not found', robots: { index: false } };
  return pageMetadata({
    title: `Mark Six Result ${draw.drawNo}, ${dateLabel(draw.drawDate, { weekday: undefined })}`,
    description: `Mark Six draw ${draw.drawNo} winning numbers: ${draw.numbers.join(', ')} with extra number ${draw.extra}. Full prize breakdown for all 7 divisions.`,
    path: `/results/${slug}`,
  });
}

export default async function ResultPage({ params }: { params: Params }) {
  const { slug } = await params;
  const draw = await load(slug);
  if (!draw) notFound();
  const [{ current }, prizes] = await Promise.all([getCurrentCurrency(), getPrizes(draw.id)]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ResultStub draw={draw} prizes={prizes} currency={current} heading="h1" link={false} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: `Mark Six draw ${draw.drawNo}`,
          startDate: drawMoment(draw.drawDate),
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          location: { '@type': 'VirtualLocation', url: absolute(`/results/${slug}`) },
          description: `Winning numbers ${draw.numbers.join(', ')}, extra number ${draw.extra}.`,
          organizer: { '@type': 'Organization', name: SITE_NAME, url: absolute('/') },
        }}
      />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Results', path: '/results' }, { name: draw.drawNo, path: `/results/${slug}` }])} />
    </div>
  );
}
