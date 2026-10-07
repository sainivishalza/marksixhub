import { ScrollText, Ticket, Trophy } from 'lucide-react';

const POINTS = [
  { icon: Ticket, title: 'Pick and submit', text: 'Choose your own six numbers or let quick pick do it. Submit as many tickets as you like.' },
  { icon: ScrollText, title: 'Get a receipt', text: 'Every accepted order comes with a receipt you can download and keep.' },
  { icon: Trophy, title: 'Follow the result', text: 'See each entry go from submitted to accepted to its result, with winnings added to your points.' },
];

/** Log in and sign up share one frame: title first, then the form, with what an account gives you beside or below it. */
export function AuthShell({ title, intro, children, welcome }: { title: string; intro: string; children: React.ReactNode; welcome?: number }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-x-16 gap-y-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_26rem] lg:py-20">
      <div className="lg:col-start-1 lg:row-start-1">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-[48ch] text-lg text-mute">{intro}</p>
        {welcome ? <p className="mt-5 inline-block rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-sm text-gold-bright">{welcome.toLocaleString('en-US')} free welcome points when you confirm your email</p> : null}
      </div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">{children}</div>
      <ul className="space-y-5 lg:col-start-1 lg:row-start-2">
        {POINTS.map(({ icon: Icon, title: t, text }) => (
          <li key={t} className="flex gap-4">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-raised"><Icon className="h-5 w-5 text-gold-bright" /></span>
            <span>
              <span className="block font-medium text-ivory">{t}</span>
              <span className="block max-w-[46ch] text-sm text-mute">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
