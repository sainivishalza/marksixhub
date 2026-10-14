import { chromium } from './pw.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const BASE = 'http://localhost:3333';
const sql = (q) => execSync(`mariadb -N -B ${process.env.E2E_DB || 'mh_test'} -e ${JSON.stringify(q)}`).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
sql("UPDATE draws SET status='upcoming', nums=NULL, extra=NULL, draw_date=CURDATE()+INTERVAL 2 DAY WHERE draw_no='26/200'");
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await b.newContext({ viewport: { width: 420, height: 1400 } });
const p = await ctx.newPage();
const email = `rc${Date.now()}@example.com`;
await p.goto(BASE + '/register');
await p.getByLabel('Email').fill(email);
await p.getByLabel('Password').fill('userpass123456');
await p.getByRole('checkbox').check();
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/\/account(\?welcome=1)?$/);
sql(`UPDATE users SET points=1000 WHERE email='${email}'`);

// order 1: one ticket
await p.goto(BASE + '/picker');
await p.getByRole('button', { name: 'Quick pick' }).first().click();
await p.waitForTimeout(1500);
await p.getByRole('button', { name: /Submit order/ }).click();
await p.waitForURL('**/account/orders/*');
const url1 = p.url();
check('after submitting, the receipt page opens', /\/account\/orders\/\d+$/.test(url1), url1);
await p.locator('img[alt^="Receipt for order"]').waitFor({ timeout: 10000 }).catch(() => {});
const id1 = url1.split('/').pop();
check('order number is draw + 4-digit sequence', /^Order No\. 26200\d{4}$/.test((await p.locator('h1').innerText()).trim()), await p.locator('h1').innerText());
check('pending order: no receipt yet, explanation shown', (await p.locator('body').innerText()).includes('Your receipt is issued here as soon as they do') && (await p.locator('img[alt^="Receipt for order"]').count()) === 0);
const pend = await ctx.request.get(`${BASE}/account/orders/${id1}/receipt`);
check('pending order: receipt file is not available', pend.status() === 404, String(pend.status()));
sql(`UPDATE orders SET status='accepted' WHERE id=${id1}`); // what the admin Approve button does
await p.reload();
await p.locator('img[alt^="Receipt for order"]').waitFor({ timeout: 10000 }).catch(() => {});
check('after approval the receipt image is shown', await p.locator('img[alt^="Receipt for order"]').isVisible());
check('download button present', (await p.getByRole('link', { name: /Download receipt/ }).getAttribute('href')).includes('download=1'));
const r1 = await ctx.request.get(`${BASE}/account/orders/${id1}/receipt`);
const png1 = await r1.body();
check('receipt is a PNG', r1.status() === 200 && r1.headers()['content-type'] === 'image/png' && png1.subarray(1, 4).toString() === 'PNG', `${r1.status()} ${r1.headers()['content-type']} ${png1.length}B`);
const h1 = png1.readUInt32BE(20);
fs.writeFileSync('receipt1.png', png1);
const d1 = await ctx.request.get(`${BASE}/account/orders/${id1}/receipt?download=1`);
check('download variant is an attachment', (d1.headers()['content-disposition'] ?? '').includes(`receipt-order-${id1}.png`), d1.headers()['content-disposition']);

// order 2: three tickets (quick pick x3) => taller receipt
await p.goto(BASE + '/picker');
await p.getByRole('tab', { name: 'Quick pick' }).click();
await p.getByLabel(/How many quick pick/).fill('3');
await p.getByRole('button', { name: /Add 3 random/ }).click();
await p.getByRole('button', { name: /Submit order/ }).click();
await p.waitForURL('**/account/orders/*');
const id2 = p.url().split('/').pop();
sql(`UPDATE orders SET status='accepted' WHERE id=${id2}`);
const png2 = await (await ctx.request.get(`${BASE}/account/orders/${id2}/receipt`)).body();
fs.writeFileSync('receipt3.png', png2);
check('more tickets make a taller receipt', png2.readUInt32BE(20) > h1, `${h1} -> ${png2.readUInt32BE(20)}`);
await p.reload();

// access control
const anon = await (await b.newContext()).newPage();
const ra = await anon.request.get(`${BASE}/account/orders/${id1}/receipt`);
check('anonymous cannot fetch a receipt', ra.status() === 404, String(ra.status()));
const other = await (await b.newContext()).newPage();
await other.goto(BASE + '/login');
await other.getByLabel('Email').fill('admin@example.com');
await other.getByLabel('Password', { exact: true }).fill('adminpass12345');
await other.getByRole('button', { name: 'Log in' }).click();
await other.waitForTimeout(1500);
const ro = await other.request.get(`${BASE}/account/orders/${id1}/receipt`);
check("another user cannot fetch someone else's receipt", ro.status() === 404, String(ro.status()));
const rn = await ctx.request.get(`${BASE}/account/orders/999999/receipt`);
check('unknown order is 404', rn.status() === 404);
await b.close();
console.log(`${pass}/${pass + fail} passed`);
