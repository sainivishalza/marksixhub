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

test('combinations of 6 inside a set', async () => {
  const { combinations } = await import('../src/lib/mark6.ts');
  assert.equal(combinations([1, 2, 3, 4, 5, 6]).length, 1);
  const c = combinations([1, 2, 3, 4, 5, 6, 7]);
  assert.equal(c.length, 7);
  assert.ok(c.every((x) => x.length === 6 && new Set(x).size === 6));
});

test('receipt helpers format like a shop receipt', async () => {
  const { receiptDate, receiptLine, groupRef } = await import('../src/lib/receipt.ts');
  assert.equal(receiptLine([7, 9, 13, 25, 32, 45]), '7+9+13+25+32+45');
  assert.equal(receiptDate('2026-10-03 09:30:00'), '03OCT26 17:30'); // UTC to Hong Kong time
  assert.equal(receiptDate('2026-12-31 20:00:00'), '01JAN27 04:00');
  assert.equal(groupRef('6a0025fc4789020861c0ffff'), '6A002 5FC47 89020 861C0');
});

test('order numbers follow the draw and restart for each draw', async () => {
  const { makeOrderNo } = await import('../src/lib/receipt.ts');
  assert.equal(makeOrderNo('26/107', 1), '261070001');
  assert.equal(makeOrderNo('26/108', 1), '261080001');
  assert.equal(makeOrderNo('26/107', 12), '261070012');
  assert.equal(makeOrderNo('26/107', 10000), '2610710000');
});

test('history rules: windows, prices and years needed', async () => {
  const { yearsBefore, effectiveFrom, upgradeCost, yearsNeeded } = await import('../src/lib/history-rules.ts');
  assert.equal(yearsBefore('2026-09-26', 1), '2025-09-26');
  assert.equal(yearsBefore('2026-09-26', 9), '2017-09-26');
  assert.equal(yearsBefore('2024-02-29', 1), '2023-02-28');
  assert.equal(effectiveFrom('2026-05-01', null), '2026-05-01');
  assert.equal(effectiveFrom('2026-05-01', '2024-01-01'), '2024-01-01');
  assert.equal(effectiveFrom('2026-05-01', '2026-09-01'), '2026-05-01'); // buying never narrows the free window
  assert.equal(effectiveFrom(null, '2024-01-01'), null); // fewer than 40 results: everything is free
  assert.equal(upgradeCost(0, 1, 200), 200);
  assert.equal(upgradeCost(0, 3, 200), 600);
  assert.equal(upgradeCost(2, 3, 200), 200); // only the extra year
  assert.equal(upgradeCost(3, 3, 200), 0);
  assert.equal(yearsNeeded('2026-09-26', '2026-01-01'), 1);
  assert.equal(yearsNeeded('2026-09-26', '2025-09-26'), 1);
  assert.equal(yearsNeeded('2026-09-26', '2025-09-25'), 2);
  assert.equal(yearsNeeded('2026-09-26', '2018-01-02'), 9);
});

test('xlsx reader: text, numbers, empty cells and XML entities', async () => {
  const { readXlsx } = await import('../src/lib/xlsx.ts');
  const { readFileSync } = await import('node:fs');
  const rows = readXlsx(readFileSync(new URL('./fixtures/results.xlsx', import.meta.url)));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0].slice(0, 3), ['Draw No.', 'Draw Date', 'Num 1']);
  assert.deepEqual(rows[1], ['25/010', '15/02/2025', 3, 12, 25, 31, 40, 49, 7]);
  assert.equal(rows[2][8], '&<>"x');
  assert.equal(rows[3][1], null);
  assert.throws(() => readXlsx(Buffer.from('not a zip file at all, just text')), /not an Excel/);
});

test('winning units display like the HKJC: one decimal, a dash for none', async () => {
  const { unitsLabel } = await import('../src/lib/format.ts');
  assert.equal(unitsLabel(2.5), '2.5');
  assert.equal(unitsLabel(283), '283.0');
  assert.equal(unitsLabel(4085.2), '4,085.2');
  assert.equal(unitsLabel(0), '-');
});

test('pasted numbers are split for the six-circle input', async () => {
  const { splitPasted, boxNumbers } = await import('../src/lib/mark6.ts');
  assert.deepEqual(splitPasted('3 12 25 31 40 49'), ['3', '12', '25', '31', '40', '49']);
  assert.deepEqual(splitPasted('3, 12; 25-31/40 49'), ['3', '12', '25', '31', '40', '49']);
  assert.deepEqual(splitPasted('031225314049'), ['03', '12', '25', '31', '40', '49']);
  assert.deepEqual(splitPasted('12345'), [], 'odd run of digits is ambiguous');
  assert.deepEqual(splitPasted('no numbers here'), []);
  assert.deepEqual(boxNumbers(['3', '12', '12', '0', '50', '', '49']), [3, 12, 49], 'duplicates, 0, 50 and blanks are ignored');
});

test('digits that arrive all at once are read left to right', async () => {
  const { splitRun } = await import('../src/lib/mark6.ts');
  assert.deepEqual(splitRun('1225314049'), ['12', '25', '31', '40', '49']);
  assert.deepEqual(splitRun('5612'), ['5', '6', '12']);
  assert.deepEqual(splitRun('0312'), ['03', '12']);
  assert.deepEqual(splitRun('7'), ['7']);
  assert.deepEqual(splitRun('123'), ['12', '3']);
  assert.deepEqual(splitRun(''), []);
});
