import { ballTone } from './mark6.ts';

export type NumberStat = { n: number; count: number; gap: number };

/** Frequency and "draws since last seen" for balls 1 to 49. `draws` must be newest first. The extra number is not counted. */
export function numberStats(draws: { numbers: number[] }[]): NumberStat[] {
  const stats: NumberStat[] = Array.from({ length: 49 }, (_, i) => ({ n: i + 1, count: 0, gap: draws.length }));
  draws.forEach((d, i) => {
    for (const n of d.numbers) {
      const s = stats[n - 1];
      if (!s) continue;
      s.count += 1;
      if (s.gap === draws.length) s.gap = i;
    }
  });
  return stats;
}

export type NumberDetail = {
  n: number;
  /** Draws in the window (newest first). */
  total: number;
  count: number;
  extraCount: number;
  /** Index in `draws` of the newest draw with this number, or -1. */
  lastIndex: number;
  /** Draws since it last appeared; `total` when never. */
  gap: number;
  longestGap: number;
  /** Numbers most often drawn together with `n`, most frequent first. */
  partners: { n: number; count: number }[];
  /** Indexes in `draws` where it was drawn (newest first). */
  hits: number[];
};

/** Everything the per-number page shows. `draws` must be newest first. */
export function numberDetail(draws: { numbers: number[]; extra: number | null }[], n: number): NumberDetail {
  const hits: number[] = [];
  const together = new Map<number, number>();
  let extraCount = 0;
  draws.forEach((d, i) => {
    if (d.extra === n) extraCount += 1;
    if (!d.numbers.includes(n)) return;
    hits.push(i);
    for (const m of d.numbers) if (m !== n) together.set(m, (together.get(m) ?? 0) + 1);
  });
  // Longest run of draws without n: before the first hit, between hits, and after the oldest hit.
  const edges = [-1, ...hits, draws.length];
  let longestGap = 0;
  for (let i = 1; i < edges.length; i++) longestGap = Math.max(longestGap, edges[i] - edges[i - 1] - 1);
  const partners = [...together].map(([m, count]) => ({ n: m, count })).sort((a, b) => b.count - a.count || a.n - b.n).slice(0, 5);
  return { n, total: draws.length, count: hits.length, extraCount, lastIndex: hits[0] ?? -1, gap: hits[0] ?? draws.length, longestGap, partners, hits };
}

export type DrawFacts = { odd: number; even: number; low: number; high: number; sum: number; pairs: number; repeats: number[]; red: number; blue: number; green: number };

/** Plain facts about one draw's six numbers (1 to 24 is low, 25 to 49 is high), and which of them also came up in the draw before. */
export function drawFacts(numbers: number[], previous: number[] = []): DrawFacts {
  const sorted = [...numbers].sort((a, b) => a - b);
  return {
    odd: sorted.filter((n) => n % 2 === 1).length,
    even: sorted.filter((n) => n % 2 === 0).length,
    low: sorted.filter((n) => n <= 24).length,
    high: sorted.filter((n) => n >= 25).length,
    sum: sorted.reduce((a, b) => a + b, 0),
    pairs: sorted.filter((n, i) => i > 0 && n === sorted[i - 1] + 1).length,
    repeats: sorted.filter((n) => previous.includes(n)),
    red: sorted.filter((n) => ballTone(n) === 'red').length,
    blue: sorted.filter((n) => ballTone(n) === 'blue').length,
    green: sorted.filter((n) => ballTone(n) === 'green').length,
  };
}
