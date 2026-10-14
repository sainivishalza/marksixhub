import { randomInt } from 'node:crypto';

// Pay codes are what the QR code carries. Random, not the user id or email, and without look-alike characters (0/O, 1/I).
export const PAY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PAY_CODE_LENGTH = 10;

export const newPayCode = () => Array.from({ length: PAY_CODE_LENGTH }, () => PAY_ALPHABET[randomInt(PAY_ALPHABET.length)]).join('');

/** Accepts a bare code or a pasted pay link such as https://marksixhub.com/pay/ABCDE23456. Returns the upper-case code, or null. */
export function parsePayCode(input: string): string | null {
  const t = input.trim().slice(0, 200);
  const m = t.match(/^([A-Za-z0-9]{10})$/) ?? t.match(/\/pay\/([A-Za-z0-9]{10})\/?(?:[?#].*)?$/);
  const code = m?.[1]?.toUpperCase();
  return code && [...code].every((c) => PAY_ALPHABET.includes(c)) ? code : null;
}

/** What the sender sees: the recipient's leaderboard nickname if they have one, otherwise the last 4 characters of their code. Never an email. */
export const displayName = (nickname: string | null | undefined, code: string) => nickname || `Member ${code.slice(-4)}`;

export type TransferInput = {
  enabled: boolean;
  senderId: number;
  recipientId: number | null;
  amount: number;
  max: number;
  daily: number;
  sentToday: number;
  balance: number;
  senderVerified: boolean;
  senderAgeDays: number;
  minAgeDays: number;
  recipientVerified: boolean;
  recipientBlocked: boolean;
};

/** The rules, in the order a person would hit them. Returns a sentence for the sender, or null when the transfer is allowed. */
export function checkTransfer(i: TransferInput): string | null {
  if (!i.enabled) return 'Sending points is switched off for now.';
  if (!i.recipientId || i.recipientBlocked || !i.recipientVerified) return 'That pay code cannot receive points. Check the code with the person.';
  if (i.recipientId === i.senderId) return 'You cannot send points to yourself.';
  if (!Number.isInteger(i.amount) || i.amount < 1) return 'Enter a whole number of points, at least 1.';
  if (i.amount > i.max) return `You can send at most ${i.max.toLocaleString('en-US')} points at a time.`;
  if (!i.senderVerified) return 'Confirm your email address first, then you can send points.';
  if (i.senderAgeDays < i.minAgeDays) return `Accounts can send points after ${i.minAgeDays} day${i.minAgeDays === 1 ? '' : 's'}. Yours is too new.`;
  if (i.amount > i.balance) return 'You do not have enough points.';
  if (i.sentToday + i.amount > i.daily) {
    const left = Math.max(0, i.daily - i.sentToday);
    return `Daily sending limit reached. You can send ${left.toLocaleString('en-US')} more points in the next 24 hours.`;
  }
  return null;
}
