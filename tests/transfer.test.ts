import test from 'node:test';
import assert from 'node:assert/strict';
import { PAY_ALPHABET, PAY_CODE_LENGTH, checkTransfer, displayName, newPayCode, parsePayCode, type TransferInput } from '../src/lib/transfer-rules.ts';

const ok: TransferInput = { enabled: true, senderId: 1, recipientId: 2, amount: 100, max: 1000, daily: 3000, sentToday: 0, balance: 500, senderVerified: true, senderAgeDays: 10, minAgeDays: 3, recipientVerified: true, recipientBlocked: false };

test('a normal transfer is allowed', () => assert.equal(checkTransfer(ok), null));

test('every rule blocks, with its own message', () => {
  const bad = (over: Partial<TransferInput>) => checkTransfer({ ...ok, ...over });
  assert.match(bad({ enabled: false })!, /switched off/);
  assert.match(bad({ recipientId: null })!, /cannot receive/);
  assert.match(bad({ recipientBlocked: true })!, /cannot receive/);
  assert.match(bad({ recipientVerified: false })!, /cannot receive/);
  assert.match(bad({ recipientId: 1 })!, /yourself/);
  assert.match(bad({ amount: 0 })!, /at least 1/);
  assert.match(bad({ amount: -5 })!, /at least 1/);
  assert.match(bad({ amount: 1.5 })!, /whole number/);
  assert.match(bad({ amount: Number.NaN })!, /whole number/);
  assert.match(bad({ amount: 1001 })!, /at most 1,000/);
  assert.match(bad({ senderVerified: false })!, /Confirm your email/);
  assert.match(bad({ senderAgeDays: 2 })!, /too new/);
  assert.match(bad({ amount: 501 })!, /not have enough/);
  assert.match(bad({ sentToday: 2950, amount: 100 })!, /Daily sending limit.*50 more/);
});

test('limits are inclusive: exactly the max, the balance and the daily cap are fine', () => {
  assert.equal(checkTransfer({ ...ok, amount: 1000, balance: 1000 }), null);
  assert.equal(checkTransfer({ ...ok, amount: 500, balance: 500 }), null);
  assert.equal(checkTransfer({ ...ok, sentToday: 2900, amount: 100 }), null);
  assert.equal(checkTransfer({ ...ok, minAgeDays: 0, senderAgeDays: 0 }), null);
});

test('pay codes: right length, no look-alike characters, and they differ', () => {
  const codes = new Set(Array.from({ length: 500 }, newPayCode));
  assert.equal(codes.size, 500);
  for (const c of codes) {
    assert.equal(c.length, PAY_CODE_LENGTH);
    assert.ok([...c].every((ch) => PAY_ALPHABET.includes(ch)));
  }
  assert.ok(!/[01IO]/.test([...codes].join('')));
});

test('parsePayCode accepts a code or a link and rejects everything else', () => {
  const c = newPayCode();
  assert.equal(parsePayCode(c), c);
  assert.equal(parsePayCode(` ${c.toLowerCase()} `), c);
  assert.equal(parsePayCode(`https://marksixhub.com/pay/${c}`), c);
  assert.equal(parsePayCode(`http://localhost:3333/pay/${c}/`), c);
  assert.equal(parsePayCode(`https://marksixhub.com/pay/${c}?x=1`), c);
  assert.equal(parsePayCode(''), null);
  assert.equal(parsePayCode('short'), null);
  assert.equal(parsePayCode('ABCDEFGHIJ'), null); // I is not in the alphabet
  assert.equal(parsePayCode('0123456789'), null);
  assert.equal(parsePayCode(`${c}${c}`), null);
  assert.equal(parsePayCode("ABCDE23456'; DROP TABLE users;--"), null);
});

test('displayName never shows an email', () => {
  assert.equal(displayName('lucky_7', 'ABCDE23456'), 'lucky_7');
  assert.equal(displayName(null, 'ABCDE23456'), 'Member 3456');
  assert.equal(displayName('', 'ABCDE23456'), 'Member 3456');
});
