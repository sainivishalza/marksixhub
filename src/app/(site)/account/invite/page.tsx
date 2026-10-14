import type { Metadata } from 'next';
import { ShareLink } from '@/components/share-link';
import { requireUser } from '@/lib/auth';
import { ensureInviteCode, inviteStats } from '@/lib/referral';
import { BASE_URL } from '@/lib/seo';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Invite a friend', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function InvitePage() {
  const user = await requireUser('/account/invite');
  const [s, code] = await Promise.all([getSettings(), ensureInviteCode(user.id)]);
  const stats = await inviteStats(user.id);
  const link = `${BASE_URL}/register?ref=${code}`;
  const off = s.inviteReward <= 0 && s.inviteWelcome <= 0;
  const tile = 'surface p-5';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Invite a friend</h1>
        <p className="mt-1 max-w-[60ch] text-mute">
          {off
            ? 'Invite rewards are switched off for now, but you can still share the site.'
            : `Share your link. When your friend signs up and gets their first order approved, you get ${s.inviteReward.toLocaleString('en-US')} points and they get ${s.inviteWelcome.toLocaleString('en-US')} points. You can be rewarded for up to ${s.inviteCap} friends.`}
        </p>
      </div>

      <section className="surface p-5 sm:p-6" aria-labelledby="link">
        <h2 id="link" className="font-serif text-xl">Your invite link</h2>
        <p className="mt-3 break-all rounded-xl border border-line bg-night px-4 py-3 font-mono text-sm text-ivory">{link}</p>
        <div className="mt-4"><ShareLink url={link} title="Mark Six Hub" text="Free Mark Six number picker and points game. Join with my link:" /></div>
        <p className="mt-4 max-w-[60ch] text-xs text-mute">Only invite people you know. Points are free play credits with no cash value, so never offer or take money for an invite. Accounts that look made up to collect rewards are not paid and may be closed.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={tile}><p className="text-sm text-mute">Friends who joined</p><p className="mt-1 font-mono text-3xl tabular-nums">{stats.joined}</p></div>
        <div className={tile}><p className="text-sm text-mute">Rewards paid</p><p className="mt-1 font-mono text-3xl tabular-nums text-win">{stats.rewarded}</p></div>
        <div className={tile}><p className="text-sm text-mute">Points earned</p><p className="mt-1 font-mono text-3xl tabular-nums text-gold-bright">{stats.points.toLocaleString('en-US')}</p></div>
      </div>
    </div>
  );
}
