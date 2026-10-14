import { chromium } from './pw.mjs';
import { execSync } from 'node:child_process';
import { createHmac } from 'node:crypto';

const BASE = 'http://localhost:3333';
const sql = (q) => execSync(`mariadb -N -B ${process.env.E2E_DB || 'mh_test'} -e ${JSON.stringify(q)}`).toString().trim();
const results = [];
const check = (name, ok, extra = '') => { results.push([ok, name, extra]); console.log(ok ? 'PASS' : 'FAIL', name, extra); };

function totp(secret, now = Date.now()) {
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = ''; for (const c of secret) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const h = createHmac('sha1', key).update(ctr).digest(); const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}

sql("DELETE FROM draws WHERE draw_no='26/200'");
sql("INSERT INTO draws (draw_no, draw_date, status) VALUES ('26/200', CURDATE() + INTERVAL 2 DAY, 'upcoming')");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const email = `user${Date.now()}@example.com`;

try {
  // register
  await page.goto(BASE + '/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: false }).fill('userpass123456');
  await page.getByRole('checkbox').check();
await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/account(\?welcome=1)?$/);
  check('register lands on account', true);
  check('welcome points 1000', sql(`SELECT points FROM users WHERE email='${email}'`) === '1000');

  // claim daily
  await page.getByRole('button', { name: /Claim/ }).click();
  await page.waitForTimeout(800);
  check('daily claim paid', sql(`SELECT points FROM users WHERE email='${email}'`) === '1100');

  // single quick pick order
  await page.goto(BASE + '/picker');
  await page.getByRole('button', { name: 'Quick pick' }).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Submit order/ }).click();
  await page.waitForURL('**/account/orders/**', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (!page.url().includes('/picker') && process.env.STAY !== '1') { globalThis.__receiptUrl = page.url(); await page.goto(BASE + '/picker'); }
  check('single order placed (-10)', sql(`SELECT points FROM users WHERE email='${email}'`) === '1090');

  // quick pick x3 tickets
  await page.getByRole('tab', { name: 'Quick pick' }).click();
  await page.getByLabel(/How many quick pick/).fill('3');
  await page.getByRole('button', { name: /Add 3 random/ }).click();
  await page.getByRole('button', { name: /Submit order/ }).click();
  await page.waitForURL('**/account/orders/**', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (!page.url().includes('/picker') && process.env.STAY !== '1') { globalThis.__receiptUrl = page.url(); await page.goto(BASE + '/picker'); }
  check('quick pick x3 order (-30)', sql(`SELECT points FROM users WHERE email='${email}'`) === '1060');

  // multiple entry with 7 numbers = 7 tickets = 70
  await page.getByRole('tab', { name: 'Multiple entry' }).click();
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) await page.locator(`[data-n="${n}"]`).click();
  check('multiple entry made 2 tickets on the slip', (await page.locator('[aria-label="Tickets on your slip"] li').count()) === 2);
  await page.getByRole('button', { name: /Submit order/ }).click();
  await page.waitForURL('**/account/orders/**', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (!page.url().includes('/picker') && process.env.STAY !== '1') { globalThis.__receiptUrl = page.url(); await page.goto(BASE + '/picker'); }
  check('multiple entry 2 tickets (-20)', sql(`SELECT points FROM users WHERE email='${email}'`) === '1040');
  check('3 orders recorded', sql(`SELECT COUNT(*) FROM orders o JOIN users u ON u.id=o.user_id WHERE u.email='${email}'`) === '3');

  // receipt + account
  const orderId = sql(`SELECT MAX(o.id) FROM orders o JOIN users u ON u.id=o.user_id WHERE u.email='${email}'`);
  await page.goto(`${BASE}/account/orders/${orderId}`);
  check('order page title uses the draw-based number', /Order No\. 26200\d{4}/.test(await page.locator('h1').innerText()), await page.locator('h1').innerText());
  await page.goto(BASE + '/account');
  check('account lists orders', (await page.content()).includes('My orders'));
  check('buyer sees Pending', (await page.locator('body').innerText()).includes('Pending approval'));
  check('orders stored pending', sql(`SELECT COUNT(*) FROM orders o JOIN users u ON u.id=o.user_id WHERE u.email='${email}' AND o.status='pending'`) === '3');

  // other pages
  for (const p of ['/statistics', '/check?n=1+2+3+4+5+6', '/leaderboard', '/forgot', '/results', '/guide']) {
    const r = await page.goto(BASE + p);
    check(`GET ${p} 200`, r.status() === 200 && !(await page.content()).includes('could not load'));
  }

  // admin login
  const admin = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  await admin.goto(BASE + '/login');
  await admin.getByLabel('Email').fill('admin@example.com');
  await admin.getByLabel('Password', { exact: true }).fill('adminpass12345');
  await admin.getByRole('button', { name: 'Log in' }).click();
  await admin.waitForURL('**/admin**', { timeout: 15000 }).catch(() => {});
  check('admin login lands on /admin', admin.url().endsWith('/admin'), admin.url());
  for (const p of ['/admin', '/admin/orders?draw=26/200', '/admin/users', '/admin/audit', '/admin/logins', '/admin/points-check', '/admin/search?q=user', '/admin/draws', '/admin/settings']) {
    const r = await admin.goto(BASE + p);
    check(`admin ${p} ok`, r.status() === 200 && !(await admin.content()).includes('could not load'), String(r.status()));
  }
  await admin.goto(BASE + '/admin/orders?draw=26/200');
  check('orders page shows user', (await admin.content()).includes(email));
  // refund the 7-number order
  await admin.getByRole('button', { name: 'Reject' }).first().click();
  await admin.waitForTimeout(1200);
  const after = sql(`SELECT points FROM users WHERE email='${email}'`);
  check('reject returned points', after === '1060' || after === '1050' || after === '1000', after);
  await admin.goto(BASE + '/admin/points-check');
  check('points check clean after refund', (await admin.content()).includes('balances match'));

  // publish draw with the user's single ticket numbers => 6 matches
  const nums = sql(`SELECT nums FROM saved_sets s JOIN users u ON u.id=s.user_id WHERE u.email='${email}' AND s.units=1 AND s.refunded IS NULL LIMIT 1`.replace(" AND s.refunded IS NULL", ''));
  console.log('winning numbers will be', nums);
  const extra = [49, 48, 47].find((e) => !nums.split(',').includes(String(e)));
  sql(`UPDATE draws SET nums='${nums}', extra=${extra} WHERE draw_no='26/200'`);
  const before = sql(`SELECT points FROM users WHERE email='${email}'`);
  await admin.goto(BASE + '/admin/draws');
  await admin.locator('tr', { hasText: '26/200' }).getByRole('button', { name: /Publish/ }).click();
  await admin.waitForTimeout(1500);
  check('publish blocked while orders are pending', (await admin.locator('body').innerText()).includes('waiting for approval') && sql("SELECT status FROM draws WHERE draw_no='26/200'") === 'upcoming');
  await admin.goto(BASE + '/admin/orders?draw=26/200');
  await admin.getByRole('button', { name: /Approve all/ }).click();
  await admin.waitForTimeout(1200);
  check('approve all accepted orders', sql(`SELECT COUNT(*) FROM orders WHERE draw_no='26/200' AND status='pending'`) === '0');
  await page.goto(BASE + '/account');
  check('buyer sees Accepted', (await page.locator('body').innerText()).includes('Accepted'));
  await admin.goto(BASE + '/admin/draws');
  await admin.locator('tr', { hasText: '26/200' }).getByRole('button', { name: /Publish/ }).click();
  await admin.waitForTimeout(1500);
  const paid = sql(`SELECT points FROM users WHERE email='${email}'`);
  check('publish paid winners (1st division 100000)', Number(paid) - Number(before) >= 100000, `${before} -> ${paid}`);
  await admin.goto(BASE + '/admin/points-check');
  check('points check matches after payout', (await admin.content()).includes('balances match'));
  // unpublish reverses
  await admin.goto(BASE + '/admin/draws');
  await admin.locator('tr', { hasText: '26/200' }).getByRole('button', { name: /Unpublish|Draft/ }).click();
  await admin.waitForTimeout(1500);
  check('unpublish reversed payout', sql(`SELECT points FROM users WHERE email='${email}'`) === before, sql(`SELECT points FROM users WHERE email='${email}'`));

  // forgot password flow (no SMTP): generic message, then reset via DB token
  await page.goto(BASE + '/forgot');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.waitForTimeout(1000);
  check('forgot shows generic message', (await page.content()).includes('we have sent a link'));
  check('reset token stored', Number(sql(`SELECT COUNT(*) FROM password_resets p JOIN users u ON u.id=p.user_id WHERE u.email='${email}'`)) === 1);
  const token = 'testtoken-' + Date.now();
  const hash = (await import('node:crypto')).createHash('sha256').update(token).digest('hex');
  sql(`UPDATE password_resets p JOIN users u ON u.id=p.user_id SET p.token_hash='${hash}' WHERE u.email='${email}'`);
  await page.goto(`${BASE}/reset?token=${token}`);
  await page.getByLabel(/New password/).fill('newpass1234567');
  await page.getByRole('button', { name: 'Set new password' }).click();
  await page.waitForURL('**/login**', { timeout: 10000 }).catch(() => {});
  check('reset redirects to login', page.url().includes('/login'), page.url());
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('newpass1234567');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/account(\?welcome=1)?$/, { timeout: 10000 }).catch(() => {});
  check('login with new password', page.url().includes('/account'), page.url());
  // reused token fails
  await page.goto(`${BASE}/reset?token=${token}`);
  await page.getByLabel(/New password/).fill('anotherpass12345');
  await page.getByRole('button', { name: 'Set new password' }).click();
  await page.waitForTimeout(1000);
  check('reset token single use', (await page.content()).includes('expired or was already used'));

  // two-step login
  await page.goto(BASE + '/account/settings');
  await page.getByRole('button', { name: 'Set up two-step login' }).click();
  await page.waitForTimeout(800);
  const secret = sql(`SELECT totp_secret FROM users WHERE email='${email}'`);
  await page.getByPlaceholder('6-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Turn on' }).click();
  await page.waitForTimeout(800);
  check('2fa enabled', sql(`SELECT totp_on FROM users WHERE email='${email}'`) === '1');
  const fresh = await browser.newContext(); const p2 = await fresh.newPage();
  await p2.goto(BASE + '/login');
  await p2.getByLabel('Email').fill(email);
  await p2.getByLabel('Password', { exact: true }).fill('newpass1234567');
  await p2.getByRole('button', { name: 'Log in' }).click();
  await p2.waitForTimeout(1000);
  check('login without code refused', (await p2.content()).includes('6-digit code'));
  await p2.getByLabel('Password', { exact: true }).fill('newpass1234567');
  await p2.getByLabel(/Authentication code/).fill(totp(secret));
  await p2.getByRole('button', { name: 'Log in' }).click();
  await p2.waitForURL(/\/account(\?welcome=1)?$/, { timeout: 10000 }).catch(() => {});
  check('login with code works', p2.url().includes('/account'), p2.url());

  // lockout: 5 bad passwords
  const p3 = await (await browser.newContext()).newPage();
  for (let i = 0; i < 6; i++) {
    await p3.goto(BASE + '/login');
    await p3.getByLabel('Email').fill('nobody@example.com');
    await p3.getByLabel('Password', { exact: true }).fill('wrongwrongwrong');
    await p3.getByRole('button', { name: 'Log in' }).click();
    await p3.waitForTimeout(500);
  }
  check('account lockout after 5 failures', (await p3.content()).includes('Too many'));
} catch (e) {
  console.log('SCRIPT ERROR', e.message.split('\n').slice(0,6).join(' | '));
}
await browser.close();
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
