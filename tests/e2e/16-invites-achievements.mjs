import { chromium } from './pw.mjs';
import { execFileSync, execSync, spawn } from 'node:child_process';
const BASE = 'http://localhost:3333';
const sql = (q) => execFileSync('mariadb', [process.env.E2E_DB || 'mh_test', '-N', '-B', '-e', q]).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const pw = 'userpass123456';
const ctx = () => b.newContext({ viewport: { width: 400, height: 1000 } });
async function join(name, ref = '') {
  const pg = await (await ctx()).newPage();
  await pg.goto(BASE + '/register' + (ref ? `?ref=${ref}` : ''));
  await pg.getByLabel('Email').fill(`${name}@example.com`);
  await pg.getByLabel('Password').fill(pw);
  await pg.getByRole('checkbox').check();
  await pg.getByRole('button', { name: 'Create account' }).click();
  await pg.waitForURL(/\/account/, { timeout: 10000 });
  sql(`UPDATE users SET email_verified=1, created_at=NOW() - INTERVAL 10 DAY, signup_ip='net_${name}' WHERE email='${name}@example.com'`);
  return pg;
}
const id = (n) => sql(`SELECT id FROM users WHERE email='${n}@example.com'`);
const pts = (n) => Number(sql(`SELECT points FROM users WHERE email='${n}@example.com'`));
const paid = (n) => sql(`SELECT referral_paid FROM users WHERE email='${n}@example.com'`);
const restart = async () => {
  execSync('fuser -k 3333/tcp || true');
  await new Promise((r) => setTimeout(r, 1500));
  spawn('node', ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: '3333' }, detached: true, stdio: 'ignore' }).unref();
  await new Promise((r) => setTimeout(r, 11000));
}; // also clears the sign-up limiter and the settings cache
const text = async (pg) => pg.locator('main').innerText();
sql("INSERT INTO draws (draw_no, draw_date, status, stop_selling_time) VALUES ('26/960', CURDATE() + INTERVAL 3 DAY, 'upcoming', '21:15')");
let seq = 0;
const order = (name, status = 'pending') => { seq++; sql(`INSERT INTO orders (user_id, draw_no, tickets, points, status, seq, order_no) VALUES (${id(name)}, '26/960', 1, 10, '${status}', ${seq}, '2696000${seq}')`); return sql('SELECT MAX(id) FROM orders'); };
const admin = await (await ctx()).newPage();
await admin.goto(BASE + '/login'); await admin.getByLabel('Email').fill('admin@example.com'); await admin.getByLabel('Password').fill('adminpass12345');
await admin.getByRole('button', { name: /log in/i }).click(); await admin.waitForTimeout(2000);
const approveAll = async () => { await admin.goto(BASE + '/admin/orders?draw=26%2F960'); await admin.getByRole('button', { name: /approve all/i }).click(); await admin.waitForTimeout(2500); };

// ---------- invite page
const ivy = await join('ivy');
await ivy.goto(BASE + '/account/invite');
const link = (await ivy.locator('p.font-mono.break-all, p.break-all').first().innerText()).trim();
const code = link.split('ref=')[1];
check('invite page shows a link with an 8 character code', /^http:\/\/localhost:3333\/register\?ref=[A-HJ-NP-Z2-9]{8}$/.test(link), link);
check('code is stored and stable on reload', sql(`SELECT invite_code FROM users WHERE id=${id('ivy')}`) === code && (await ivy.reload().then(() => ivy.locator('p.break-all').first().innerText())).trim() === link);
check('invite page explains the reward from settings', (await text(ivy)).includes('200 points') && (await text(ivy)).includes('up to 10 friends'));
check('stats start at zero', (await text(ivy)).includes('Friends who joined') && /Rewards paid\s*0/.test((await text(ivy)).replace(/\n/g, ' ')));
check('share button is present', (await ivy.getByRole('button', { name: 'Share my invite link' }).count()) === 1);

// ---------- joining with a link
const probe = await (await ctx()).newPage();
await probe.goto(BASE + `/register?ref=${code}`);
check('register page greets an invited friend', (await text(probe)).includes('A friend invited you') && (await probe.locator('input[name=ref]').inputValue()) === code);
await probe.goto(BASE + '/register?ref=BADCODE1');
check('a made-up code shows no invite message', !(await text(probe)).includes('A friend invited you'));
await probe.goto(BASE + '/register?ref=' + encodeURIComponent("';DROP"));
check('junk code is ignored safely', !(await text(probe)).includes('A friend invited you'));

const jack = await join('jack', code);
check('jack is linked to ivy', sql(`SELECT referred_by FROM users WHERE email='jack@example.com'`) === id('ivy'));
await join('nora', 'ABCD2345');
check('unknown but well-formed code links nobody', sql("SELECT IFNULL(referred_by,'none') FROM users WHERE email='nora@example.com'") === 'none');
const start = { ivy: pts('ivy'), jack: pts('jack') };
check('no reward at sign-up', paid('jack') === '0');

// ---------- reward on first approval
const o1 = order('jack'); const o2 = order('jack');
await approveAll();
check('both orders approved', sql(`SELECT COUNT(*) FROM orders WHERE user_id=${id('jack')} AND status='accepted'`) === '2');
check('inviter got 200', pts('ivy') === start.ivy + 200, `${start.ivy} -> ${pts('ivy')}`);
check('new member got 200, once, although two orders were approved together', pts('jack') === start.jack + 200, `${start.jack} -> ${pts('jack')}`);
check('referral marked paid', paid('jack') === '1');
check('ledger lines written for both', sql("SELECT COUNT(*) FROM point_log WHERE reason LIKE 'Invite reward%' OR reason='Welcome bonus from an invite'") === '2');
check('ledger still matches balances', sql('SELECT COUNT(*) FROM (SELECT u.points p, COALESCE(SUM(l.delta),0) l FROM users u LEFT JOIN point_log l ON l.user_id=u.id GROUP BY u.id) t WHERE p<>l') === '0');
order('jack'); await approveAll();
check('a later order pays nothing more', pts('ivy') === start.ivy + 200 && pts('jack') === start.jack + 200);
await ivy.goto(BASE + '/account/invite');
const it = (await text(ivy)).replace(/\n/g, ' ');
check('invite page now shows 1 friend, 1 reward, 200 points', /Friends who joined\s*1/.test(it) && /Rewards paid\s*1/.test(it) && /Points earned\s*200/.test(it), it.slice(-120));

// ---------- reasons not to pay
sql("REPLACE INTO settings (k, v) VALUES ('invite_cap','2')");
await restart();
const kim = await join('kim', code); const lee = await join('lee', code); const max = await join('max', code);
for (const n of ['kim', 'lee', 'max']) order(n);
const before = pts('ivy');
await approveAll();
check('cap of 2: the second invite is paid, the third is not', pts('ivy') === before + 200, `${before} -> ${pts('ivy')}`);
check('over the cap is marked not eligible and the new member gets nothing', [paid('kim'), paid('lee'), paid('max')].sort().join() === '1,2,2' && [pts('kim'), pts('lee'), pts('max')].filter((p) => p === 1000).length === 2, [paid('kim'), paid('lee'), paid('max')].join());
sql("REPLACE INTO settings (k, v) VALUES ('invite_cap','10')");

const zed = await join('zed', code);
sql(`UPDATE users SET signup_ip='net_ivy' WHERE email='zed@example.com'`); // same network as the inviter
order('zed');
const b2 = pts('ivy'); await approveAll();
check('same network as the inviter: no reward', pts('ivy') === b2 && paid('zed') === '2');

await join('amy', code); sql("UPDATE users SET blocked=1 WHERE email='ivy@example.com'"); order('amy');
const b3 = pts('amy'); await approveAll();
check('suspended inviter: no reward', paid('amy') === '2' && pts('amy') === b3);
sql("UPDATE users SET blocked=0 WHERE email='ivy@example.com'");

sql("REPLACE INTO settings (k, v) VALUES ('invite_reward','0'), ('invite_welcome','0')");
await restart();
await join('bo', code); order('bo');
await approveAll();
check('rewards switched off: nothing paid', paid('bo') === '2' && pts('bo') === 1000);
sql("REPLACE INTO settings (k, v) VALUES ('invite_reward','200'), ('invite_welcome','200')");

// ---------- achievements
await ivy.goto(BASE + '/account');
let t = await text(ivy);
check('overview shows Achievements', t.includes('Achievements') && /\d+ of 11/.test(t));
check('ivy earned Confirmed', (await ivy.locator('li:has-text("Confirmed") .sr-only').innerText()).includes('earned'));
const badge = async (pg, title) => { const li = pg.locator('li', { hasText: title }).filter({ has: pg.locator('svg') }).first(); return (await li.innerText()).replace(/\n/g, ' '); };
check('first visit marks new badges as New', (await ivy.locator('li:has-text("Brought a friend") >> text=New').count()) === 1);
await ivy.reload();
check('second visit no longer says New', (await ivy.locator('li:has-text("Brought a friend") >> text=New').count()) === 0);
check('Brought a friend is earned (gold, not locked)', !(await ivy.locator('li:has-text("Brought a friend")').innerText()).includes('Invite a friend') || (await ivy.locator('li:has-text("Brought a friend") .sr-only').innerText()).includes('earned'));
check('a locked badge says locked', (await ivy.locator('li:has-text("Locked down") .sr-only').innerText()).includes('locked'));
check('counting badge shows progress', /\d+ of 10/.test(await ivy.locator('li:has-text("Regular")').innerText()));
sql(`UPDATE users SET streak=7 WHERE id=${id('ivy')}`);
await ivy.reload();
check('7-day streak earned once the streak reaches 7', (await ivy.locator('li:has-text("7-day streak") .sr-only').innerText()).includes('earned'));
sql(`UPDATE users SET streak=0 WHERE id=${id('ivy')}`);
await ivy.reload();
check('a badge is kept after the streak resets', (await ivy.locator('li:has-text("7-day streak") .sr-only').innerText()).includes('earned'));
const pBefore = pts('ivy'); await ivy.reload();
check('badges never change points', pts('ivy') === pBefore);
await jack.goto(BASE + '/account');
check('jack earned First order', (await jack.locator('li:has-text("First order") .sr-only').innerText()).includes('earned'));
check('achievement rows are stored once per member', sql(`SELECT COUNT(*) - COUNT(DISTINCT user_id, code) FROM achievements`) === '0');
await ivy.goto(BASE + '/account/transfer');
await b.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
