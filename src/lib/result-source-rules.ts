import { isBall, parseResultText, type PastedResult } from './mark6.ts';

/** Page HTML to plain text: scripts and styles dropped, tags replaced by spaces, common entities decoded. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#36;|&dollar;/g, '$')
    .replace(/\s+/g, ' ')
    .trim();
}

const int = (v: unknown) => (typeof v === 'number' || typeof v === 'string') && /^\d{1,13}$/.test(String(v).trim()) ? String(v).trim() : null;

/**
 * The JSON a result source may return:
 * { "drawNo": "26/104", "date": "2026-09-26", "numbers": [4,28,31,44,47,48], "extra": 19, "turnover": 14675740,
 *   "prizes": [ { "division": 1, "winners": 0, "prize": 8000000 }, ... ] }
 * Anything that is not clearly valid is refused rather than guessed.
 */
export function parseJsonResult(data: unknown): { ok: true; result: PastedResult } | { ok: false; error: string } {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') return { ok: false, error: 'The source did not return a result.' };
  const nums = Array.isArray(d.numbers) ? d.numbers.map(Number) : [];
  if (nums.length !== 6 || nums.some((n) => !isBall(n)) || new Set(nums).size !== 6) return { ok: false, error: 'The source gave six winning numbers that are not six different numbers from 1 to 49.' };
  const extra = Number(d.extra);
  if (!isBall(extra) || nums.includes(extra)) return { ok: false, error: 'The source gave an extra number that is not valid.' };
  const result: PastedResult = { numbers: nums, extra, prizes: [] };
  if (typeof d.drawNo === 'string') {
    if (!/^\d{2}\/\d{3}$/.test(d.drawNo)) return { ok: false, error: 'The source gave a draw number that is not like 26/104.' };
    result.drawNo = d.drawNo;
  }
  if (typeof d.date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return { ok: false, error: 'The source gave a date that is not like 2026-09-26.' };
    result.date = d.date;
  }
  const turnover = d.turnover === undefined ? null : int(d.turnover);
  if (d.turnover !== undefined && turnover === null) return { ok: false, error: 'The source gave a turnover that is not a whole number.' };
  if (turnover) result.turnover = turnover;
  if (d.prizes !== undefined) {
    if (!Array.isArray(d.prizes)) return { ok: false, error: 'The source gave prizes in a form that is not a list.' };
    const seen = new Set<number>();
    for (const p of d.prizes as Record<string, unknown>[]) {
      const division = Number(p?.division);
      const winners = int(p?.winners);
      const prize = int(p?.prize);
      if (!Number.isInteger(division) || division < 1 || division > 7 || seen.has(division) || winners === null || prize === null) return { ok: false, error: `The source gave a prize row that is not valid (division ${p?.division}).` };
      seen.add(division);
      result.prizes.push({ division, winners, prize });
    }
    result.prizes.sort((a, b) => a.division - b.division);
  }
  return { ok: true, result };
}

/** Text or HTML from a results page, read with the same reader as the paste box. */
export function parseTextResult(body: string): { ok: true; result: PastedResult } | { ok: false; error: string } {
  const result = parseResultText(htmlToText(body));
  return result.numbers.length ? { ok: true, result } : { ok: false, error: 'No winning numbers were found at the source. It may show the numbers as pictures, or only after a script runs. Use the paste box or type them in.' };
}
