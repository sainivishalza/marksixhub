import { ContactForm } from '@/components/contact-form';
import { JsonLd } from '@/components/json-ld';
import { CONTACT_EMAIL, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact Us',
  description: 'Questions about Mark Six Hub, your account or a result? Send us a message and we will reply by email.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Contact us</h1>
      <p className="mb-8 mt-3 text-mute">
        Ask a question or report a mistake in a result. You can also email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-bright underline underline-offset-4">{CONTACT_EMAIL}</a>.
      </p>
      <div className="surface p-6">
        <ContactForm />
      </div>
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])} />
    </div>
  );
}
