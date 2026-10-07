const crypto = require('node:crypto');

const RED = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46]);
const BLUE = new Set([3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48]);
const ballClass = (n) => (RED.has(n) ? 'r' : BLUE.has(n) ? 'b' : 'g');

const MODES = ['random', 'balanced', 'hot', 'cold'];
const validBall = (n) => Number.isInteger(n) && n >= 1 && n <= 49;

function parseNums(text) {
  const out = [];
  for (const part of String(text || '').split(/[^0-9]+/)) {
    const n = parseInt(part, 10);
    if (validBall(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

const toStored = (nums) => [...nums].sort((a, b) => a - b).join(',');

function frequency(storedList) {
  const freq = Array(50).fill(0);
  for (const s of storedList) for (const n of parseNums(s)) freq[n]++;
  return freq;
}

function weightedDraw(pool, weightOf) {
  let r = crypto.randomInt(pool.reduce((sum, n) => sum + weightOf(n), 0));
  for (const n of pool) {
    r -= weightOf(n);
    if (r < 0) return n;
  }
  return pool[pool.length - 1];
}

function pickSet(mode, favourites, freq) {
  const max = Math.max(0, ...freq);
  const weightOf = mode === 'hot' ? (n) => freq[n] + 1 : mode === 'cold' ? (n) => max - freq[n] + 1 : () => 1;
  const build = () => {
    const chosen = favourites.slice(0, 5);
    const pool = Array.from({ length: 49 }, (_, i) => i + 1).filter((n) => !chosen.includes(n));
    while (chosen.length < 6) {
      const n = weightedDraw(pool, weightOf);
      chosen.push(n);
      pool.splice(pool.indexOf(n), 1);
    }
    return chosen.sort((a, b) => a - b);
  };
  let set = build();
  if (mode === 'balanced') {
    for (let i = 0; i < 500; i++) {
      const odd = set.filter((n) => n % 2).length;
      const sum = set.reduce((a, b) => a + b, 0);
      if (odd >= 2 && odd <= 4 && sum >= 90 && sum <= 210) break;
      set = build();
    }
  }
  return set;
}

module.exports = { ballClass, MODES, parseNums, toStored, frequency, pickSet, validBall };
