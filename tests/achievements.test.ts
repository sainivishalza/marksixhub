import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, earnedCodes, progressOf, type AchievementStats } from '../src/lib/achievements-rules.ts';

const base: AchievementStats = { orders: 0, won: 0, streak: 0, sent: 0, invites: 0, nickname: false, twoStep: false, verified: false, memberDays: 0 };

test('a brand new member has earned nothing', () => assert.deepEqual(earnedCodes(base), []));

test('each badge unlocks at exactly its threshold', () => {
  assert.deepEqual(earnedCodes({ ...base, verified: true }), ['confirmed']);
  assert.ok(earnedCodes({ ...base, orders: 1 }).includes('first_order'));
  assert.ok(!earnedCodes({ ...base, orders: 9 }).includes('ten_orders'));
  assert.ok(earnedCodes({ ...base, orders: 10 }).includes('ten_orders'));
  assert.ok(earnedCodes({ ...base, won: 1 }).includes('first_win'));
  assert.ok(!earnedCodes({ ...base, won: 999 }).includes('big_win'));
  assert.ok(earnedCodes({ ...base, won: 1000 }).includes('big_win'));
  assert.ok(!earnedCodes({ ...base, streak: 6 }).includes('streak_7'));
  assert.ok(earnedCodes({ ...base, streak: 7 }).includes('streak_7'));
  assert.ok(earnedCodes({ ...base, sent: 1 }).includes('sender'));
  assert.ok(earnedCodes({ ...base, invites: 1 }).includes('inviter'));
  assert.ok(earnedCodes({ ...base, nickname: true }).includes('leaderboard'));
  assert.ok(earnedCodes({ ...base, twoStep: true }).includes('secure'));
  assert.ok(!earnedCodes({ ...base, memberDays: 29 }).includes('veteran'));
  assert.ok(earnedCodes({ ...base, memberDays: 30 }).includes('veteran'));
});

test('codes are unique and every badge has a title and text', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.code)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.title && a.text && a.code.length <= 30);
});

test('progress counts up to the goal and never past it', () => {
  assert.deepEqual(progressOf('ten_orders', { ...base, orders: 3 }), { have: 3, goal: 10 });
  assert.deepEqual(progressOf('ten_orders', { ...base, orders: 99 }), { have: 10, goal: 10 });
  assert.deepEqual(progressOf('streak_7', { ...base, streak: -2 }), { have: 0, goal: 7 });
  assert.equal(progressOf('first_win', base), null);
  assert.equal(progressOf('nope', base), null);
});
