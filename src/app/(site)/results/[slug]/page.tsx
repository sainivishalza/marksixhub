import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { ResultStub } from '@/components/result-stub';
import { UnlockPanel } from '@/components/unlock-panel';
import { getUser } from '@/lib/auth';
import { getCurrentCurrency, getDrawByNo, getPrizes } from '@/lib/data';
import { getHistoryAccess } from '@/lib/history';
import { yearsNeeded } from '@/lib/history-rules';
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
  // Results outside the free window are not for search engines, and their numbers stay out of the page title.
  const open = await getHistoryAccess(null);
  if (open.from && draw.drawDate < open.from) return { title: `Mark Six draw ${draw.drawNo}`, robots: { index: false, follow: true } };
  return pageMetadata({
    title: `Mark Six Result ${draw.drawNo}, ${dateLabel(draw.drawDate, { weekday: undefined })}`,
    description: `Mark Six draw ${draw.drawNo} winning numbers: ${draw.numbers.join(', ')} with extra number ${draw.extra}. Full prize breakdown for all 7 divisions.`,
    path: `/results/${slug}`,
  });
}

export default async function ResultPage({ params, searchParams }: { params: Params; searchParams: Promise<{ unlock?: string }> }) {
  const { slug } = await params;
  const { unlock } = await searchParams;
  const draw = await load(slug);
  if (!draw) notFound();
  const user = await getUser();
  const access = await getHistoryAccess(user);
  if (access.from && draw.drawDate < access.from) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl">Draw {draw.drawNo}</h1>
        <p className="mt-2 text-mute">{dateLabel(draw.drawDate)}</p>
        <p className="mt-6 max-w-[60ch] text-ivory">This result is part of the older results. The latest 40 are free; older ones are unlocked with points.</p>
        <UnlockPanel access={access} user={user} path={`/results/${slug}`} flash={unlock} highlight={access.latest ? yearsNeeded(access.latest, draw.drawDate) : undefined} />
      </div>
    );
  }
  const [{ current }, prizes] = await Promise.all([getCurrentCurrency(), getPrizes(draw.id)]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ResultStub draw={draw} prizes={prizes} currency={current} heading="h1" link={false} />
      {unlock ? <UnlockPanel access={access} user={user} path={`/results/${slug}`} flash={unlock} /> : null}
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
