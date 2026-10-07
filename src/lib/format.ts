import type { Currency } from './types';

export const HKD: Currency = { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 1 };

/** Prizes are stored in HKD; other currencies are indicative conversions. */
export function money(hkd: number, cur: Currency = HKD): string {
  const amount = Math.round(hkd * cur.rate);
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur.code} ${amount.toLocaleString('en')}`;
  }
}

export function dateLabel(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

/** Mark Six draws are held in the evening, Hong Kong time (UTC+8). */
export const DRAW_TIME = '21:30:00+08:00';
export const drawMoment = (iso: string) => `${iso}T${DRAW_TIME}`;
