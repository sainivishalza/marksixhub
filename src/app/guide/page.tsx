import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { DIVISION_LABEL, DIVISION_RULE } from '@/lib/mark6';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'How to Play Mark Six: Rules and Prize Divisions',
  description: 'Mark Six explained in plain words: pick 6 numbers from 1 to 49, how the extra number works and what each of the 7 prize divisions needs.',
  path: '/guide',
});

export default function GuidePage() {
  return (
    <div className="prose-site mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">How to play Mark Six</h1>
      <p className="mt-4 text-lg">Mark Six is the Hong Kong Jockey Club lottery. Here is the idea in plain words.</p>

      <h2 className="mb-3 mt-10 text-2xl">The basics</h2>
      <ol className="max-w-[68ch] list-decimal space-y-2 pl-6 text-mute marker:text-gold">
        <li>A player chooses 6 different numbers from 1 to 49.</li>
        <li>In each draw, 6 winning numbers and 1 extra number are drawn.</li>
        <li>The more of your numbers match, the higher the prize division.</li>
      </ol>

      <h2 className="mb-3 mt-10 text-2xl">The 7 prize divisions</h2>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <caption className="sr-only">What each Mark Six prize division needs</caption>
          <thead className="bg-panel text-mute">
            <tr><th scope="col" className="px-4 py-3 font-medium">Prize</th><th scope="col" className="px-4 py-3 font-medium">Numbers you need to match</th></tr>
          </thead>
          <tbody>
            {DIVISION_LABEL.map((label, i) => (
              <tr key={label} className="border-t border-line/50">
                <th scope="row" className="px-4 py-3 font-serif text-base font-medium text-gold-bright">{label}</th>
                <td className="px-4 py-3 text-mute">{DIVISION_RULE[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 text-2xl">Where to play</h2>
      <p>
        Only the Hong Kong Jockey Club can accept Mark Six bets, and only where the law allows it. This site does not sell tickets or take bets. Check the official
        HKJC rules for prices, draw days and claim deadlines.
      </p>
      <p>
        Ready to choose? Try the <Link href="/picker" className="text-gold-bright underline-offset-4 hover:underline">number picker</Link> or see the{' '}
        <Link href="/results" className="text-gold-bright underline-offset-4 hover:underline">latest results</Link>. Questions are answered on the{' '}
        <Link href="/faq" className="text-gold-bright underline-offset-4 hover:underline">FAQ page</Link>.
      </p>
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Guide', path: '/guide' }])} />
    </div>
  );
}
