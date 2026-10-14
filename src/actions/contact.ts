'use server';

import { clientIp } from '@/lib/auth';
import { mailConfigured, sendMail } from '@/lib/mail';
import { rateLimit } from '@/lib/rate-limit';
import { CONTACT_EMAIL } from '@/lib/seo';
import { EMAIL } from '@/lib/validate';

export type ContactState = { error?: string; ok?: string; name?: string; email?: string; message?: string };

const field = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string).trim() : '');
const oneLine = (v: string) => v.replace(/[\r\n]+/g, ' ');

/** Emails the site owner. Keeps what was typed when something is wrong, and never says "sent" unless the mail server accepted it. */
export async function contactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const name = oneLine(field(fd, 'name')).slice(0, 80);
  const email = field(fd, 'email').toLowerCase().slice(0, 190);
  const message = field(fd, 'message').slice(0, 3000);
  const kept = { name, email, message };
  if (field(fd, 'website')) return { ok: 'Thanks, your message has been sent. We will reply by email.' }; // hidden field: only bots fill it
  if (!name) return { ...kept, error: 'Please enter your name.' };
  if (!EMAIL.test(email)) return { ...kept, error: 'Please enter a valid email address.' };
  if (message.length < 10) return { ...kept, error: 'Please write a few words so we know how to help (at least 10 characters).' };
  const limit = rateLimit(`contact:${await clientIp()}`, 3, 60 * 60_000);
  if (!limit.ok) return { ...kept, error: `Too many messages. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minutes, or email ${CONTACT_EMAIL}.` };
  const sent = mailConfigured && (await sendMail(CONTACT_EMAIL, `Website message from ${name}`, `From: ${name} <${email}>\n\n${message}`, email));
  if (!sent) return { ...kept, error: `We could not send your message just now. Please email ${CONTACT_EMAIL} instead.` };
  return { ok: 'Thanks, your message has been sent. We will reply by email.' };
}
