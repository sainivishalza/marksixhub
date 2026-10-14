import { BASE_URL, CONTACT_EMAIL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// RFC 9116: where to report a security problem. Expires must be in the future, so it is always one year ahead.
export function GET() {
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString();
  return new Response(`Contact: mailto:${CONTACT_EMAIL}\nExpires: ${expires}\nPreferred-Languages: en\nCanonical: ${BASE_URL}/.well-known/security.txt\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
