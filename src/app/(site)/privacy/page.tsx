import { CONTACT_EMAIL, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'What Mark Six Hub stores about you, why, and how to ask for it to be removed.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed text-mute sm:px-6">
      <h1 className="text-4xl text-ivory sm:text-5xl">Privacy policy</h1>
      <p>We keep as little as we can. If you only browse, we store nothing about you except a currency choice cookie. The site is for people aged 18 and over.</p>
      <h2 className="pt-4 text-2xl text-ivory">If you create an account</h2>
      <p>
        We store your email, a scrypt hash of your password (never the password), your points balance and history, your tickets, and the
        IP address used at sign-up and log-in, which we use only to limit abuse. Points are free play credits with no cash value.
      </p>
      <h2 className="pt-4 text-2xl text-ivory">Cookies</h2>
      <p>One signed cookie keeps you logged in and one remembers your currency. We use no advertising cookies.</p>
      <h2 className="pt-4 text-2xl text-ivory">Visitor statistics</h2>
      <p>
        If you accept the cookie notice, we use Google Analytics to count visits and see which pages are read. It is not used to show you adverts and visitor IP addresses are shortened. If you decline, it never loads. We may
        also use Plausible, which sets no cookies.
      </p>
      <h2 className="pt-4 text-2xl text-ivory">Who handles the data</h2>
      <p>The site and its database are hosted by Hostinger. Email is sent through our own mailbox. We do not sell personal data or share it for advertising.</p>
      <h2 className="pt-4 text-2xl text-ivory">How long we keep it</h2>
      <p>Account details stay until you delete your account. Login attempt records are removed after 30 days.</p>
      <h2 className="pt-4 text-2xl text-ivory">Email</h2>
      <p>We email you only for things you ask for: verification, password reset, updates on your tickets and, only if you turn it on under Account → Settings, one reminder before each draw closes. Every reminder has a link to stop it.</p>
      <h2 className="pt-4 text-2xl text-ivory">Your choices</h2>
      <p>You can delete your account yourself under Account → Settings → Delete my account. This removes your email, password, nickname and favourites. Past orders stay, with no name attached, so draw totals still add up.</p>
      <p>
        To see a copy of your data or ask us anything else about it, write to <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-bright hover:underline">{CONTACT_EMAIL}</a> from
        your account email.
      </p>
    </div>
  );
}
