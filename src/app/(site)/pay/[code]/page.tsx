import type { Metadata } from 'next';
import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import type { RowDataPacket } from 'mysql2/promise';
import { PayForm } from '@/components/transfer-forms';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getPoints } from '@/lib/points';
import { getSettings } from '@/lib/settings';
import { ensurePayCode, findRecipient } from '@/lib/transfer';
import { parsePayCode } from '@/lib/transfer-rules';

export const metadata: Metadata = { title: 'Send points', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const shell = 'mx-auto max-w-md px-4 py-12 sm:px-6';
const note = (t: string) => <p role="alert" className="mt-6 rounded-xl border border-miss/40 bg-miss/10 px-4 py-3 text-miss">{t}</p>;

export default async function PayPage({ params }: { params: Promise<{ code: string }> }) {
  const raw = (await params).code;
  const code = parsePayCode(raw);
  // Scanning the QR while logged out sends you to log in, then straight back here.
  const user = await requireUser(`/pay/${code ?? 'invalid'}`);
  const back = <p className="mt-8 text-sm text-mute"><Link href="/account/transfer" className="text-gold-bright underline underline-offset-4">Back to send and receive</Link></p>;

  if (!code) return <div className={shell}><h1 className="text-3xl">Send points</h1>{note('This pay link is not valid.')}{back}</div>;
  if (code === (await ensurePayCode(user.id))) return <div className={shell}><h1 className="text-3xl">Send points</h1>{note('This is your own QR code. Show it to another member so they can send you points.')}{back}</div>;
  const to = await findRecipient(code);
  if (!to) return <div className={shell}><h1 className="text-3xl">Send points</h1>{note('This pay code does not exist, was replaced, or cannot receive points. Ask the person for their current QR code.')}{back}</div>;

  const [s, points, [me]] = await Promise.all([getSettings(), getPoints(user.id), query<RowDataPacket & { totp_on: number }>('SELECT totp_on FROM users WHERE id=?', [user.id])]);
  return (
    <div className={shell}>
      <h1 className="text-3xl sm:text-4xl">Send points</h1>
      <div className="surface mt-6 p-5">
        <p className="text-sm text-mute">You are sending to</p>
        <p className="mt-1 font-serif text-3xl text-gold-bright">{to.name}</p>
        <p className="mt-3 text-sm text-mute">Your balance: <span className="font-mono text-ivory">{points.toLocaleString('en-US')}</span> points. Up to {s.transferMax.toLocaleString('en-US')} per transfer.</p>
      </div>
      {s.transferEnabled ? (
        <div className="surface mt-4 p-5">
          <PayForm code={code} idem={randomUUID()} needsOtp={Boolean(Number(me?.totp_on))} max={s.transferMax} />
        </div>
      ) : (
        note('Sending points is switched off for now.')
      )}
      <p className="mt-4 text-xs text-mute">Check the name with the person first. A transfer cannot be undone by you. Points are free play credits with no cash value: never send them in exchange for money or goods.</p>
      {back}
    </div>
  );
}
