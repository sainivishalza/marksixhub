import { CONTACT_EMAIL, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Terms of Use',
  description: 'The rules for using Mark Six Hub: free-play points, no real money, adults only.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed text-mute sm:px-6">
      <h1 className="text-4xl text-ivory sm:text-5xl">Terms of use</h1>
      <p>By using this site you agree to these terms.</p>
      <h2 className="pt-4 text-2xl text-ivory">Free play only</h2>
      <p>
        Points are free play credits. They cannot be bought, sold or exchanged for money, goods or prizes. Tickets placed with points
        are for fun and do not enter any real lottery. To play the real Mark Six you must use the official operator in Hong Kong.
      </p>
      <h2 className="pt-4 text-2xl text-ivory">Sending points to other members</h2>
      <p>
        You may send free play points to another member, within the limits shown on the send page. Sending needs your password, cannot be undone by you, and is for fun between people who know each other. You must never
        ask for or accept money, goods or any other reward for points. We may cancel transfers, remove points and close accounts that break this rule, farm sign-up points through extra accounts, or look like abuse, and we may pause sending at any time.
      </p>
      <h2 className="pt-4 text-2xl text-ivory">No payments, no refunds</h2>
      <p>Nothing on this site costs money, so there is nothing to refund. If a ticket is rejected or a result is corrected, the points are returned to your balance.</p>
      <h2 className="pt-4 text-2xl text-ivory">Adults only</h2>
      <p>You must be 18 or older. Play responsibly.</p>
      <h2 className="pt-4 text-2xl text-ivory">Accuracy</h2>
      <p>
        We work hard to publish correct results, but errors can happen. The official result always wins. We may correct a result, adjust
        points and cancel tickets if a mistake is found, and we may close accounts that abuse the site.
      </p>
      <h2 className="pt-4 text-2xl text-ivory">Independence</h2>
      <p>This site is independent and is not affiliated with or endorsed by the lottery operator.</p>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-bright hover:underline">{CONTACT_EMAIL}</a>
      </p>
    </div>
  );
}
