import { chromium } from './pw.mjs';
import { execSync } from 'node:child_process';
const BASE = 'http://localhost:3333';
const sql = (q) => execSync(`mariadb -N -B ${process.env.E2E_DB || 'mh_test'} -e ${JSON.stringify(q)}`).toString().trim();
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, extra); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const fresh = async () => (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
const login = async (p, email, pw) => {
  await p.goto(BASE + '/login');
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Password', { exact: true }).fill(pw);
  await p.getByRole('button', { name: 'Log in' }).click();
  await p.waitForTimeout(1500);
};
const register = async (p, email) => {
  await p.goto(BASE + '/register');
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Password').fill('userpass123456');
  await p.getByRole('checkbox').check();
await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/\/account(\?welcome=1)?$/);
};
const pts = (email) => Number(sql(`SELECT points FROM users WHERE email='${email}'`));
const bad = async (p) => (await p.content()).includes('could not load');

// state: draw 26/200 upcoming, open
sql("UPDATE draws SET status='upcoming', nums=NULL, extra=NULL, draw_date=CURDATE()+INTERVAL 2 DAY, stop_selling_time=NULL WHERE draw_no='26/200'");
sql("UPDATE saved_sets SET settled=1 WHERE draw_no='26/200'"); // ignore tickets from the first script

const admin = await fresh();
await login(admin, 'admin@example.com', 'adminpass12345');
check('admin lands on /admin', admin.url().endsWith('/admin'), admin.url());

const B = `b${Date.now()}@example.com`;
const pb = await fresh();
await register(pb, B);

// favourites
await pb.goto(BASE + '/picker');
await pb.getByRole('button', { name: 'Quick pick' }).first().click();
await pb.waitForTimeout(1500);
await pb.getByRole('button', { name: 'Favourite' }).click();
await pb.waitForTimeout(800);
check('favourite saved', sql(`SELECT COUNT(*) FROM favourites f JOIN users u ON u.id=f.user_id WHERE u.email='${B}'`) === '1');
check('favourite shown in picker', (await pb.content()).includes('My favourites'));
await pb.reload();
check('favourite persists after reload', (await pb.content()).includes('My favourites'));
await pb.getByRole('button', { name: 'Add to slip' }).last().click();
check('favourite adds to slip', (await pb.locator('[aria-label="Tickets on your slip"] li').count()) === 1);
await pb.getByRole('button', { name: /Remove favourite/ }).click();
await pb.waitForTimeout(800);
check('favourite removed', sql(`SELECT COUNT(*) FROM favourites f JOIN users u ON u.id=f.user_id WHERE u.email='${B}'`) === '0');

// nickname + leaderboard
await pb.goto(BASE + '/account/settings');
await pb.getByRole('textbox', { name: 'Nickname' }).fill('Tester_B');
await pb.getByRole('button', { name: 'Save', exact: true }).click();
await pb.waitForTimeout(1000);
await pb.goto(BASE + '/leaderboard');
check('leaderboard shows nickname, not email', (await pb.content()).includes('Tester_B') && !(await pb.content()).includes(B));

// multi entry payout: sets of 6
await pb.evaluate(() => localStorage.clear());
await pb.goto(BASE + '/picker');
await pb.getByRole('tab', { name: 'Multiple entry' }).click();
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) await pb.locator(`[data-n="${n}"]`).click();
await pb.getByRole('button', { name: /Submit order/ }).click();
await pb.waitForURL('**/account/orders/**', { timeout: 15000 }).catch(() => {});
await pb.waitForTimeout(1200);
if (!pb.url().includes('/picker') && process.env.STAY !== '1') { globalThis.__receiptUrl = pb.url(); await pb.goto(BASE + '/picker'); }
const afterOrder = pts(B);
check('multiple entry charged 20 for 2 tickets', afterOrder === 1000 - 20, String(afterOrder));

// receipt IDOR: A's order as B
const aOrder = sql("SELECT MIN(id) FROM orders");
const r = await pb.goto(`${BASE}/account/orders/${aOrder}`);
const ownOrder = sql(`SELECT MAX(o.id) FROM orders o JOIN users u ON u.id=o.user_id WHERE u.email='${B}'`);
if (aOrder !== ownOrder) check("other user's receipt is 404", r.status() === 404, String(r.status()));

// payout preview then publish: numbers 1..6, extra 40
await admin.goto(BASE + '/admin/draws');
const drawId = sql("SELECT id FROM draws WHERE draw_no='26/200'");
await admin.goto(`${BASE}/admin/draws/${drawId}?pn=1+2+3+4+5+6&px=40`);
await admin.waitForTimeout(1200);
const prev = await admin.locator('body').innerText();
check('payout preview shows 100000', prev.includes('100000 points would be paid'), prev.match(/\d+ points would be paid[^\n]*/)?.[0] ?? '');
sql("UPDATE draws SET nums='1,2,3,4,5,6', extra=40 WHERE draw_no='26/200'");
await admin.goto(BASE + '/admin/orders?draw=26/200');
await admin.getByRole('button', { name: /Approve all/ }).click();
await admin.waitForTimeout(1200);
await admin.goto(BASE + '/admin/draws');
await admin.locator('tr', { hasText: '26/200' }).getByRole('button', { name: /Publish/ }).click();
await admin.waitForTimeout(1500);
check('multiple entry paid 100000 (one 1st division ticket)', pts(B) - afterOrder === 100000, String(pts(B) - afterOrder));
await pb.goto(BASE + '/account');
check('win banner shown', (await pb.locator('body').innerText()).includes('You won 100,000 points in draw'));
await pb.getByRole('button', { name: 'Dismiss' }).click();
await pb.waitForTimeout(800);
check('win banner dismissed', !(await pb.locator('body').innerText()).includes('You won 100,000 points in draw'));

// unpublish reverses the payout
const beforeUndo = pts(B);
await admin.goto(BASE + '/admin/draws');
await admin.locator('tr', { hasText: '26/200' }).getByRole('button', { name: /Unpublish|Draft/ }).click();
await admin.waitForTimeout(1500);
check('unpublish took back 100000', beforeUndo - pts(B) === 100000, String(beforeUndo - pts(B)));
// cutoff: draw date in the past means ordering is closed
sql("UPDATE draws SET draw_date=CURDATE()-INTERVAL 1 DAY WHERE draw_no='26/200'");
await pb.goto(BASE + '/picker');
await pb.getByRole('button', { name: 'Quick pick' }).first().click();
await pb.waitForTimeout(1500);
check('picker says ordering closed', (await pb.locator('body').innerText()).includes('Ordering is closed'));
sql("UPDATE draws SET draw_date=CURDATE()+INTERVAL 2 DAY WHERE draw_no='26/200'");

// support role
const S = `s${Date.now()}@example.com`;
const ps = await fresh();
await register(ps, S);
sql(`UPDATE users SET role='support' WHERE email='${S}'`);
await ps.goto(BASE + '/admin/users');
check('support can open Users', (await ps.locator('h1').innerText()).includes('Users'));
check('support has no give-all form', !(await ps.content()).includes('Give every active user'));
const rs = await ps.goto(BASE + '/admin/settings');
check('support cannot open Settings', (await ps.locator('body').innerText()).includes('That page does not exist') && !(await ps.content()).includes('Site name'));
const ra = await ps.goto(BASE + '/admin/audit');
check('support cannot open Audit log', (await ps.locator('body').innerText()).includes('That page does not exist'));
await ps.goto(BASE + '/admin/orders?draw=26/200');
await ps.waitForTimeout(1500);
check('support sees order buttons', (await ps.getByRole('button', { name: /Refund|Approve|Reject/ }).count()) > 0);

// bulk grant + points check
const before = pts(B);
await admin.goto(BASE + '/admin/users');
await admin.locator('input[name=amount]').first().fill('50');
await admin.locator('input[name=confirm]').first().check();
await admin.getByRole('button', { name: 'Give points' }).click();
await admin.waitForTimeout(1200);
check('bulk grant +50', pts(B) - before === 50, String(pts(B) - before));

// admin role needs confirm tick
const uid = sql(`SELECT id FROM users WHERE email='${S}'`);
await admin.goto(BASE + '/admin/users');
const row = admin.locator('tr', { hasText: S });
await row.locator('select[name=role]').selectOption('admin');
await row.getByRole('button', { name: 'Save' }).click();
await admin.waitForTimeout(1000);
check('making admin without confirm refused', sql(`SELECT role FROM users WHERE id=${uid}`) === 'support');

// suspend B
await admin.goto(`${BASE}/admin/users/${sql(`SELECT id FROM users WHERE email='${B}'`)}`);
await admin.getByRole('button', { name: 'Suspend account' }).click();
await admin.waitForTimeout(1000);
await pb.goto(BASE + '/account');
check('suspended user is signed out', pb.url().includes('/login'), pb.url());
const pb2 = await fresh();
await login(pb2, B, 'userpass123456');
check('suspended user cannot log in', (await pb2.content()).includes('suspended'));
await admin.goto(`${BASE}/admin/users/${sql(`SELECT id FROM users WHERE email='${B}'`)}`);
await admin.getByRole('button', { name: 'Restore account' }).click();
await admin.waitForTimeout(800);

// exports and pages
const exp = await admin.request.get(BASE + '/admin/export');
const body = await exp.text();
check('backup export JSON without secrets', exp.status() === 200 && body.includes('"users"') && !body.includes('pass_hash') && !body.includes('totp_secret'), String(exp.status()));
const csv = await admin.request.get(BASE + '/admin/orders/export?draw=26/200');
check('orders CSV export', csv.status() === 200 && (await csv.text()).startsWith('draw,order'), String(csv.status()));
for (const p of ['/admin', '/admin/logins', '/admin/points-check', '/admin/audit', '/admin/search?q=26', `/admin/draws/${drawId}`]) {
  await admin.goto(BASE + p);
  check(`admin ${p} no error`, !(await bad(admin)));
}
await admin.goto(BASE + '/admin/points-check');
check('points ledger consistent at the end', (await admin.content()).includes('balances match'), (await admin.locator('main').innerText()).slice(0, 200).replace(/\n/g, ' '));

// unauthenticated + headers
const anon = await fresh();
const a1 = await anon.goto(BASE + '/admin');
check('anonymous /admin blocked', a1.status() === 404 || anon.url().includes('/login'), `${a1.status()} ${anon.url()}`);
const a2 = await anon.request.get(BASE + '/admin/export');
check('anonymous export blocked', !(await a2.text()).includes('"users"'), String(a2.status()));
const h = (await anon.request.get(BASE + '/')).headers();
check('security headers present', Boolean(h['x-content-type-options']) && Boolean(h['referrer-policy']) && (Boolean(h['x-frame-options']) || Boolean(h['content-security-policy'])), Object.keys(h).filter((k) => /policy|frame|content-type-options|strict/.test(k)).join(','));

await browser.close();
console.log(`\n${pass}/${pass + fail} passed`);
