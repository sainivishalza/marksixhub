import test from 'node:test';
import assert from 'node:assert/strict';
import { INVITE_CODE_LENGTH, newInviteCode, parseInviteCode, referralProblem, type ReferralCheck } from '../src/lib/referral-rules.ts';

const ok: ReferralCheck = { inviterId: 1, inviterBlocked: false, inviterIp: 'aaa', inviteeIp: 'bbb', paidSoFar: 0, cap: 10, reward: 200, welcome: 200 };

test('a normal invite is paid', () => assert.equal(referralProblem(ok), null));

test('every reason not to pay', () => {
  const bad = (o: Partial<ReferralCheck>) => referralProblem({ ...ok, ...o });
  assert.match(bad({ inviterId: null })!, /no inviter/);
  assert.match(bad({ inviterBlocked: true })!, /suspended/);
  assert.match(bad({ reward: 0, welcome: 0 })!, /off/);
  assert.match(bad({ paidSoFar: 10 })!, /limit/);
  assert.match(bad({ inviterIp: 'same', inviteeIp: 'same' })!, /same network/);
});

test('edges: one reward off still pays the other; unknown networks are not blocked; cap is exclusive', () => {
  assert.equal(referralProblem({ ...ok, reward: 0 }), null);
  assert.equal(referralProblem({ ...ok, welcome: 0 }), null);
  assert.equal(referralProblem({ ...ok, inviterIp: null }), null);
  assert.equal(referralProblem({ ...ok, inviteeIp: null }), null);
  assert.equal(referralProblem({ ...ok, paidSoFar: 9 }), null);
});

test('invite codes: right length, no look-alikes, parse only accepts real ones', () => {
  const codes = new Set(Array.from({ length: 300 }, newInviteCode));
  assert.equal(codes.size, 300);
  for (const c of codes) {
    assert.equal(c.length, INVITE_CODE_LENGTH);
    assert.equal(parseInviteCode(c.toLowerCase()), c);
  }
  assert.equal(parseInviteCode(''), null);
  assert.equal(parseInviteCode('ABC'), null);
  assert.equal(parseInviteCode('ABCD2345'), 'ABCD2345');
  assert.equal(parseInviteCode('ABCDEFGI'), null); // I is not in the alphabet
  assert.equal(parseInviteCode('0123456\''), null);
});
