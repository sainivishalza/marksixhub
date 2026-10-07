import { FaqList } from '@/components/faq-list';
import { JsonLd } from '@/components/json-ld';
import { FAQS } from '@/lib/faq';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Mark Six FAQ: Your Questions Answered',
  description: 'Answers about Mark Six: how it works, the prize divisions, whether this site is official and how the number picker and currency conversion work.',
  path: '/faq',
});

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl sm:text-5xl">Mark Six questions</h1>
      <FaqList items={FAQS} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }])} />
    </div>
  );
}
