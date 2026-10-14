import test from 'node:test';
import assert from 'node:assert/strict';
import { drawFacts, numberDetail } from '../src/lib/stats.ts';

const d = (numbers: number[], extra: number | null = null) => ({ numbers, extra });

test('numberDetail: counts, gaps, partners and extra hits (newest first)', () => {
  const draws = [d([1, 2, 3, 4, 5, 6], 7), d([10, 11, 12, 13, 14, 15], 1), d([1, 2, 20, 21, 22, 23]), d([30, 31, 32, 33, 34, 35]), d([40, 41, 42, 43, 44, 45])];
  const x = numberDetail(draws, 1);
  assert.equal(x.count, 2);
  assert.equal(x.extraCount, 1);
  assert.equal(x.lastIndex, 0);
  assert.equal(x.gap, 0);
  assert.equal(x.longestGap, 2); // draws 3 and 4 (indexes 3, 4) come after the oldest hit
  assert.deepEqual(x.hits, [0, 2]);
  assert.equal(x.partners[0].n, 2); // drawn with 1 twice
  const never = numberDetail(draws, 49);
  assert.equal(never.count, 0);
  assert.equal(never.gap, 5);
  assert.equal(never.longestGap, 5);
  assert.equal(never.lastIndex, -1);
});

test('drawFacts: odd/even, low/high, sum, runs, repeats and colours', () => {
  const f = drawFacts([3, 4, 25, 30, 31, 49], [4, 30, 8, 9, 10, 11]);
  assert.equal(f.odd, 4);
  assert.equal(f.even, 2);
  assert.equal(f.low, 2);
  assert.equal(f.high, 4);
  assert.equal(f.sum, 142);
  assert.equal(f.pairs, 2); // 3-4 and 30-31
  assert.deepEqual(f.repeats, [4, 30]);
  assert.equal(f.red + f.blue + f.green, 6);
});
