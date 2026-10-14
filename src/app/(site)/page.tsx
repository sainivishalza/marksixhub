import Link from 'next/link';
import { BarChart3, Crown, Dices, FileCheck2, Gift, ListChecks, Search, ShieldCheck, Ticket, Trophy } from 'lucide-react';
import { FaqList } from '@/components/faq-list';
import { HeroActions } from '@/components/hero-actions';
import { Jackpot } from '@/components/jackpot';
import { NextDrawPanel } from '@/components/next-draw-panel';
import { Picker } from '@/components/picker';
import { ResultStub } from '@/components/result-stub';
import { ResultsTable } from '@/components/results-table';
import { getUser } from '@/lib/auth';
import { walletFor } from '@/lib/points';
import { getCurrentCurrency, getDraws, getEvents, getFaqs, getLatestDraw, getNextDraw, getPrizes, getTopPrizes } from '@/lib/data';
import { dateLabel } from '@/lib/format';
import { seoMetadata } from '@/lib/seo-db';
import { getSettings } from '@/lib/settings';

const STEPS = [
  { icon: Dices, title: 'Choose six numbers', text: 'Tap six numbers on the board, or press Quick pick and we choose for you. Add as many tickets as you like.' },
  { icon: Ticket, title: 'Submit with free points', text: 'Log in and submit. Each ticket costs free points, and our team approves it. You get a receipt you can download.' },
  { icon: Trophy, title: 'Follow the result', text: 'When the draw is published, every approved ticket is checked automatically and wins are added to your points.' },
];

const FACTS = [
  { icon: Gift, text: 'Free play only: no money, no deposits, no cash-out' },
  { icon: FileCheck2, text: 'Standard Mark Six format: 6 from 49, plus an extra number' },
  { icon: ShieldCheck, text: 'Independent site for adults (18+). Not affiliated with the lottery operator' },
];

const TOOLS = [
  { href: '/check', icon: ListChecks, title: 'Check my numbers', text: 'Did your lucky six ever win? Type them in and see.' },
  { href: '/results', icon: Search, title: 'Search results', text: 'Find any draw by its number, or every draw with your favourite number.' },
  { href: '/statistics', icon: BarChart3, title: 'Number statistics', text: 'How often each number has come up, and how long since it last did.' },
  { href: '/leaderboard', icon: Crown, title: 'Leaderboard', text: 'The top free play point balances. Add a nickname to join.' },
];

export const generateMetadata = () => seoMetadata('/');

export default async function HomePage() {
  const [{ current }, latest, next, recent, events, faqs, user, settings] = await Promise.all([
    getCurrentCurrency(),
    getLatestDraw(),
    getNextDraw(),
    getDraws(5),
    getEvents(),
    getFaqs(),
    getUser(),
    getSettings(),
  ]);
  const [prizes, tops] = await Promise.all([latest ? getPrizes(latest.id) : Promise.resolve([]), getTopPrizes(recent.draws.map((d) => d.id))]);

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-start gap-10 px-4 pb-8 pt-10 grid-cols-[minmax(0,1fr)] sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:px-8 lg:pt-16">
        <div className="min-w-0 lg:pt-6">
          <h1 className="gold-text font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">Pick your lucky 6</h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-mute">
            Choose six numbers from 1 to 49, or let us pick for you. Play for free points and follow the next Hong Kong Mark Six draw.
          </p>
          <ul aria-label="Good to know" className="mt-4 flex flex-wrap gap-2 text-xs">
            {['Free play', 'No deposits', 'No cash-out', '18+ only'].map((t) => (
              <li key={t} className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-gold-bright">{t}</li>
            ))}
          </ul>
          <p lang="zh-HK" className="mt-3 text-sm text-mute">六合彩 · 香港六合彩號碼選擇器及攪珠結果</p>

          <div className="mt-8">
            {!settings.showJackpot ? null : next && next.estJackpotHkd > 0 ? (
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
            {user ? null : (
              <p className="mt-4 text-sm text-mute">
                New here? <Link href="/register" className="text-gold-bright underline underline-offset-4">Create a free account</Link> and start with {settings.signupPoints.toLocaleString('en')} points.
              </p>
            )}
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
            nextNo={next?.drawNo ?? null}
            prizes={prizes}
            currency={current}
            wallet={user ? await walletFor(user.id, settings.ticketPoints) : null}
          />
        </div>
      </section>

      <section aria-label="Tools" className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ href, icon: Icon, title, text }) => (
            <li key={href}>
              <Link href={href} className="surface flex h-full gap-3 p-4 transition-colors hover:border-gold">
                <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <span>
                  <strong className="block font-serif text-lg font-semibold text-ivory">{title}</strong>
                  <span className="mt-1 block text-sm text-mute">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        {next ? (
          <NextDrawPanel draw={next} currency={current} showPrizes={settings.showJackpot} />
        ) : (
          <div className="surface p-6 sm:p-8">
            <h2 className="text-3xl">Next draw</h2>
            <p className="mt-2 text-mute">The next draw will be announced here as soon as the date is known.</p>
          </div>
        )}
      </section>

      <section className={`mx-auto mt-16 grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 ${events.length ? 'lg:grid-cols-[1.4fr_1fr]' : ''}`}>
        <div className="min-w-0">
          <h2 className="mb-5 text-3xl">Latest result</h2>
          {latest ? <ResultStub draw={latest} prizes={prizes} currency={current} /> : <p className="text-mute">The first result will appear here once it is published.</p>}
        </div>

        {events.length ? (
          <aside className="min-w-0">
            <h2 className="mb-4 text-3xl">Coming up</h2>
            <ul className="space-y-4">
              {events.map((e) => (
                <li key={e.id}>
                  <p className="font-serif text-lg">{e.title}</p>
                  <time dateTime={e.eventDate} className="text-sm text-gold-bright">{dateLabel(e.eventDate)}</time>
                  {e.body ? <p className="mt-1 text-sm text-mute">{e.body}</p> : null}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
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
        <ResultsTable draws={recent.draws} tops={tops} currency={current} />
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-3xl">Common questions</h2>
        <FaqList items={faqs.slice(0, 5)} />
        <p className="mt-5">
          <Link href="/faq" className="text-gold-bright underline-offset-4 hover:underline">More questions and answers</Link>
        </p>
      </section>
    </>
  );
}
