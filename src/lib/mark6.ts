export type BallTone = 'red' | 'blue' | 'green';

const RED = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46]);
const BLUE = new Set([3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48]);

export const ALL_BALLS = Array.from({ length: 49 }, (_, i) => i + 1);

export const ballTone = (n: number): BallTone => (RED.has(n) ? 'red' : BLUE.has(n) ? 'blue' : 'green');

export const isBall = (n: number) => Number.isInteger(n) && n >= 1 && n <= 49;

/** Unique valid balls found in free text such as "3, 12 25-31". */
export function parseNumbers(text: string): number[] {
  const out: number[] = [];
  for (const part of text.split(/[^0-9]+/)) {
    const n = parseInt(part, 10);
    if (isBall(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Cryptographically random whole number in [0, max). */
function randomBelow(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}

/** Fills `keep` up to 6 numbers with random unused balls. */
export function quickPick(keep: number[] = []): number[] {
  const chosen = keep.slice(0, 6);
  const pool = ALL_BALLS.filter((n) => !chosen.includes(n));
  while (chosen.length < 6) chosen.push(pool.splice(randomBelow(pool.length), 1)[0]);
  return chosen;
}

export const sortAsc = (nums: number[]) => [...nums].sort((a, b) => a - b);

export type Evaluation = { matches: number; extraHit: boolean; division: number | null };

/** Prize division for a 6-number ticket against a draw (1 = best, null = no prize). */
export function evaluate(ticket: number[], winning: number[], extra: number | null): Evaluation {
  const matches = ticket.filter((n) => winning.includes(n)).length;
  const extraHit = extra !== null && ticket.includes(extra);
  let division: number | null = null;
  if (matches === 6) division = 1;
  else if (matches === 5 && extraHit) division = 2;
  else if (matches === 5) division = 3;
  else if (matches === 4 && extraHit) division = 4;
  else if (matches === 4) division = 5;
  else if (matches === 3 && extraHit) division = 6;
  else if (matches === 3) division = 7;
  return { matches, extraHit, division };
}

export const DIVISION_LABEL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

export const DIVISION_RULE = [
  'All 6 winning numbers',
  '5 winning numbers + the extra number',
  '5 winning numbers',
  '4 winning numbers + the extra number',
  '4 winning numbers',
  '3 winning numbers + the extra number',
  '3 winning numbers',
];

/** All k-sized combinations of `nums` (ascending). */
export function combinations(nums: number[], k = 6): number[][] {
  const out: number[][] = [];
  const walk = (start: number, cur: number[]) => {
    if (cur.length === k) return void out.push([...cur]);
    for (let i = start; i < nums.length; i++) walk(i + 1, [...cur, nums[i]]);
  };
  walk(0, []);
  return out;
}

/**
 * Splits pasted text into number strings for the six-circle input: "3 12 25", "3,12,25" and "031225" all work.
 * A single long run of digits is split into pairs; an odd-length run is ambiguous, so it gives nothing.
 */
export function splitPasted(text: string): string[] {
  const tokens = text.match(/\d+/g) ?? [];
  if (tokens.length === 1 && tokens[0].length > 2) {
    const run = tokens[0];
    return run.length % 2 === 0 ? (run.match(/\d\d/g) ?? []) : [];
  }
  return tokens.map((t) => t.slice(0, 2));
}

/**
 * Splits a run of digits that arrived all at once (dictation, autofill) into numbers, reading left to right:
 * 1 to 4 start a two-digit number, 5 to 9 stand alone. "1225314049" gives 12, 25, 31, 40, 49.
 */
export function splitRun(digits: string): string[] {
  const out: string[] = [];
  for (let k = 0; k < digits.length; ) {
    const take = Number(digits[k]) >= 5 || k + 1 >= digits.length ? 1 : 2;
    out.push(digits.slice(k, k + take));
    k += take;
  }
  return out;
}

/** The valid, different numbers typed so far in the circles, in order. */
export function boxNumbers(cells: string[]): number[] {
  const out: number[] = [];
  for (const c of cells) {
    const n = parseInt(c, 10);
    if (isBall(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

export type PastedResult = { drawNo?: string; date?: string; numbers: number[]; extra?: number; turnover?: string; prizes: { division: number; winners: string; prize: string }[] };

/**
 * Reads text copied from a results page (or text taken out of its printed PDF): draw number, date, the first run of
 * seven numbers (six plus extra), turnover, and for each of the seven prizes its amount and winning units.
 * Works for "1st Prize 2.0 $14,072,930" and for the results page layout "1st $14,072,930" with the units in a
 * separate column. Anything it cannot find is left out; the admin checks the filled form before saving.
 */
export function parseResultText(text: string): PastedResult {
  const out: PastedResult = { numbers: [], prizes: [] };
  const no = /\b(\d{2})\s*\/\s*(\d{3})\b/.exec(text);
  if (no) out.drawNo = `${no[1]}/${no[2]}`;
  const date = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(text);
  if (date) out.date = `${date[3]}-${date[2]}-${date[1]}`;
  const tokens = text.split(/[\s,+]+/).filter((t) => t && !/^(extra|numbers?)$/i.test(t));
  for (let i = 0; i + 7 <= tokens.length && !out.numbers.length; i++) {
    const run = tokens.slice(i, i + 7);
    if (run.every((t) => /^\d{1,2}$/.test(t) && isBall(Number(t))) && new Set(run).size === 7) {
      out.numbers = run.slice(0, 6).map(Number);
      out.extra = Number(run[6]);
    }
  }
  const turnover = /turn\s*over[^\d]*([\d,]+)/i.exec(text);
  if (turnover) out.turnover = turnover[1].replace(/,/g, '');

  // Each "1st" to "7th" owns the text up to the next one: the first $ figure is its prize, the first plain figure its winning units.
  const marks = [...text.matchAll(/\b([1-7])(?:st|nd|rd|th)\b(?:\s+prize)?/gi)];
  const found = new Map<number, { winners?: string; prize?: string }>();
  marks.forEach((m, i) => {
    const division = Number(m[1]);
    if (found.has(division)) return;
    // A "Winning Unit" label starts a separate units column: those figures belong to the column, not to this prize.
    const seg = text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length).split(/winning\s*unit/i)[0];
    const figs = [...seg.matchAll(/(\$\s*)?(\d[\d,]*(?:\.\d+)?)/g)].map((f) => ({ dollar: Boolean(f[1]), v: f[2].replace(/,/g, '') }));
    const dollar = figs.find((f) => f.dollar);
    const plain = figs.filter((f) => !f.dollar);
    const prize = dollar?.v ?? plain[1]?.v;
    if (prize !== undefined) found.set(division, { prize: prize.split('.')[0], winners: plain[0]?.v });
  });
  // Units listed in their own column (after the amounts): one-decimal figures, in prize order.
  const columns = [...text.matchAll(/(?<![\d$,.])\d[\d,]*\.\d(?!\d)/g)].map((m) => m[0].replace(/,/g, ''));
  const missing = [...found.entries()].filter(([, v]) => v.winners === undefined).map(([d]) => d).sort((a, b) => a - b);
  if (missing.length && columns.length === found.size) {
    [...found.keys()].sort((a, b) => a - b).forEach((d, i) => {
      const v = found.get(d);
      if (v && v.winners === undefined) v.winners = columns[i];
    });
  }
  for (const [division, v] of [...found.entries()].sort((a, b) => a[0] - b[0])) {
    if (v.winners !== undefined && v.prize !== undefined) out.prizes.push({ division, winners: v.winners, prize: v.prize });
  }
  return out;
}
