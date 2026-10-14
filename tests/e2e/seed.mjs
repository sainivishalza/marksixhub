// Synthetic published draws for the results-search suite: 26/104 back to 26/001, then 25/xxx, weekly-ish, plus the next draw.
// Numbers are made up (a small deterministic generator), so nothing here is real lottery data.
import { execFileSync } from 'node:child_process';

const db = process.env.E2E_DB || 'mh_test';
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const balls = () => {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  const picked = [];
  while (picked.length < 7) picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return { nums: picked.slice(0, 6).sort((a, b) => a - b).join(','), extra: picked[6] };
};

const rows = [];
let date = new Date('2026-09-26T00:00:00Z');
for (let year = 26, no = 104; rows.length < 160; no--) {
  if (no < 1) { year -= 1; no = 104; }
  const { nums, extra } = balls();
  rows.push(`('${year}/${String(no).padStart(3, '0')}','${date.toISOString().slice(0, 10)}','published','${nums}',${extra})`);
  date = new Date(date.getTime() - 3 * 86_400_000);
}
execFileSync('mariadb', [db, '-e', `INSERT IGNORE INTO draws (draw_no, draw_date, status, nums, extra) VALUES ${rows.join(',')}`]);
execFileSync('mariadb', [db, '-e', "INSERT IGNORE INTO draws (draw_no, draw_date, status, est_jackpot_hkd, snowball_hkd, turnover_hkd, stop_selling_time) VALUES ('26/108', CURDATE() + INTERVAL 2 DAY, 'upcoming', 23000000, 18000000, 14675740, '21:15')"]);
console.log(`seeded ${rows.length} draws and the next draw`);
