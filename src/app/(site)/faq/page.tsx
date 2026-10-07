import { FaqList } from '@/components/faq-list';
import { JsonLd } from '@/components/json-ld';
import { getFaqs } from '@/lib/data';
import { breadcrumbLd } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-db';

export const generateMetadata = () => seoMetadata('/faq');

export default async function FaqPage() {
  const items = await getFaqs();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl sm:text-5xl">Mark Six questions</h1>
      <FaqList items={items} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }])} />
    </div>
  );
}
