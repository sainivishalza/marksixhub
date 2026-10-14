import type { Metadata } from 'next';
import QRCode from 'qrcode';
import type { RowDataPacket } from 'mysql2/promise';
import { replacePayCodeAction } from '@/actions/transfer';
import { FindPayForm } from '@/components/transfer-forms';
import { Button } from '@/components/ui/button';
import { shortWhen } from '@/lib/account-data';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getPoints } from '@/lib/points';
import { BASE_URL } from '@/lib/seo';
import { getSettings } from '@/lib/settings';
import { ensurePayCode } from '@/lib/transfer';
import { displayName } from '@/lib/transfer-rules';

export const metadata: Metadata = { title: 'Send and receive points', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Row = RowDataPacket & { id: number; from_user: number; amount: number; created_at: string; nickname: string | null; pay_code: string | null };
const card = 'surface p-5 sm:p-6';

export default async function TransferPage({ searchParams }: { searchParams: Promise<{ sent?: string; to?: string; renewed?: string; wait?: string }> }) {
  const user = await requireUser('/account/transfer');
  const { sent, to, renewed, wait } = await searchParams;
  const [settings, points, code] = await Promise.all([getSettings(), getPoints(user.id), ensurePayCode(user.id)]);
  const link = `${BASE_URL}/pay/${code}`;
  const svg = await QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0a0e1a', light: '#ffffff' } });
  const rows = await query<Row>(
    `SELECT t.id, t.from_user, t.amount, t.created_at, u.nickname, u.pay_code
       FROM transfers t JOIN users u ON u.id = IF(t.from_user = ?, t.to_user, t.from_user)
      WHERE t.from_user = ? OR t.to_user = ? ORDER BY t.id DESC LIMIT 20`,
    [user.id, user.id, user.id],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Send and receive points</h1>
        <p className="mt-1 max-w-[60ch] text-mute">Move free play points to another member. Points have no cash value, so never send them in exchange for money or goods.</p>
      </div>

      {sent && /^\d{1,9}$/.test(sent) ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-4 py-3 text-sm text-win">Sent {Number(sent).toLocaleString('en-US')} points to {(to ?? 'the member').slice(0, 30)}. Your balance is {points.toLocaleString('en-US')}.</p>
      ) : null}
      {renewed ? <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-4 py-3 text-sm text-win">You have a new code. The old QR code no longer works.</p> : null}
      {wait ? <p role="alert" className="rounded-xl border border-miss/40 bg-miss/10 px-4 py-3 text-sm text-miss">Too many changes. Try again in an hour.</p> : null}
      {!settings.transferEnabled ? <p role="alert" className="rounded-xl border border-miss/40 bg-miss/10 px-4 py-3 text-sm text-miss">Sending points is switched off for now. You can still receive a transfer link, but nobody can send.</p> : null}

      <section className={card} aria-labelledby="receive">
        <h2 id="receive" className="font-serif text-xl">Receive: your QR code</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-mute">Show this to another member. They scan it with their phone camera, log in, and choose how many points to send. Anyone who has it can send you points, but nobody can take points from you with it.</p>
        <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div role="img" aria-label={`QR code for your pay link ${link}`} className="w-48 shrink-0 rounded-2xl bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="min-w-0 space-y-2 text-sm">
            <p className="text-mute">Your pay code</p>
            <p className="font-mono text-2xl tracking-widest text-gold-bright">{code}</p>
            <p className="break-all text-mute">{link}</p>
            <form action={replacePayCodeAction} className="pt-2">
              <Button type="submit" variant="outline">Make a new code</Button>
              <p className="mt-2 max-w-[40ch] text-xs text-mute">Use this if you shared the code by mistake. The old QR stops working at once.</p>
            </form>
          </div>
        </div>
      </section>

      <section className={card} aria-labelledby="send">
        <h2 id="send" className="font-serif text-xl">Send: scan, or enter a code</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-mute">Scanning their QR code with your phone camera opens the right page. Or paste their code or link here. You can send up to {settings.transferMax.toLocaleString('en-US')} points at a time and {settings.transferDaily.toLocaleString('en-US')} in 24 hours. Your balance is {points.toLocaleString('en-US')}.</p>
        <div className="mt-4"><FindPayForm /></div>
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-3 font-serif text-2xl">Recent transfers</h2>
        {rows.length === 0 ? (
          <p className="text-mute">No transfers yet.</p>
        ) : (
          <ul className="surface divide-y divide-line/40 text-sm">
            {rows.map((r) => {
              const out = Number(r.from_user) === user.id;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-ivory">{out ? 'Sent to' : 'Received from'} {displayName(r.nickname, r.pay_code ?? 'XXXXXXXXXX')}</span>
                    <span className="block text-xs text-mute">{shortWhen(String(r.created_at))}</span>
                  </span>
                  <span className={`font-mono text-base tabular-nums ${out ? 'text-ivory' : 'text-win'}`}>{out ? '-' : '+'}{Number(r.amount).toLocaleString('en-US')}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
