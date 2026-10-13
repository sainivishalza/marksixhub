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

/** Winning units come in tenths (2.5, 4,085.2, 283.0); zero means nobody won that prize. */
export const unitsLabel = (n: number) => (n > 0 ? n.toLocaleString('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-');

/** "21:15" becomes "9:15 PM". */
export function timeLabel(hhmm: string | null): string {
  const m = /^(\d{2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Thursday, 8 October 2026" */
export const dateLong = (iso: string) => dateLabel(iso, { weekday: 'long', month: 'long' });
