import { randomInt } from 'node:crypto';

// Invite codes: 8 characters, no look-alikes (0/O, 1/I), safe to read out or type.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

export const newInviteCode = () => Array.from({ length: INVITE_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** The code from a ?ref= value, upper-cased, or null when it is not a code. */
export function parseInviteCode(input: string): string | null {
  const c = input.trim().toUpperCase();
  return c.length === INVITE_CODE_LENGTH && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null;
}

export type ReferralCheck = { inviterId: number | null; inviterBlocked: boolean; inviterIp: string | null; inviteeIp: string | null; paidSoFar: number; cap: number; reward: number; welcome: number };

/** Should this invite be paid? A sentence when not (for logs and tests), null when yes. */
export function referralProblem(c: ReferralCheck): string | null {
  if (!c.inviterId) return 'no inviter';
  if (c.inviterBlocked) return 'inviter is suspended';
  if (c.reward <= 0 && c.welcome <= 0) return 'rewards are off';
  if (c.paidSoFar >= c.cap) return 'inviter reached the limit';
  if (c.inviterIp && c.inviteeIp && c.inviterIp === c.inviteeIp) return 'same network as the inviter';
  return null;
}
