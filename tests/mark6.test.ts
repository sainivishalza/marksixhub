import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_BALLS, ballTone, evaluate, parseNumbers, quickPick } from '../src/lib/mark6.ts';
import { money, dateLabel } from '../src/lib/format.ts';

test('ball colours follow the real Mark Six sets', () => {
  const count = { red: 0, blue: 0, green: 0 };
  for (const n of ALL_BALLS) count[ballTone(n)]++;
  assert.deepEqual(count, { red: 17, blue: 16, green: 16 });
  assert.equal(ballTone(1), 'red');
  assert.equal(ballTone(3), 'blue');
  assert.equal(ballTone(5), 'green');
});

test('quickPick returns 6 unique balls and keeps existing picks', () => {
  for (let i = 0; i < 500; i++) {
    const kept = [7, 18];
    const pick = quickPick(kept);
    assert.equal(pick.length, 6);
    assert.equal(new Set(pick).size, 6);
    assert.ok(pick.every((n) => n >= 1 && n <= 49));
    assert.ok(kept.every((n) => pick.includes(n)));
  }
});

test('quickPick is roughly uniform', () => {
  const hits = Array(50).fill(0);
  for (let i = 0; i < 20000; i++) for (const n of quickPick()) hits[n]++;
  const expected = (20000 * 6) / 49;
  for (let n = 1; n <= 49; n++) assert.ok(Math.abs(hits[n] - expected) < expected * 0.12, `ball ${n}: ${hits[n]}`);
});

test('parseNumbers ignores junk, duplicates and out-of-range values', () => {
  assert.deepEqual(parseNumbers('7, 7, 0, 50, abc, 49-1'), [7, 49, 1]);
  assert.deepEqual(parseNumbers(''), []);
});

test('evaluate maps matches to the seven divisions', () => {
  const win = [3, 12, 25, 31, 40, 49];
  const extra = 7;
  const div = (ticket: number[]) => evaluate(ticket, win, extra).division;
  assert.equal(div([3, 12, 25, 31, 40, 49]), 1);
  assert.equal(div([3, 12, 25, 31, 40, 7]), 2);
  assert.equal(div([3, 12, 25, 31, 40, 1]), 3);
  assert.equal(div([3, 12, 25, 31, 7, 1]), 4);
  assert.equal(div([3, 12, 25, 31, 2, 1]), 5);
  assert.equal(div([3, 12, 25, 7, 2, 1]), 6);
  assert.equal(div([3, 12, 25, 6, 2, 1]), 7);
  assert.equal(div([3, 12, 5, 6, 2, 1]), null);
  assert.equal(div([3, 12, 5, 6, 7, 1]), null, '2 numbers + extra wins nothing');
});

test('money converts from HKD and dates are stable', () => {
  assert.equal(money(8000000), 'HK$8,000,000');
  assert.match(money(100, { code: 'INR', name: 'Rupee', symbol: '₹', rate: 11.4 }), /1,140/);
  assert.equal(dateLabel('2026-10-07'), 'Wed, 7 Oct 2026');
});

test('numberStats counts draws and gaps, newest first', async () => {
  const { numberStats } = await import('../src/lib/stats.ts');
  const s = numberStats([{ numbers: [1, 2, 3, 4, 5, 6] }, { numbers: [1, 7, 8, 9, 10, 11] }, { numbers: [12, 13, 14, 15, 16, 17] }]);
  assert.equal(s[0].count, 2);
  assert.equal(s[0].gap, 0);
  assert.equal(s[6].gap, 1);
  assert.equal(s[11].gap, 2);
  assert.equal(s[48].count, 0);
  assert.equal(s[48].gap, 3);
});

test('totp matches the RFC 6238 test vector and rejects wrong codes', async () => {
  const { totpAt, verifyTotp, newTotpSecret } = await import('../src/lib/totp.ts');
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpAt(secret, Math.floor(59 / 30)), '287082');
  assert.ok(verifyTotp(secret, '287 082', 59_000));
  assert.ok(!verifyTotp(secret, '000000', 59_000));
  assert.ok(!verifyTotp(secret, '287082', 59_000 + 120_000));
  assert.match(newTotpSecret(), /^[A-Z2-7]{32}$/);
});

test('multiple entries: combination counts and units', async () => {
  const { combinations, ticketUnits } = await import('../src/lib/mark6.ts');
  assert.equal(ticketUnits(6), 1);
  assert.equal(ticketUnits(7), 7);
  assert.equal(ticketUnits(12), 924);
  const c = combinations([1, 2, 3, 4, 5, 6, 7]);
  assert.equal(c.length, 7);
  assert.ok(c.every((x) => x.length === 6 && new Set(x).size === 6));
});
