export type Draw = {
  id: number;
  drawNo: string;
  drawDate: string;
  status: 'upcoming' | 'published';
  numbers: number[];
  extra: number | null;
  /** Estimated 1st division prize (HK$). */
  estJackpotHkd: number;
  /** Jackpot / snowball carried over (HK$), when announced. */
  snowballHkd: number | null;
  turnoverHkd: number | null;
  fundHkd: number | null;
  /** Last time bets are accepted, "HH:MM" Hong Kong time. */
  stopSelling: string | null;
  note: string | null;
};

/** The best prize anyone won in a draw: the highest division that had winners. */
export type TopPrize = { division: number; prizeHkd: number };

export type Prize = { division: number; winners: number; prizeHkd: number };

export type Currency = { code: string; name: string; symbol: string; rate: number };

export type EventItem = { id: number; title: string; eventDate: string; body: string };

export const drawSlug = (drawNo: string) => drawNo.replace('/', '-');
export const slugToDrawNo = (slug: string) => slug.replace('-', '/');
export const isDrawSlug = (slug: string) => /^\d{2}-\d{3}$/.test(slug);
