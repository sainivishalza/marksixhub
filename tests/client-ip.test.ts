import test from 'node:test';
import assert from 'node:assert/strict';
import { pickClientIp } from '../src/lib/client-ip.ts';

test('default keeps the first entry (unchanged behaviour)', () => {
  assert.equal(pickClientIp('1.1.1.1, 2.2.2.2', null), '1.1.1.1');
  assert.equal(pickClientIp('1.1.1.1', null), '1.1.1.1');
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
