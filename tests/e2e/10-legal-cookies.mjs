import { chromium } from './pw.mjs';
import { execFileSync } from 'node:child_process';
const BASE = 'http://localhost:3333';
const sql = (q) => execFileSync('mariadb', [process.env.E2E_DB || 'mh_test', '-N', '-e', q]).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await b.newContext({ viewport: { width: 400, height: 900 } });
const p = await ctx.newPage();

// Sign-up needs the age/terms tick
await p.goto(BASE + '/register');
const box = p.getByRole('checkbox');
check('sign-up has an age + terms tick-box', await box.count() === 1);
check('tick-box is required', await box.evaluate((e) => e.required));
check('terms and privacy are linked from the tick-box', (await p.locator('form a[href="/terms"], form a[href="/privacy"]').count()) === 2);
const email = `del${Date.now()}@example.com`;
await p.getByLabel('Email').fill(email);
await p.getByLabel('Password').fill('userpass123456');
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForTimeout(1200);
check('cannot sign up without ticking', p.url().includes('/register'));
await p.evaluate(() => document.querySelector('input[name=agree]').removeAttribute('required'));
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForTimeout(1500);
check('server also refuses without the tick', (await p.locator('[role=alert]').allInnerTexts()).join().includes('18 or older') && sql(`SELECT COUNT(*) FROM users WHERE email='${email}'`) === '0');
await p.getByLabel('Password').fill('userpass123456');
await box.check();
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/\/account(\?welcome=1)?$/, { timeout: 10000 });
check('signed up after ticking', true);
const id = sql(`SELECT id FROM users WHERE email='${email}'`);
sql(`INSERT INTO favourites (user_id, nums) VALUES (${id}, '1,2,3,4,5,6')`);
sql(`UPDATE users SET nickname='gone${id}' WHERE id=${id}`);
sql(`INSERT INTO point_log (user_id, delta, reason) VALUES (${id}, 10, 'test')`);

// Delete account
await p.goto(BASE + '/account/settings');
await p.getByLabel('Your password').fill('wrongwrong');
await p.getByLabel('Type DELETE to confirm').fill('DELETE');
await p.getByRole('button', { name: 'Delete my account' }).click();
await p.waitForTimeout(1500);
check('wrong password does not delete', (await p.locator('[role=alert]').allInnerTexts()).join().includes('password is not right') && sql(`SELECT email FROM users WHERE id=${id}`) === email);
await p.getByLabel('Your password').fill('userpass123456');
await p.getByLabel('Type DELETE to confirm').fill('nope');
await p.getByRole('button', { name: 'Delete my account' }).click();
await p.waitForTimeout(1500);
check('must type DELETE', (await p.locator('[role=alert]').allInnerTexts()).join().includes('Type DELETE') && sql(`SELECT email FROM users WHERE id=${id}`) === email);
await p.getByLabel('Your password').fill('userpass123456');
await p.getByLabel('Type DELETE to confirm').fill('DELETE');
await p.getByRole('button', { name: 'Delete my account' }).click();
await p.waitForURL('**/login?deleted=1', { timeout: 10000 });
check('lands on login with a confirmation message', (await p.locator('[role=status]').allInnerTexts()).join().includes('deleted'));
check('email is gone', sql(`SELECT email FROM users WHERE id=${id}`) === `deleted-${id}@deleted.invalid`);
check('nickname, favourites cleared', sql(`SELECT IFNULL(nickname,'null') FROM users WHERE id=${id}`) === 'null' && sql(`SELECT COUNT(*) FROM favourites WHERE user_id=${id}`) === '0');
check('point history kept without a name', sql(`SELECT COUNT(*) FROM point_log WHERE user_id=${id}`) !== '0');
check('deleting writes an "Account deleted" history line that zeroes the balance', sql(`SELECT points FROM users WHERE id=${id}`) === '0' && sql(`SELECT COALESCE(SUM(delta),0) FROM point_log WHERE user_id=${id} AND reason='Account deleted'`) === '-1000');
await p.goto(BASE + '/login');
await p.getByLabel('Email').fill(email);
await p.getByLabel('Password').fill('userpass123456');
await p.getByRole('button', { name: /log in/i }).click();
await p.waitForTimeout(1500);
check('cannot log in again', p.url().includes('/login'));

// Staff have no delete button
const a = await (await b.newContext()).newPage();
await a.goto(BASE + '/login');
await a.getByLabel('Email').fill('admin@example.com');
await a.getByLabel('Password').fill('adminpass12345');
await a.getByRole('button', { name: /log in/i }).click();
await a.waitForTimeout(2000);
await a.goto(BASE + '/account/settings');
check('admin sees no delete-account section', (await a.getByText('Delete my account').count()) === 0);

// Cookie notice (server started with GA_MEASUREMENT_ID=G-TEST12345)
const c1 = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
const loaded = [];
c1.on('request', (r) => { if (r.url().includes('googletagmanager')) loaded.push(r.url()); });
await c1.goto(BASE + '/faq');
await c1.waitForTimeout(1200);
check('cookie notice shows before a choice', await c1.getByRole('region', { name: 'Cookies' }).isVisible());
check('Analytics not loaded before a choice', loaded.length === 0);
await c1.getByRole('button', { name: 'Decline' }).click();
await c1.waitForTimeout(800);
check('Decline hides the notice and loads nothing', !(await c1.getByRole('region', { name: 'Cookies' }).count()) && loaded.length === 0);
await c1.reload(); await c1.waitForTimeout(1000);
check('choice is remembered after reload', !(await c1.getByRole('region', { name: 'Cookies' }).count()) && loaded.length === 0);
const c2 = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
const loaded2 = [];
c2.on('request', (r) => { if (r.url().includes('googletagmanager')) loaded2.push(r.url()); });
await c2.goto(BASE + '/faq'); await c2.waitForTimeout(800);
await c2.getByRole('button', { name: 'Accept' }).click();
await c2.waitForTimeout(1500);
check('Accept loads Analytics with the id', loaded2.some((u) => u.includes('G-TEST12345')), loaded2.join());

// Contact consent, helpline, security.txt
await p.goto(BASE + '/contact');
check('contact form says how the message is used', (await p.locator('form').innerText()).includes('only to reply'));
await p.goto(BASE + '/');
check('footer shows the counselling line as a tap-to-call link', (await p.locator('footer a[href="tel:1834633"]').count()) === 1);
const sec = await (await fetch(BASE + '/.well-known/security.txt')).text();
check('security.txt has contact and a future expiry', sec.includes('Contact: mailto:') && new Date(sec.match(/Expires: (.*)/)[1]) > new Date());
await b.close();
console.log(`${pass}/${pass + fail} passed`);
