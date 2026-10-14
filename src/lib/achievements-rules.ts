// Achievements are badges: never worth points (so they cannot be farmed), just a record of what a member has done.

export type AchievementStats = {
  orders: number;
  won: number;
  streak: number;
  sent: number;
  invites: number;
  nickname: boolean;
  twoStep: boolean;
  verified: boolean;
  memberDays: number;
};

type Def = { code: string; title: string; text: string; done: (s: AchievementStats) => boolean; progress?: (s: AchievementStats) => [number, number] };

export const ACHIEVEMENTS: Def[] = [
  { code: 'confirmed', title: 'Confirmed', text: 'Confirm your email address.', done: (s) => s.verified },
  { code: 'first_order', title: 'First order', text: 'Get your first order approved.', done: (s) => s.orders >= 1 },
  { code: 'ten_orders', title: 'Regular', text: 'Get 10 orders approved.', done: (s) => s.orders >= 10, progress: (s) => [s.orders, 10] },
  { code: 'first_win', title: 'First win', text: 'Win points on a ticket.', done: (s) => s.won > 0 },
  { code: 'big_win', title: '1,000 points won', text: 'Win 1,000 points in total.', done: (s) => s.won >= 1000, progress: (s) => [s.won, 1000] },
  { code: 'streak_7', title: '7-day streak', text: 'Claim your daily points 7 days in a row.', done: (s) => s.streak >= 7, progress: (s) => [s.streak, 7] },
  { code: 'sender', title: 'Generous', text: 'Send points to another member.', done: (s) => s.sent >= 1 },
  { code: 'inviter', title: 'Brought a friend', text: 'Invite a friend who gets an order approved.', done: (s) => s.invites >= 1 },
  { code: 'leaderboard', title: 'On the board', text: 'Add a nickname and join the leaderboard.', done: (s) => s.nickname },
  { code: 'secure', title: 'Locked down', text: 'Turn on two-step login.', done: (s) => s.twoStep },
  { code: 'veteran', title: '30 days in', text: 'Be a member for 30 days.', done: (s) => s.memberDays >= 30, progress: (s) => [s.memberDays, 30] },
];

export const earnedCodes = (s: AchievementStats) => ACHIEVEMENTS.filter((a) => a.done(s)).map((a) => a.code);

/** "3 of 10", capped at the goal, for badges that count something. Null for the others. */
export function progressOf(code: string, s: AchievementStats): { have: number; goal: number } | null {
  const p = ACHIEVEMENTS.find((a) => a.code === code)?.progress?.(s);
  return p ? { have: Math.min(Math.max(0, Math.floor(p[0])), p[1]), goal: p[1] } : null;
}
