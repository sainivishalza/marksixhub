import test from 'node:test';
import assert from 'node:assert/strict';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../src/lib/password.ts';
import { rateLimit, resetRateLimits } from '../src/lib/rate-limit.ts';
import { can, isRole } from '../src/lib/perms.ts';
import { parseCsv, toCsv } from '../src/lib/csv.ts';
import { EMAIL, passwordProblem, readCurrency, readDraw, safeNext } from '../src/lib/validate.ts';

test('passwords: hash format matches the legacy app and only the right password verifies', async () => {
  const h = await hashPassword('correct horse battery');
  assert.match(h, /^s1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.ok(await verifyPassword('correct horse battery', h));
  assert.equal(await verifyPassword('wrong', h), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
  assert.equal(await verifyPassword('x', DUMMY_HASH), false);
});

test('passwords: a hash built with the legacy Express parameters (N=16384, r=8, p=1, 64 bytes) verifies', async () => {
  const { scryptSync, randomBytes } = await import('node:crypto');
  const salt = randomBytes(16);
  const legacy = `s1$${salt.toString('base64')}$${scryptSync('legacy-pass-123', salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64')}`;
  assert.ok(await verifyPassword('legacy-pass-123', legacy));
});

test('rate limit blocks after the limit and recovers after the window', () => {
  resetRateLimits();
  for (let i = 0; i < 3; i++) assert.ok(rateLimit('k', 3, 1000, 1000 + i).ok);
  const blocked = rateLimit('k', 3, 1000, 1500);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.ok(rateLimit('other', 3, 1000, 1500).ok, 'keys are independent');
  assert.ok(rateLimit('k', 3, 1000, 2100).ok, 'window slid past the first hits');
});

test('roles: view < content < manage', () => {
  assert.equal(can('user', 'view'), false);
  assert.equal(can('viewer', 'view'), true);
  assert.equal(can('viewer', 'content'), false);
  assert.equal(can('editor', 'content'), true);
  assert.equal(can('editor', 'manage'), false);
  assert.equal(can('admin', 'manage'), true);
  assert.equal(can(undefined, 'view'), false);
  assert.equal(isRole('admin'), true);
  assert.equal(isRole('root'), false);
});

test('csv: parse quotes, commas, newlines and BOM; export neutralises formulas', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n\n1,2'), [['a', 'b'], ['x, y', 'say "hi"'], ['1', '2']]);
  assert.equal(toCsv([['=SUM(A1)', 'ok', 'a,b'], ['@x', '-1', null]]), "'=SUM(A1),ok,\"a,b\"\r\n'@x,'-1,\r\n");
});

test('draw validation: published needs 6 distinct numbers and a different extra', () => {
  const base = { draw_no: '26/081', draw_date: '2026-10-06', status: 'published', extra: '7', n1: '3', n2: '12', n3: '25', n4: '31', n5: '40', n6: '49', w1: '2', p1: '8000000' };
  const ok = readDraw(base);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.value.numbers, [3, 12, 25, 31, 40, 49]);
  assert.deepEqual(ok.value.prizes[0], { division: 1, winners: 2, prizeHkd: 8000000 });
  assert.equal(ok.value.prizes.length, 7);
  assert.ok(readDraw({ ...base, n2: '3' }).errors.length, 'duplicate main number');
  assert.ok(readDraw({ ...base, extra: '3' }).errors.length, 'extra equals a main number');
  assert.ok(readDraw({ ...base, n1: '50' }).errors.length, 'out of range');
  assert.ok(readDraw({ ...base, draw_no: '26-081' }).errors.length, 'bad draw number');
  assert.ok(readDraw({ ...base, draw_date: '2026-13-45' }).errors.length, 'bad date');
  const upcoming = readDraw({ draw_no: '26/082', draw_date: '2026-10-09', status: 'upcoming', est_jackpot_hkd: '28000000' });
  assert.deepEqual(upcoming.errors, []);
  assert.equal(upcoming.value.estJackpotHkd, 28000000);
});

test('currency validation forces HKD to rate 1 and rejects bad input', () => {
  assert.equal(readCurrency({ code: 'hkd', name: 'Hong Kong Dollar', rate: '9' }).value.rate, 1);
  assert.ok(readCurrency({ code: 'IN', name: 'x', rate: '1' }).error);
  assert.ok(readCurrency({ code: 'INR', name: 'Rupee', rate: '0' }).error);
  assert.equal(readCurrency({ code: 'inr', name: 'Rupee', symbol: '₹', rate: '11.4', active: 'on' }).value.active, true);
});

test('email, password and redirect helpers', () => {
  assert.ok(EMAIL.test('a@b.co'));
  assert.ok(!EMAIL.test('a b@c.com'));
  assert.ok(passwordProblem('short'));
  assert.equal(passwordProblem('long-enough-pass'), null);
  assert.equal(safeNext('/account'), '/account');
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', undefined, 'javascript:1']) assert.equal(safeNext(bad), '/');
});
