import { isBall } from './mark6.ts';

export type DrawInput = {
  drawNo: string;
  drawDate: string;
  status: 'upcoming' | 'published';
  numbers: number[];
  extra: number | null;
  estJackpotHkd: number;
  snowballHkd: number | null;
  turnoverHkd: number | null;
  fundHkd: number | null;
  stopSelling: string | null;
  note: string;
  prizes: { division: number; winners: number; prizeHkd: number }[];
};

type Raw = Record<string, FormDataEntryValue | string | undefined | null>;

const str = (v: Raw[string]) => (typeof v === 'string' ? v.trim() : '');
const whole = (v: Raw[string]) => Math.max(0, Math.min(9_000_000_000_000, Math.round(Number(str(v).replace(/[,$\s]/g, ''))) || 0));

/** Blank stays blank (null); otherwise a whole number, tolerating "$", spaces and commas. */
const optWhole = (v: Raw[string]): number | null => {
  const t = str(v).replace(/[,$\s]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.max(0, Math.min(9_000_000_000_000, Math.round(n))) : null;
};

export const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/**
 * Reads a draw from form fields: draw_no, draw_date, status, stop_selling, turnover_hkd, snowball_hkd, est_jackpot_hkd,
 * fund_hkd, note, n1..n6, extra, w1..w7, p1..p7. Only the draw number and date are required; winning numbers are only
 * required once the draw is published, so an upcoming draw can be announced before it takes place.
 */
export function readDraw(raw: Raw): { value: DrawInput; errors: string[] } {
  const errors: string[] = [];
  const drawNo = str(raw.draw_no);
  const drawDate = str(raw.draw_date);
  const status = str(raw.status) === 'published' ? 'published' : 'upcoming';

  if (!/^\d{2}\/\d{3}$/.test(drawNo)) errors.push('Draw number must look like 26/081.');
  if (!isDate(drawDate)) errors.push('Enter a valid draw date.');

  const stopSelling = str(raw.stop_selling ?? raw.stop_selling_time).slice(0, 5);
  if (stopSelling && !isTime(stopSelling)) errors.push('Stop selling time must look like 21:15.');

  const six = [1, 2, 3, 4, 5, 6].map((i) => parseInt(str(raw[`n${i}`]), 10));
  const extraN = parseInt(str(raw.extra), 10);
  if (status === 'published') {
    if (!six.some(isBall) && !isBall(extraN)) errors.push('To publish a result, enter the 6 winning numbers and the extra number. Or keep this draw as Upcoming and add them after the draw.');
    else if (!six.every(isBall) || new Set(six).size !== 6) errors.push('Enter 6 different winning numbers between 1 and 49.');
    else if (!isBall(extraN) || six.includes(extraN)) errors.push('The extra number must be between 1 and 49 and different from the six.');
  }

  const prizes = [1, 2, 3, 4, 5, 6, 7].map((division) => ({
    division,
    winners: whole(raw[`w${division}`]),
    prizeHkd: whole(raw[`p${division}`]),
  }));

  return {
    errors,
    value: {
      drawNo,
      drawDate,
      status,
      numbers: six.filter(isBall),
      extra: isBall(extraN) ? extraN : null,
      estJackpotHkd: whole(raw.est_jackpot_hkd),
      snowballHkd: optWhole(raw.snowball_hkd),
      turnoverHkd: optWhole(raw.turnover_hkd),
      fundHkd: optWhole(raw.fund_hkd),
      stopSelling: isTime(stopSelling) ? stopSelling : null,
      note: str(raw.note).slice(0, 255),
      prizes,
    },
  };
}

export const CURRENCY_CODE = /^[A-Z]{3}$/;

export function readCurrency(raw: Raw): { value: { code: string; name: string; symbol: string; rate: number; active: boolean }; error?: string } {
  const code = str(raw.code).toUpperCase();
  const name = str(raw.name).slice(0, 40);
  const symbol = str(raw.symbol).slice(0, 6);
  const rate = code === 'HKD' ? 1 : Number(str(raw.rate));
  const value = { code, name, symbol, rate, active: code === 'HKD' || Boolean(raw.active) };
  if (!CURRENCY_CODE.test(code) || !name || !(rate > 0) || rate > 1e9) return { value, error: 'Enter a 3-letter code, a name and a rate above 0.' };
  return { value };
}

export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/;
export const passwordProblem = (p: string) => (p.length < 10 ? 'Use at least 10 characters.' : p.length > 200 ? 'Use at most 200 characters.' : null);

/** Only same-site paths are allowed as redirect targets. */
export const safeNext = (n: unknown, fallback = '/') => (typeof n === 'string' && /^\/(?![/\\])/.test(n) ? n : fallback);
