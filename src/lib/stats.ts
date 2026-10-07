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
