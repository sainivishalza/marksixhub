'use server';

import { redirect } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { mailConfigured, sendMail } from '@/lib/mail';
import { isLimited, rateLimit } from '@/lib/rate-limit';
import { BASE_URL } from '@/lib/seo';
import { getSettings } from '@/lib/settings';
import { verifyPassword } from '@/lib/password';
import { verifyTotp } from '@/lib/totp';
import { ensurePayCode, replacePayCode, transferPoints } from '@/lib/transfer';
import { parsePayCode } from '@/lib/transfer-rules';

export type TransferState = { error?: string; amount?: string };

const text = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '');
const wait = (sec: number) => `Too many attempts. Try again in ${Math.ceil(sec / 60)} minute${sec > 60 ? 's' : ''}.`;

/** Step 1: the sender pastes a code or link (or arrives from a scanned QR, which skips this). */
export async function findPayAction(_prev: TransferState, fd: FormData): Promise<TransferState> {
  const user = await requireUser('/account/transfer');
  const code = parsePayCode(text(fd, 'code'));
  if (!code) return { error: 'That is not a pay code. A code is 10 letters and numbers, or a link ending /pay/CODE.' };
  if (code === (await ensurePayCode(user.id))) return { error: 'That is your own code. Ask the other person for theirs.' };
  redirect(`/pay/${code}`);
}

/** Step 2: confirm the amount with your password (and your authenticator code if you use two-step login). */
export async function sendPointsAction(_prev: TransferState, fd: FormData): Promise<TransferState> {
  const user = await requireUser(`/pay/${parsePayCode(text(fd, 'code')) ?? ''}`);
  const code = parsePayCode(text(fd, 'code'));
  const keep = text(fd, 'amount').slice(0, 9); // the form is cleared after every submit, so the amount is handed back
  const err = (error: string): TransferState => ({ error, amount: keep });
  if (!code) return err('That pay code is not valid.');
  const limit = rateLimit(`xfer:${user.id}`, 10, 10 * 60_000);
  if (!limit.ok) return err(wait(limit.retryAfterSec));
  const amount = /^\d{1,9}$/.test(text(fd, 'amount').trim()) ? Number(text(fd, 'amount').trim()) : Number.NaN;
  const idem = text(fd, 'idem');
  if (!/^[0-9a-f-]{36}$/.test(idem)) return err('This page has expired. Open the pay link again.');

  const [me] = await query<RowDataPacket & { pass_hash: string; totp_on: number; totp_secret: string | null }>('SELECT pass_hash, totp_on, totp_secret FROM users WHERE id=?', [user.id]);
  // Only wrong passwords and wrong codes count here, so a member making several real transfers is never locked out.
  const locked = isLimited(`xferpw:${user.id}`, 5, 15 * 60_000);
  if (locked.limited) return err(wait(locked.retryAfterSec));
  const fail = (error: string): TransferState => {
    rateLimit(`xferpw:${user.id}`, 5, 15 * 60_000);
    return err(error);
  };
  if (!me || !(await verifyPassword(text(fd, 'password').slice(0, 200), me.pass_hash))) return fail('Your password is not right.');
  if (me.totp_on && me.totp_secret && !verifyTotp(me.totp_secret, text(fd, 'otp'))) return fail('Enter the current code from your authenticator app.');

  await ensurePayCode(user.id); // so the receiver sees a stable name for you
  const s = await getSettings();
  const r = await transferPoints({ fromId: user.id, toCode: code, amount, idem, limits: { enabled: s.transferEnabled, max: s.transferMax, daily: s.transferDaily, minAgeDays: s.transferMinAgeDays } });
  if (!r.ok) return err(r.error);

  if (!r.duplicate && r.toEmail && mailConfigured) {
    void sendMail(r.toEmail, `You received ${r.amount.toLocaleString('en-US')} points`, `${r.fromName} sent you ${r.amount.toLocaleString('en-US')} free play points.\n\nSee your balance and history:\n${BASE_URL}/account/points\n\nPoints are free play credits with no cash value. If you did not expect this, contact us.`).catch((err) => console.error('transfer email failed:', err));
  }
  redirect(`/account/transfer?sent=${r.amount}&to=${encodeURIComponent(r.toName)}`);
}

export async function replacePayCodeAction() {
  const user = await requireUser('/account/transfer');
  const limit = rateLimit(`paycode:${user.id}`, 5, 60 * 60_000);
  if (limit.ok) await replacePayCode(user.id);
  redirect(`/account/transfer?${limit.ok ? 'renewed=1' : 'wait=1'}`);
}
