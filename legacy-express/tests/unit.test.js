const test = require('node:test');
const assert = require('node:assert/strict');
const { pickSet, parseNums, frequency, toStored } = require('../src/mark6');
const { hashPassword, verifyPassword, safeNext } = require('../src/security');
const { money, date } = require('../src/format');

const flat = Array(50).fill(0);

test('pickSet returns 6 unique sorted numbers in 1..49 for every mode', () => {
  for (const mode of ['random', 'balanced', 'hot', 'cold']) {
    for (let i = 0; i < 200; i++) {
      const s = pickSet(mode, [], flat);
      assert.equal(s.length, 6);
      assert.equal(new Set(s).size, 6);
      assert.ok(s.every((n) => n >= 1 && n <= 49));
      assert.deepEqual(s, [...s].sort((a, b) => a - b));
    }
  }
});

test('pickSet keeps favourites and ignores a 6th', () => {
  const s = pickSet('random', [7, 18, 29], flat);
  assert.ok([7, 18, 29].every((n) => s.includes(n)));
  assert.equal(pickSet('random', [1, 2, 3, 4, 5, 6], flat).length, 6);
});

test('hot mode favours frequent numbers', () => {
  const freq = Array(50).fill(0);
  freq[10] = 1000;
  let hits = 0;
  for (let i = 0; i < 300; i++) if (pickSet('hot', [], freq).includes(10)) hits++;
  assert.ok(hits > 250, `10 appeared ${hits}/300`);
});

test('parseNums rejects junk, duplicates and out of range', () => {
  assert.deepEqual(parseNums('7, 7, 0, 50, abc, 49, 1'), [7, 49, 1]);
  assert.equal(toStored([40, 3, 9]), '3,9,40');
  assert.equal(frequency(['1,2,3', '3,4']).slice(1, 5).join(), '1,1,2,1');
});

test('password hashing verifies only the right password', async () => {
  const h = await hashPassword('correct horse battery');
  assert.ok(await verifyPassword('correct horse battery', h));
  assert.equal(await verifyPassword('wrong', h), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

test('safeNext blocks open redirects', () => {
  assert.equal(safeNext('/account'), '/account');
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', undefined, 'javascript:1']) assert.equal(safeNext(bad), '/');
});

test('money and date formatting', () => {
  assert.equal(money(8000000, { code: 'HKD', rate: 1 }), 'HK$8,000,000');
  assert.match(money(100, { code: 'INR', rate: 11.4 }), /1,140/);
  assert.equal(date('2026-10-07'), 'Wed, 7 Oct 2026');
  assert.equal(date(null), '');
});
