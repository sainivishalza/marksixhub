// Rules for the paid results history. Pure functions, so they can be tested without a database.

export const FREE_RESULTS = 40;
export const HISTORY_MAX_YEARS = 9;

/** The date `years` years before `iso` (YYYY-MM-DD). 29 February falls back to 28 February. */
export function yearsBefore(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y - years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0); // 29 Feb in a non-leap year
  return target.toISOString().slice(0, 10);
}

/** What a visitor can see: the earlier of the free window and what they bought. null means no limit. */
export function effectiveFrom(freeFrom: string | null, boughtFrom: string | null): string | null {
  if (freeFrom === null) return null;
  return boughtFrom !== null && boughtFrom < freeFrom ? boughtFrom : freeFrom;
}

/** Points to go from `have` years of history to `want` years. Only the extra years are charged. */
export const upgradeCost = (have: number, want: number, perYear: number) => (want > have ? (want - have) * perYear : 0);

/** The fewest years of history that include a draw on `drawDate`, given the newest result date. */
export function yearsNeeded(latest: string, drawDate: string): number {
  for (let n = 1; n <= HISTORY_MAX_YEARS; n++) if (yearsBefore(latest, n) <= drawDate) return n;
  return HISTORY_MAX_YEARS;
}
