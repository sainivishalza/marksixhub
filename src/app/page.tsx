import Link from 'next/link';
import { Dices, ListChecks, Trophy, ShieldCheck, Gift, FileCheck2 } from 'lucide-react';
import { Countdown } from '@/components/countdown';
import { FaqList } from '@/components/faq-list';
import { HeroActions } from '@/components/hero-actions';
import { Jackpot } from '@/components/jackpot';
import { Picker } from '@/components/picker';
import { ResultStub } from '@/components/result-stub';
import { ResultsTable } from '@/components/results-table';
import { getCurrentCurrency, getDraws, getEvents, getLatestDraw, getNextDraw, getPrizes } from '@/lib/data';
import { FAQS } from '@/lib/faq';
import { dateLabel, drawMoment } from '@/lib/format';

const STEPS = [
  { icon: Dices, title: 'Choose six numbers', text: 'Tap six numbers on the board, or press Quick pick and we choose for you.' },
  { icon: ListChecks, title: 'Check the latest draw', text: 'Your ticket is compared with the latest result, with the prize it would have won.' },
  { icon: Trophy, title: 'Play only through the HKJC', text: 'We never take bets. If you are eligible to play, use the official Hong Kong Jockey Club channels.' },
];

const FACTS = [
  { icon: FileCheck2, text: 'Standard Mark Six format: 6 from 49, plus an extra number' },
  { icon: Gift, text: 'Free to use. No sign-up needed to pick numbers' },
  { icon: ShieldCheck, text: 'Independent site. We never take bets or hold money' },
];

export default async function HomePage() {
  const [{ current }, latest, next, recent, events] = await Promise.all([
    getCurrentCurrency(),
    getLatestDraw(),
    getNextDraw(),
    getDraws(5),
    getEvents(),
  ]);
  const prizes = latest ? await getPrizes(latest.id) : [];

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-start gap-10 px-4 pb-8 pt-10 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:px-8 lg:pt-16">
        <div className="lg:pt-6">
          <h1 className="gold-text font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">Pick your lucky 6</h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-mute">
            Choose six numbers from 1 to 49, or let us pick for you. Then see how they would have done in the latest Hong Kong Mark Six draw.
          </p>

          <div className="mt-8">
            {next && next.estJackpotHkd > 0 ? (
              <>
                <Jackpot valueHkd={next.estJackpotHkd} currency={current} />
                <p className="mt-1 text-sm text-mute">
                  Estimated first prize, draw {next.drawNo}, {dateLabel(next.drawDate, { weekday: undefined })}
                </p>
              </>
            ) : (
              <p className="font-serif text-2xl text-ivory">The next jackpot estimate appears here once it is announced.</p>
            )}
          </div>

          <div className="mt-8">
            <HeroActions />
          </div>

          <ul className="mt-10 grid gap-3 text-sm text-mute">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <Icon aria-hidden className="h-5 w-5 shrink-0 text-gold" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <Picker
            latest={latest ? { drawNo: latest.drawNo, numbers: latest.numbers, extra: latest.extra } : null}
            prizes={prizes}
            currency={current}
          />
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="min-w-0">
          <h2 className="mb-5 text-3xl">Latest result</h2>
          {latest ? <ResultStub draw={latest} prizes={prizes} currency={current} /> : <p className="text-mute">The first result will appear here once it is published.</p>}
        </div>

        <aside className="min-w-0 space-y-8">
          <div>
            <h2 className="mb-5 text-3xl">Next draw</h2>
            {next ? (
              <div className="surface p-6">
                <p className="font-serif text-xl">Draw {next.drawNo}</p>
                <p className="mb-5 text-mute">{dateLabel(next.drawDate)}, about 9:30 pm Hong Kong time</p>
                <Countdown target={drawMoment(next.drawDate)} />
                {next.note ? <p className="mt-5 text-sm text-mute">{next.note}</p> : null}
              </div>
            ) : (
              <p className="text-mute">The next draw date will be announced soon.</p>
            )}
          </div>

          {events.length ? (
            <div>
              <h2 className="mb-4 text-2xl">Coming up</h2>
              <ul className="space-y-4">
                {events.map((e) => (
                  <li key={e.id}>
                    <p className="font-serif text-lg">{e.title}</p>
                    <time dateTime={e.eventDate} className="text-sm text-gold-bright">{dateLabel(e.eventDate)}</time>
                    {e.body ? <p className="mt-1 text-sm text-mute">{e.body}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative pl-16">
              <span aria-hidden className="absolute left-0 top-0 grid h-12 w-12 place-items-center rounded-full border border-gold/60 font-mono text-lg text-gold-bright">{i + 1}</span>
              <h3 className="flex items-center gap-2 text-xl">
                {title}
                <Icon aria-hidden className="h-4 w-4 text-gold" />
              </h3>
              <p className="mt-2 max-w-[40ch] text-mute">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6">
          <Link href="/guide" className="text-gold-bright underline-offset-4 hover:underline">Read the full guide and prize divisions</Link>
        </p>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-3xl">Recent results</h2>
          <Link href="/results" className="text-gold-bright underline-offset-4 hover:underline">All results</Link>
        </div>
        <ResultsTable draws={recent.draws} />
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-3xl">Common questions</h2>
        <FaqList items={FAQS.slice(0, 5)} />
        <p className="mt-5">
          <Link href="/faq" className="text-gold-bright underline-offset-4 hover:underline">More questions and answers</Link>
        </p>
      </section>
    </>
  );
}
