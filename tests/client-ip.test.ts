import test from 'node:test';
import assert from 'node:assert/strict';
import { pickClientIp } from '../src/lib/client-ip.ts';

test('hops 0 keeps the first entry', () => {
  assert.equal(pickClientIp('1.1.1.1, 2.2.2.2', null), '1.1.1.1');
  assert.equal(pickClientIp('1.1.1.1', null, 0), '1.1.1.1');
});

test('with one trusted proxy the entry it added (the last) is used, so a forged first entry is ignored', () => {
  assert.equal(pickClientIp('6.6.6.6, 203.0.113.9', null, 1), '203.0.113.9');
  assert.equal(pickClientIp('203.0.113.9', null, 1), '203.0.113.9');
});

test('with two trusted proxies the second from the right is used', () => {
  assert.equal(pickClientIp('6.6.6.6, 203.0.113.9, 10.0.0.1', null, 2), '203.0.113.9');
  assert.equal(pickClientIp('203.0.113.9, 10.0.0.1', null, 2), '203.0.113.9');
});

test('fewer entries than hops uses the first; no header falls back to x-real-ip, then unknown', () => {
  assert.equal(pickClientIp('203.0.113.9', null, 3), '203.0.113.9');
  assert.equal(pickClientIp(null, '198.51.100.4'), '198.51.100.4');
  assert.equal(pickClientIp('', null), 'unknown');
  assert.equal(pickClientIp(null, null, 2), 'unknown');
});

test('junk is trimmed and capped', () => {
  assert.equal(pickClientIp('  1.1.1.1  ,   ', null), '1.1.1.1');
  assert.equal(pickClientIp('x'.repeat(500), null).length, 64);
});

import { safeNext } from '../src/lib/validate.ts';

test('safeNext keeps same-site paths and refuses tricks browsers read as another site', () => {
  assert.equal(safeNext('/account/orders?x=1'), '/account/orders?x=1');
  for (const bad of ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/\r/evil.com', 'https://evil.com', 'javascript:alert(1)', '']) assert.equal(safeNext(bad), '/', JSON.stringify(bad));
});
