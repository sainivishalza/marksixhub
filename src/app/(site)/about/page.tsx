import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { getSettings } from '@/lib/settings';
import { CONTACT_EMAIL, OPERATOR_ADDRESS, OPERATOR_NAME, absolute, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About Mark Six Hub',
  description: 'What Mark Six Hub is, where the results come from, how free play points and approvals work, and who to contact.',
  path: '/about',
});

const h2 = 'pt-6 text-2xl text-ivory';
const link = 'text-gold-bright underline underline-offset-4';

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed text-mute sm:px-6">
      <h1 className="text-4xl text-ivory sm:text-5xl">About {s.siteName}</h1>
      <p className="text-lg">
        {s.siteName} is a free, independent site for the Hong Kong Mark Six: a number picker, every recent result with its prizes, simple statistics, and a play-for-fun points game. It is not affiliated with or endorsed by the lottery operator.
      </p>

      <h2 className={h2}>Free play, no money</h2>
      <p>
        Nothing here costs money and nothing pays out money. Points are free credits you earn by signing up and coming back each day. A ticket costs {s.ticketPoints} points, and winnings are paid back in points. Points cannot be bought, sold or cashed out. To play the real Mark Six you must use the official operator in Hong Kong. See the <Link href="/terms" className={link}>Terms</Link>.
      </p>

      <h2 className={h2}>Where the results come from</h2>
      <p>
        Each draw is entered by our team from the official published result, with the prize for every division. Before a result goes live we check a payout preview. You can open any draw on the <Link href="/results" className={link}>results page</Link> and see its numbers, extra number and prizes. If you spot a mistake, <Link href="/contact" className={link}>tell us</Link> and we will correct it.
      </p>

      <h2 className={h2}>How a ticket is handled</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>You pick six numbers and submit them. Your points are taken and the order shows as <strong className="text-ivory">pending</strong>.</li>
        <li>Our team reviews it. It becomes <strong className="text-ivory">accepted</strong> and you get a receipt, or it is <strong className="text-ivory">rejected</strong> and your points come back.</li>
        <li>After the draw the result is published and each accepted ticket is checked automatically. Wins are added to your balance.</li>
      </ol>
      <p>Every step is recorded, and your order page shows its status. Tickets are always exactly six different numbers from 1 to 49.</p>

      <h2 className={h2}>No predictions</h2>
      <p>
        The <Link href="/statistics" className={link}>statistics</Link> describe what has been drawn. Every draw is independent, so past results never make a number more or less likely next time. We will never claim to predict a draw.
      </p>

      {OPERATOR_NAME ? (
        <>
          <h2 className={h2}>Who runs the site</h2>
          <p>
            {s.siteName} is run by {OPERATOR_NAME}
            {OPERATOR_ADDRESS ? `, ${OPERATOR_ADDRESS}` : ''}.
          </p>
        </>
      ) : null}

      <h2 className={h2}>Contact</h2>
      <p>
        Questions, corrections or data requests: use the <Link href="/contact" className={link}>contact form</Link> or email <a href={`mailto:${CONTACT_EMAIL}`} className={link}>{CONTACT_EMAIL}</a>. See also the <Link href="/privacy" className={link}>Privacy policy</Link> for how your data is handled.
      </p>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: `About ${s.siteName}`,
          url: absolute('/about'),
          mainEntity: { '@type': 'Organization', name: OPERATOR_NAME || s.siteName, url: absolute('/'), email: CONTACT_EMAIL },
        }}
      />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }])} />
    </div>
  );
}
