import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { PREVIEW_COOKIE } from '@/lib/history';
import { can } from '@/lib/perms';
import { BASE_URL } from '@/lib/seo';
import { safeNext } from '@/lib/validate';

export const dynamic = 'force-dynamic';

/**
 * Staff switch: `/preview?on=1` shows the public site the way a customer sees it (older results locked, points rules apply);
 * `/preview?on=0` goes back to the full staff view. It only changes the staff member's own browser cookie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL(safeNext(url.searchParams.get('next'), '/results'), BASE_URL));
  const user = await getUser();
  if (user && can(user.role, 'view')) {
    if (url.searchParams.get('on') === '1') {
      res.cookies.set(PREVIEW_COOKIE, '1', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 3600 });
    } else {
      res.cookies.delete(PREVIEW_COOKIE);
    }
  }
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
