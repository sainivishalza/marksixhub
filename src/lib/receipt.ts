// Pure helpers for the order receipt (kept free of server-only imports so they can be unit tested).

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-10-07 09:55:26" (UTC, as stored) as Hong Kong time: "07OCT26 17:55". */
export function receiptDate(createdAtUtc: string): string {
  const d = new Date(`${createdAtUtc.slice(0, 19).replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return '';
  const hk = new Date(d.getTime() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(hk.getUTCDate())}${MONTHS[hk.getUTCMonth()]}${p(hk.getUTCFullYear() % 100)} ${p(hk.getUTCHours())}:${p(hk.getUTCMinutes())}`;
}

/** "7+9+13+25+32+45" */
export const receiptLine = (nums: number[]) => nums.join('+');

/** 20 hex characters as "6A002 5FC47 89020 861C0". */
export const groupRef = (hex: string) => (hex.toUpperCase().slice(0, 20).match(/.{1,5}/g) ?? []).join(' ');

export const STATUS_LABEL: Record<string, string> = {
  pending: 'PENDING APPROVAL',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED, POINTS RETURNED',
  refunded: 'REFUNDED, POINTS RETURNED',
};
