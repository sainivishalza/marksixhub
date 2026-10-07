import type { Currency, Draw, EventItem, Prize } from './types';

// Used ONLY in development when no database is configured, so the UI can be previewed.
const draw = (id: number, drawNo: string, drawDate: string, numbers: number[], extra: number): Draw => ({
  id, drawNo, drawDate, status: 'published', numbers, extra, estJackpotHkd: 0, note: null,
});

export const sampleDraws: Draw[] = [
  draw(8, '26/081', '2026-10-06', [3, 12, 25, 31, 40, 49], 7),
  draw(7, '26/080', '2026-10-03', [5, 9, 18, 22, 36, 44], 29),
  draw(6, '26/079', '2026-10-01', [1, 14, 23, 27, 33, 48], 16),
  draw(5, '26/078', '2026-09-29', [8, 11, 19, 30, 41, 45], 2),
  draw(4, '26/077', '2026-09-26', [4, 13, 21, 35, 38, 47], 10),
  draw(3, '26/076', '2026-09-24', [6, 15, 24, 28, 42, 46], 20),
];

export const sampleNext: Draw = {
  id: 9, drawNo: '26/082', drawDate: '2026-10-09', status: 'upcoming', numbers: [], extra: null,
  estJackpotHkd: 28000000, note: 'Snowball: the first division prize rolled over.',
};

export const samplePrizes: Prize[] = [
  { division: 1, winners: 0, prizeHkd: 0 },
  { division: 2, winners: 3, prizeHkd: 612540 },
  { division: 3, winners: 98, prizeHkd: 38640 },
  { division: 4, winners: 211, prizeHkd: 9600 },
  { division: 5, winners: 4310, prizeHkd: 640 },
  { division: 6, winners: 6120, prizeHkd: 320 },
  { division: 7, winners: 81200, prizeHkd: 40 },
];

export const sampleCurrencies: Currency[] = [
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 1 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 11.4 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 0.18 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 2.3 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 0.7 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.098 },
];

export const sampleEvents: EventItem[] = [
  { id: 1, title: 'Lunar New Year Draw', eventDate: '2027-02-06', body: 'Special festive draw with an enlarged prize fund.' },
];
