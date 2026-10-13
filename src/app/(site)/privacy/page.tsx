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
      <p>We keep as little as we can. If you only browse, we store nothing about you except a currency choice cookie.</p>
      <h2 className="pt-4 text-2xl text-ivory">If you create an account</h2>
      <p>
        We store your email, a scrypt hash of your password (never the password), your points balance and history, your tickets, and the
        IP address used at sign-up and log-in, which we use only to limit abuse. Points are free play credits with no cash value.
      </p>
      <h2 className="pt-4 text-2xl text-ivory">Cookies</h2>
      <p>One signed cookie keeps you logged in and one remembers your currency. We use no advertising or tracking cookies.</p>
      <h2 className="pt-4 text-2xl text-ivory">Email</h2>
      <p>We email you only for things you ask for: verification, password reset and updates on your tickets.</p>
      <h2 className="pt-4 text-2xl text-ivory">Your choices</h2>
      <p>
        To see or delete your data, write to <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-bright hover:underline">{CONTACT_EMAIL}</a> from
        your account email.
      </p>
    </div>
  );
}
