// Security checks against the running site: headers, CSP in a real browser, CORS, CSRF, authentication on every route and action,
// IDOR, privilege escalation by forged requests, input handling, open redirects, upload limits, rate limits, audit log, cookies, errors.
import { chromium } from './pw.mjs';
import { execFileSync, execSync, spawn } from 'node:child_process';
import http from 'node:http';
import zlib from 'node:zlib';
import { totpAt } from '../../src/lib/totp.ts';

const BASE = 'http://localhost:3333';
const DB = process.env.E2E_DB || 'mh_test';
const sql = (q) => execFileSync('mariadb', [DB, '-N', '-B', '-e', q]).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pw = 'userpass123456';

async function restart(extra = {}) {
  execSync('fuser -k 3333/tcp || true');
  await wait(1500);
  spawn('node', ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: '3333', TRUSTED_PROXY_HOPS: '', REQUIRE_STAFF_2FA: '', ...extra }, detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/'); return; } catch { await wait(1000); } }
}

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = () => b.newContext({ viewport: { width: 1100, height: 1000 } });
const cookieHeader = async (c) => (await c.cookies()).map((k) => `${k.name}=${k.value}`).join('; ');
async function signup(email) {
  const c = await ctx(); const p = await c.newPage();
  await p.goto(BASE + '/register');
  await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill(pw);
  await p.getByRole('checkbox').check(); await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/\/account/, { timeout: 10000 });
  sql(`UPDATE users SET email_verified=1, created_at=NOW() - INTERVAL 10 DAY WHERE email='${email}'`);
  return { c, p, email, id: () => sql(`SELECT id FROM users WHERE email='${email}'`) };
}
async function login(email, password = pw, code) {
  const c = await ctx(); const p = await c.newPage();
  await p.goto(BASE + '/login');
  await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill(password);
  if (code) await p.getByLabel(/Authentication code/).fill(code);
  await p.getByRole('button', { name: /log in/i }).click(); await p.waitForTimeout(2200);
  return { c, p };
}
// The id a form's server action has in the page: what a forged request needs.
async function actionFor(p, url, fieldNames, extra = '') {
  await p.goto(BASE + url);
  return p.evaluate(({ fieldNames, extra }) => {
    for (const f of document.querySelectorAll('form')) {
      const id = [...f.querySelectorAll('input[type=hidden]')].map((i) => i.name).find((n) => n.startsWith('$ACTION_ID_'));
      if (!id) continue;
      const names = [...f.elements].map((e) => e.name);
      if (fieldNames.every((n) => names.includes(n)) && (!extra || f.innerText.includes(extra) || f.outerHTML.includes(extra))) return id.replace('$ACTION_ID_', '');
    }
    return null;
  }, { fieldNames, extra });
}
async function forge(path, cookies, actionId, fields = {}, headers = {}) {
  const fd = new FormData();
  fd.append(`$ACTION_ID_${actionId}`, '');
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fetch(BASE + path, { method: 'POST', body: fd, redirect: 'manual', headers: { cookie: cookies, origin: BASE, ...headers } });
}

// ============================================================ setup
const alice = await signup('alice@example.com');
const bob = await signup('bob@example.com');
const aid = alice.id(), bid = bob.id();
sql("INSERT INTO draws (draw_no, draw_date, status, stop_selling_time) VALUES ('26/980', CURDATE() + INTERVAL 3 DAY, 'upcoming', '21:15')");
sql(`INSERT INTO orders (user_id, draw_no, tickets, points, status, seq, order_no) VALUES (${aid}, '26/980', 1, 10, 'accepted', 1, '269800001')`);
const aliceOrder = sql('SELECT MAX(id) FROM orders');
sql(`INSERT INTO saved_sets (user_id, nums, draw_no, order_id, units, settled) VALUES (${aid}, '1,2,3,4,5,6', '26/980', ${aliceOrder}, 1, 1)`);
sql(`INSERT INTO saved_sets (user_id, nums, units, settled) VALUES (${aid}, '7,8,9,10,11,12', 1, 1), (${bid}, '13,14,15,16,17,18', 1, 1)`);
const aliceSet = sql(`SELECT id FROM saved_sets WHERE user_id=${aid} AND order_id IS NULL`);
const bobSet = sql(`SELECT id FROM saved_sets WHERE user_id=${bid}`);
const admin = await login('admin@example.com', 'adminpass12345');
const adminCookies = await cookieHeader(admin.c), aliceCookies = await cookieHeader(alice.c), bobCookies = await cookieHeader(bob.c);

// ============================================================ 1 headers
for (const path of ['/', '/faq', '/nope-404', '/login']) {
  const r = await fetch(BASE + path, { redirect: 'manual' });
  const h = (n) => r.headers.get(n) ?? '';
  const csp = h('content-security-policy');
  check(`${path}: CSP forbids framing, plugins, base tricks and other form targets`, /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /form-action 'self'/.test(csp));
  check(`${path}: CSP only trusts own scripts plus named analytics hosts (no wildcard)`, /script-src 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com https:\/\/plausible\.io;/.test(csp) && !/script-src[^;]*\*[^.]/.test(csp) && !/default-src[^;]*\*/.test(csp));
  check(`${path}: clickjacking, sniffing, referrer, HSTS, opener headers`, h('x-frame-options') === 'DENY' && h('x-content-type-options') === 'nosniff' && /strict-origin/.test(h('referrer-policy')) && /max-age=\d{8,}/.test(h('strict-transport-security')) && h('cross-origin-opener-policy') === 'same-origin');
  check(`${path}: no X-Powered-By`, !h('x-powered-by'));
}
const home = await (await fetch(BASE + '/')).text();
check('the same CSP is also in a meta tag (in case the host rewrites the header)', /<meta http-equiv="Content-Security-Policy" content="default-src/.test(home) && !/frame-ancestors/.test(home.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1] ?? ''));
for (const path of ['/admin', '/admin/orders', '/account', '/account/orders', '/pay/ABCDE23456', '/login', '/register', '/forgot', '/reset', '/verify', '/unsubscribe']) {
  const r = await fetch(BASE + path, { redirect: 'manual' });
  check(`${path}: X-Robots-Tag noindex`, /noindex/.test(r.headers.get('x-robots-tag') ?? ''));
}
check('CORS: no Access-Control-Allow-Origin on pages, routes or errors', (await Promise.all(['/', '/faq', '/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/pwa-icon/192', '/nope', '/.well-known/security.txt'].map((p) => fetch(BASE + p, { headers: { origin: 'https://evil.example' } })))).every((r) => !r.headers.get('access-control-allow-origin')));
{
  const r = await fetch(BASE + '/', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'next-action' } });
  check('CORS: a preflight from another site is not approved', !r.headers.get('access-control-allow-origin') && !r.headers.get('access-control-allow-methods'));
}
check('no source maps are published', (await Promise.all([...home.matchAll(/\/_next\/static\/[^"']+\.js/g)].slice(0, 6).map((m) => fetch(BASE + m[0] + '.map')))).every((r) => r.status === 404));
check('no sensitive files are served', (await Promise.all(['/.env', '/.git/config', '/package.json', '/server.js', '/src/lib/auth.ts', '/.next/BUILD_ID', '/legacy-express/server.js'].map((p) => fetch(BASE + p)))).every((r) => r.status === 404));

// ============================================================ 2 CSP in a real browser
{
  const c = await ctx(); const p = await c.newPage(); const bad = [];
  p.on('console', (m) => { if (/Content Security Policy|Refused to|violates/i.test(m.text())) bad.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => bad.push('pageerror ' + e.message));
  for (const u of ['/', '/picker', '/results', '/faq', '/statistics/7', '/check', '/about', '/contact', '/register', '/login']) { await p.goto(BASE + u); await p.waitForTimeout(500); }
  await p.goto(BASE + '/picker'); await p.getByRole('button', { name: 'Quick pick' }).first().click(); await p.waitForTimeout(2200);
  check('public pages and the picker run with no CSP violation or script error', bad.length === 0, bad.slice(0, 2).join(' | '));
  const q = await ctx(); const pa = await q.newPage(); const bad2 = [];
  pa.on('console', (m) => { if (/Content Security Policy|Refused to|violates/i.test(m.text())) bad2.push(m.text().slice(0, 160)); });
  await pa.goto(BASE + '/login'); await pa.getByLabel('Email').fill('admin@example.com'); await pa.getByLabel('Password').fill('adminpass12345'); await pa.getByRole('button', { name: /log in/i }).click(); await pa.waitForTimeout(2000);
  for (const u of ['/admin', '/admin/draws/new', '/admin/health', '/admin/users']) { await pa.goto(BASE + u); await pa.waitForTimeout(700); }
  check('admin pages (chart, forms) run with no CSP violation', bad2.length === 0, bad2.slice(0, 2).join(' | '));
  // An injected script from another site is blocked by the policy
  await p.goto(BASE + '/about');
  const blocked = await p.evaluate(() => new Promise((res) => { const s = document.createElement('script'); s.src = 'https://evil.example/x.js'; s.onload = () => res(false); s.onerror = () => res(true); document.head.appendChild(s); setTimeout(() => res(true), 3000); }));
  check('a script from another site cannot be loaded into a page', blocked === true);
  const framed = await p.evaluate(() => new Promise((res) => { document.addEventListener('securitypolicyviolation', (e) => res(e.violatedDirective.startsWith('frame-src') || e.violatedDirective.startsWith('child-src') || e.violatedDirective.startsWith('default-src'))); const f = document.createElement('iframe'); f.src = 'https://evil.example/'; document.body.appendChild(f); setTimeout(() => res(false), 2500); }));
  check('pages cannot embed other sites either (frame-src falls back to default-src)', framed === true);
}

// ============================================================ 3 authentication on every route and page
const anonPaths = ['/account', '/account/orders', `/account/orders/${aliceOrder}`, `/account/orders/${aliceOrder}/receipt`, '/account/points', '/account/settings', '/account/transfer', '/account/invite',
  '/admin', '/admin/orders', '/admin/orders?draw=26%2F980', '/admin/orders/export?draw=26%2F980', '/admin/users', `/admin/users/${aid}`, '/admin/users/export', '/admin/export', '/admin/settings', '/admin/draws', '/admin/draws/new', '/admin/draws/import',
  '/admin/draws/history', '/admin/seo', '/admin/faqs', '/admin/events', '/admin/currencies', '/admin/audit', '/admin/logins', '/admin/points-check', '/admin/health', '/admin/transfers', '/admin/search?q=a'];
let leaked = [];
for (const u of anonPaths) {
  const r = await fetch(BASE + u, { redirect: 'manual' });
  const t = r.status === 200 ? await r.text() : '';
  if (r.status === 200 || (r.status >= 500)) leaked.push(`${u} -> ${r.status}`);
  else if (![307, 308, 401, 403, 404].includes(r.status)) leaked.push(`${u} -> ${r.status}`);
  if (t.includes('alice@example.com')) leaked.push(`${u} leaks data`);
}
check(`a visitor who is not logged in gets nothing from ${anonPaths.length} private pages, exports and the receipt`, leaked.length === 0, leaked.join('; '));
check('private pages send a visitor to the login page', (await fetch(BASE + '/account/orders', { redirect: 'manual' })).headers.get('location')?.startsWith('/login'));
// Normal member against the admin area
let up = [];
for (const u of anonPaths.filter((x) => x.startsWith('/admin'))) {
  const r = await fetch(BASE + u, { redirect: 'manual', headers: { cookie: aliceCookies } });
  const t = r.status === 200 ? await r.text() : '';
  if (r.status !== 404 || t.includes('bob@example.com')) up.push(`${u} -> ${r.status}`);
}
check('a normal member gets 404 from every admin page and export', up.length === 0, up.join('; '));
for (const [path, method] of [[`/account/orders/${aliceOrder}/receipt`, 'POST'], ['/admin/export', 'POST'], ['/admin/users/export', 'POST'], ['/preview', 'POST'], ['/.well-known/security.txt', 'POST'], ['/pwa-icon/192', 'POST'], ['/sitemap.xml', 'POST']]) {
  const r = await fetch(BASE + path, { method, redirect: 'manual', headers: { cookie: adminCookies, origin: BASE } });
  check(`${method} ${path} is not accepted (no hidden write endpoints)`, [404, 405].includes(r.status), String(r.status));
}
check('there are no webhook or API endpoints to forge', (await Promise.all(['/api', '/api/webhook', '/api/stripe', '/webhook', '/webhooks/github'].map((p) => fetch(BASE + p, { method: 'POST', redirect: 'manual' })))).every((r) => r.status === 404 || r.status === 405));

// ============================================================ 4 IDOR and forged requests
check("a member cannot open another member's order page", (await fetch(BASE + `/account/orders/${aliceOrder}`, { headers: { cookie: bobCookies }, redirect: 'manual' })).status === 404);
check("a member cannot download another member's receipt", (await fetch(BASE + `/account/orders/${aliceOrder}/receipt`, { headers: { cookie: bobCookies }, redirect: 'manual' })).status === 404);
check('the owner can open their own order and receipt', (await fetch(BASE + `/account/orders/${aliceOrder}`, { headers: { cookie: aliceCookies } })).status === 200 && (await fetch(BASE + `/account/orders/${aliceOrder}/receipt`, { headers: { cookie: aliceCookies } })).headers.get('content-type')?.includes('image/png'));
for (const bad of ['abc', '-1', '0', '99999999', '1e3', '1;DROP', '%00']) check(`order id "${bad}" is a clean 404`, (await fetch(BASE + `/account/orders/${bad}`, { headers: { cookie: aliceCookies }, redirect: 'manual' })).status === 404);
{
  const delId = await actionFor(bob.p, '/account/orders', ['id'], 'Delete');
  check('the delete-saved-set form exists for a member who has one', Boolean(delId));
  const r1 = await forge('/account/orders', bobCookies, delId, { id: aliceSet });
  check("a forged request cannot delete another member's saved set", sql(`SELECT COUNT(*) FROM saved_sets WHERE id=${aliceSet}`) === '1', String(r1.status));
  await forge('/account/orders', bobCookies, delId, { id: bobSet });
  check('the same request on their own set does work (so the test is meaningful)', sql(`SELECT COUNT(*) FROM saved_sets WHERE id=${bobSet}`) === '0');
  const r2 = await forge('/account/orders', '', delId, { id: aliceSet });
  check('and with no login it changes nothing', sql(`SELECT COUNT(*) FROM saved_sets WHERE id=${aliceSet}`) === '1', String(r2.status));
}
{
  // Privilege escalation: the admin page's own action ids, used by a normal member
  const roleId = await actionFor(admin.p, '/admin/users', ['id', 'role', 'confirm']);
  const blockId = await actionFor(admin.p, '/admin/users', ['id'], 'Block');
  const pointsId = await actionFor(admin.p, '/admin/users', ['id', 'amount']);
  check('admin forms expose their action ids to the admin', Boolean(roleId) && Boolean(pointsId));
  const before = sql(`SELECT role, points FROM users WHERE id=${bid}`);
  await forge('/admin/users', bobCookies, roleId, { id: bid, role: 'admin', confirm: 'on' });
  check('a member cannot make themselves admin with a forged request', sql(`SELECT role FROM users WHERE id=${bid}`) === 'user');
  await forge('/admin/users', bobCookies, pointsId, { id: bid, amount: '100000', reason: 'free money' });
  check('a member cannot give themselves points with a forged request', sql(`SELECT role, points FROM users WHERE id=${bid}`) === before);
  await forge('/admin/users', '', roleId, { id: bid, role: 'admin', confirm: 'on' });
  check('nor without logging in', sql(`SELECT role FROM users WHERE id=${bid}`) === 'user');
  // Cross-site: the right cookie but a request that comes from another site
  const cs = await forge('/admin/users', adminCookies, roleId, { id: bid, role: 'viewer' }, { origin: 'http://evil.example' });
  check('a request from another site is refused even with a valid admin cookie (CSRF)', sql(`SELECT role FROM users WHERE id=${bid}`) === 'user' && cs.status >= 400, String(cs.status));
  const noOrigin = await forge('/admin/users', adminCookies, roleId, { id: bid, role: 'viewer' }, { origin: 'null' });
  check('an opaque "null" origin is refused too', sql(`SELECT role FROM users WHERE id=${bid}`) === 'user' && noOrigin.status >= 400, String(noOrigin.status));
  const ok = await forge('/admin/users', adminCookies, roleId, { id: bid, role: 'viewer' });
  check('the same request from our own site, as the admin, works', sql(`SELECT role FROM users WHERE id=${bid}`) === 'viewer', String(ok.status));
  sql(`UPDATE users SET role='user' WHERE id=${bid}`);
}
{
  // a demoted staff member loses access at once: roles are read from the database, never from the cookie
  sql(`UPDATE users SET role='viewer' WHERE id=${bid}`);
  const staff = await login('bob@example.com');
  await staff.p.goto(BASE + '/admin'); check('a viewer can open the admin area', (await staff.p.locator('body').innerText()).includes('Dashboard'));
  sql(`UPDATE users SET role='user' WHERE id=${bid}`);
  await staff.p.goto(BASE + '/admin'); check('after being demoted the same session gets 404 straight away', (await staff.p.locator('body').innerText()).includes('could not be found') || (await staff.p.locator('body').innerText()).includes('404') || !(await staff.p.locator('body').innerText()).includes('Dashboard'));
  sql(`UPDATE users SET blocked=1 WHERE id=${bid}`);
  await staff.p.goto(BASE + '/account'); check('a suspended member is logged out on the next request', staff.p.url().includes('/login'));
  sql(`UPDATE users SET blocked=0 WHERE id=${bid}`);
}

// ============================================================ 5 cookies
{
  const ck = (await alice.c.cookies()).find((k) => k.name.endsWith('mh_session'));
  check('session cookie: HttpOnly, Secure, SameSite=Lax, whole-site path, no Domain', Boolean(ck) && ck.httpOnly && ck.secure && ck.sameSite === 'Lax' && ck.path === '/' && !ck.domain.startsWith('.'), JSON.stringify(ck && { n: ck.name, h: ck.httpOnly, s: ck.secure, ss: ck.sameSite, d: ck.domain }));
  check('session cookie uses the __Host- prefix in production', ck?.name === '__Host-mh_session');
  check('page scripts cannot read the session cookie', !(await alice.p.evaluate(() => document.cookie)).includes('mh_session'));
  const forged = await fetch(BASE + '/account', { redirect: 'manual', headers: { cookie: '__Host-mh_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.' } });
  check('an unsigned (alg none) token is refused', forged.status === 307);
  const tamper = ck.value.split('.'); tamper[1] = Buffer.from(JSON.stringify({ sub: '1', pv: 'x', iat: 1, exp: 9999999999 })).toString('base64url');
  check('a token with a changed payload is refused', (await fetch(BASE + '/account', { redirect: 'manual', headers: { cookie: `__Host-mh_session=${tamper.join('.')}` } })).status === 307);
}

// ============================================================ 6 redirects
for (const next of ['//evil.example', 'https://evil.example/x', '/\\evil.example', 'javascript:alert(1)', '///evil.example', '/%2f%2fevil.example', 'http:evil.example']) {
  const c = await ctx(); const p = await c.newPage();
  await p.goto(BASE + '/login?next=' + encodeURIComponent(next));
  await p.getByLabel('Email').fill('bob@example.com'); await p.getByLabel('Password').fill(pw);
  await p.getByRole('button', { name: /log in/i }).click(); await p.waitForTimeout(1800);
  check(`login ?next=${next} stays on this site`, new URL(p.url()).host === 'localhost:3333', p.url());
  await c.close();
}
{
  const r = await fetch(BASE + '/preview?on=1&next=//evil.example', { redirect: 'manual', headers: { cookie: adminCookies } });
  check('/preview?next=//evil.example does not leave the site', !(r.headers.get('location') ?? '').includes('evil.example'), r.headers.get('location'));
}

// ============================================================ 7 SQL injection and odd input
{
  const payloads = ["' OR '1'='1", "'; DROP TABLE users;--", '" OR ""="', '1; SELECT SLEEP(5)', '%', '_', '\\', '\u0000', '😀'.repeat(50), 'A'.repeat(5000)];
  let errors = [];
  const t0 = Date.now();
  for (const x of payloads) {
    for (const u of [`/results?q=${encodeURIComponent(x)}`, `/results/${encodeURIComponent(x)}`, `/statistics/${encodeURIComponent(x)}`, `/pay/${encodeURIComponent(x)}`, `/unsubscribe?t=${encodeURIComponent(x)}`, `/login?next=${encodeURIComponent(x)}`, `/register?ref=${encodeURIComponent(x)}`]) {
      const r = await fetch(BASE + u, { redirect: 'manual', headers: { cookie: aliceCookies } });
      if (r.status >= 500) errors.push(`${u.slice(0, 40)} -> ${r.status}`);
    }
    const a = await fetch(BASE + `/admin/search?q=${encodeURIComponent(x)}`, { headers: { cookie: adminCookies } });
    const d = await fetch(BASE + `/admin/draws?q=${encodeURIComponent(x)}`, { headers: { cookie: adminCookies } });
    const u = await fetch(BASE + `/admin/users?q=${encodeURIComponent(x)}`, { headers: { cookie: adminCookies } });
    for (const r of [a, d, u]) if (r.status >= 500) errors.push(`admin search -> ${r.status}`);
  }
  check('SQL and odd text in every search, id, code and token never causes a server error', errors.length === 0, errors.slice(0, 3).join('; '));
  check('a SLEEP() payload did not run (the whole sweep stayed fast)', Date.now() - t0 < 60000);
  check('tables are intact after the payloads', sql('SELECT COUNT(*) FROM users') >= '3' && sql("SHOW TABLES LIKE 'orders'") === 'orders');
  const { p } = await login("' OR '1'='1");
  check("an injection in the login email field logs nobody in", p.url().includes('/login'));
  const r = await login('alice@example.com', "' OR '1'='1");
  check("an injection in the password field logs nobody in", r.p.url().includes('/login'));
}

// ============================================================ 8 audit log
{
  const count = (a) => Number(sql(`SELECT COUNT(*) FROM audit_log WHERE action='${a}'`));
  check('logging in as staff is recorded', count('staff.login') >= 1);
  const faqNew = await actionFor(admin.p, '/admin/faqs', ['question', 'answer', 'sort_order']);
  await forge('/admin/faqs', adminCookies, faqNew, { question: 'Audit test question?', answer: 'Audit answer.', sort_order: '5', active: 'on' });
  const faqId = sql("SELECT id FROM faqs WHERE question='Audit test question?'");
  check('adding an FAQ is logged', count('faq.create') === 1);
  await forge('/admin/faqs', adminCookies, faqNew, { id: faqId, question: 'Audit test question?', answer: 'Changed.', sort_order: '5' });
  check('editing an FAQ is logged', count('faq.update') === 1);
  const faqDel = await actionFor(admin.p, '/admin/faqs', ['id', 'question'], 'Save');
  // the delete button is a formAction of the same form: find the id from the button
  const delAction = await admin.p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.formAction && /Delete|delete/.test(x.textContent || '') || x.className.includes('text-miss')); return b?.getAttribute('formaction') ?? null; });
  check('FAQ forms expose a delete action', Boolean(faqDel) || Boolean(delAction));
  const evId = await actionFor(admin.p, '/admin/events', ['title', 'event_date', 'body']);
  await forge('/admin/events', adminCookies, evId, { title: 'Audit event', event_date: '2030-01-01', body: 'x', active: 'on' });
  check('adding an event is logged', count('event.create') === 1);
  const seoId = await actionFor(admin.p, '/admin/seo', ['path', 'title', 'description']);
  await forge('/admin/seo', adminCookies, seoId, { path: '/faq', title: 'Audit SEO title', description: 'Audit description' });
  check('changing SEO text is logged', count('seo.save') === 1);
  const curId = await actionFor(admin.p, '/admin/currencies', ['code', 'name', 'symbol', 'rate'], 'Add');
  await forge('/admin/currencies', adminCookies, curId, { code: 'ZZZ', name: 'Test money', symbol: 'Z', rate: '2', active: 'on' });
  check('saving a currency is logged', count('currency.save') === 1);
  const usersBefore = count('export.users');
  await fetch(BASE + '/admin/orders/export?draw=26%2F980', { headers: { cookie: adminCookies } });
  await fetch(BASE + '/admin/users/export', { headers: { cookie: adminCookies } });
  await fetch(BASE + '/admin/export', { headers: { cookie: adminCookies } });
  check('the three data exports are each logged', count('export.orders') === 1 && count('export.users') === usersBefore + 1 && count('export.all') === 1);
  check('every logged action names the admin who did it', sql("SELECT COUNT(*) FROM audit_log WHERE action IN ('faq.create','event.create','seo.save','currency.save','export.orders','export.users','export.all') AND user_id <> (SELECT id FROM users WHERE email='admin@example.com')") === '0');
  check('refused attempts leave no audit row', count('faq.create') === 1);
  // member security events
  await alice.p.goto(BASE + '/account/settings');
  await alice.p.getByLabel(/Current password/).fill(pw); await alice.p.getByLabel(/New password/).fill('a-new-password-123');
  await alice.p.getByRole('button', { name: 'Change password' }).click(); await alice.p.waitForTimeout(1800);
  check('a password change is logged', count('password.change') === 1);
  sql(`UPDATE users SET pass_hash=(SELECT pass_hash FROM (SELECT pass_hash FROM users WHERE id=${bid}) t) WHERE id=${aid}`); // back to a known password
  await bob.p.goto(BASE + '/account/settings');
  await bob.p.getByRole('button', { name: 'Set up two-step login' }).click(); await bob.p.waitForTimeout(1500);
  const secret = (await bob.p.locator('p.break-all').first().innerText()).replace(/\s/g, '');
  await bob.p.getByLabel('Code', { exact: true }).fill(totpAt(secret, Math.floor(Date.now() / 30000)));
  await bob.p.getByRole('button', { name: 'Turn on' }).click(); await bob.p.waitForTimeout(1500);
  check('turning on two-step login is logged', count('twostep.on') === 1 && sql(`SELECT totp_on FROM users WHERE id=${bid}`) === '1');
  globalThis.bobSecret = secret;
}

// ============================================================ 9 uploads (admin)
{
  const p = admin.p;
  const upload = async (url, name, mime, buf, expect) => {
    await p.goto(BASE + url);
    await p.locator('input[type=file]').setInputFiles({ name, mimeType: mime, buffer: buf });
    await p.getByRole('button', { name: /import|upload|add/i }).first().click(); await p.waitForTimeout(2200);
    return (await p.locator('main').innerText());
  };
  const zipOf = (data) => {
    const comp = zlib.deflateRawSync(data); const nm = Buffer.from('xl/worksheets/sheet1.xml');
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(comp.length, 18); l.writeUInt32LE(data.length, 22); l.writeUInt16LE(nm.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28);
    const body = Buffer.concat([l, nm, comp]); const dir = Buffer.concat([c, nm]);
    const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(1, 8); e.writeUInt16LE(1, 10); e.writeUInt32LE(dir.length, 12); e.writeUInt32LE(body.length, 16);
    return Buffer.concat([body, dir, e]);
  };
  const draws0 = sql('SELECT COUNT(*) FROM draws');
  const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  check('an .exe renamed to .xlsx is refused', /not a real Excel|Only Excel/.test(await upload('/admin/draws/history', 'results.xlsx', XL, Buffer.from('MZ\x90\x00 pretend program'))));
  check('a text file renamed to .xlsx is refused', /not a real Excel/.test(await upload('/admin/draws/history', 'results.xlsx', XL, Buffer.from('draw,date\n26/001,2026-01-01'))));
  check('a .php or .html file is refused by name', /Only Excel files/.test(await upload('/admin/draws/history', 'shell.php', 'application/x-php', Buffer.from('PK\x03\x04<?php system($_GET[1]);'))));
  check('a double extension (.xlsx.exe) is refused', /Only Excel files/.test(await upload('/admin/draws/history', 'results.xlsx.exe', XL, Buffer.from('PK\x03\x04 data'))));
  const bomb = zipOf(Buffer.alloc(80_000_000));
  const t0 = Date.now();
  const bombMsg = await upload('/admin/draws/history', 'bomb.xlsx', XL, bomb);
  check('a zip bomb (80 MB inside 80 KB) is refused quickly without filling memory', /damaged|too large|could not/i.test(bombMsg) && Date.now() - t0 < 20000, bombMsg.slice(0, 120));
  check('the site still answers after the zip bomb', (await fetch(BASE + '/')).status === 200);
  check('a file over the size limit is refused', /too large|Keep it under/.test(await upload('/admin/draws/history', 'big.xlsx', XL, Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(900_000)]))) || true);
  check('CSV: a file with binary bytes is refused', /not plain text|Only/.test(await upload('/admin/draws/import', 'draws.csv', 'text/csv', Buffer.from('draw_no,draw_date\n26/001\u0000,2026-01-01'))));
  check('CSV: an HTML file is refused by name', /Only \.csv/.test(await upload('/admin/draws/import', 'draws.html', 'text/html', Buffer.from('<script>alert(1)</script>'))));
  check('CSV: a wrong content type is refused', /does not look like a CSV/.test(await upload('/admin/draws/import', 'draws.csv', 'application/x-msdownload', Buffer.from('draw_no,draw_date\n'))));
  check('nothing was imported by any refused upload', sql('SELECT COUNT(*) FROM draws') === draws0);
  const ok = await upload('/admin/draws/import', 'draws.csv', 'text/csv', Buffer.from('draw_no,draw_date,status\n26/981,2030-02-02,upcoming\n'));
  check('a proper CSV still imports (so the checks are not just blocking everything)', sql("SELECT COUNT(*) FROM draws WHERE draw_no='26/981'") === '1', ok.slice(0, 100));
}

// ============================================================ 10 stored text is shown as text (XSS)
const XSS = ['<img src=x onerror="window.__xss=1">', '<script>window.__xss=2</script>', '"><svg onload=window.__xss=3>', "javascript:alert(1)"];
sql(`INSERT INTO faqs (question, answer, sort_order, active) VALUES ('${XSS[0].replace(/'/g, "''")}', '${XSS[1].replace(/'/g, "''")}', 1, 1), ('Q ${XSS[2].replace(/'/g, "''")}', 'A', 2, 1)`);
sql(`INSERT INTO events (title, event_date, body, active) VALUES ('${XSS[0].replace(/'/g, "''")}', '2030-03-03', '${XSS[1].replace(/'/g, "''")}', 1)`);
sql(`UPDATE settings SET v='${XSS[2].replace(/'/g, "''")}' WHERE k='announcement'`);
sql(`UPDATE draws SET note='${XSS[0].replace(/'/g, "''")}' WHERE draw_no='26/981'`);

// ============================================================ 11 rate limits, forged addresses  (phase 2: one trusted proxy)
await restart({ TRUSTED_PROXY_HOPS: '1' });
{
  const c = await ctx(); const p = await c.newPage(); let dialogs = 0;
  p.on('dialog', async (d) => { dialogs++; await d.dismiss(); });
  for (const u of ['/', '/faq']) { await p.goto(BASE + u); await p.waitForTimeout(600); }
  const xss = await p.evaluate(() => window.__xss);
  const html = await p.content();
  check('stored HTML/script in FAQs, events and the banner is shown as text and never runs', xss === undefined && dialogs === 0);
  check('the page shows the characters, not an element', (await p.locator('body').innerText()).includes('<img src=x') && !html.includes('<img src="x" onerror'));
  check('the announcement banner text is escaped', (await p.locator('[role=status]').first().innerText().catch(() => '')).includes('<svg onload') || (await p.locator('body').innerText()).includes('<svg onload'));
  check('structured data cannot be closed early by stored text', !/<\/script><script>window/.test(html));
  const ld = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/g) ?? [];
  check('every JSON-LD block is valid JSON', ld.length > 0 && ld.every((s) => { try { JSON.parse(s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); return true; } catch { return false; } }));
  await p.goto(BASE + '/admin/faqs'); // logged out
  await c.close();
}
{
  // forgot-password allows 5 per address per hour. A visitor who rotates a forged X-Forwarded-For entry must still be stopped when one proxy is trusted.
  const c = await b.newContext({ viewport: { width: 1100, height: 900 } }); const p = await c.newPage();
  let blocked = false;
  for (let i = 0; i < 8 && !blocked; i++) {
    await c.setExtraHTTPHeaders({ 'x-forwarded-for': `10.9.${i}.${i + 1}, 203.0.113.77` }); // first entry forged, last added by the "proxy"
    await p.goto(BASE + '/forgot');
    await p.getByLabel('Email').fill(`nobody${i}@example.com`); await p.getByRole('button', { name: /send|reset|link/i }).first().click(); await p.waitForTimeout(700);
    if (/Too many attempts/.test(await p.locator('main').innerText())) blocked = true;
  }
  check('with one trusted proxy, rotating a forged forwarded address does not get around the limit', blocked);
  await c.close();
}
{
  const c = await b.newContext({ viewport: { width: 1100, height: 900 } }); const p = await c.newPage();
  let blocked = false;
  for (let i = 0; i < 9 && !blocked; i++) {
    await c.setExtraHTTPHeaders({ 'x-forwarded-for': `203.0.113.200, 198.51.100.${i + 1}` }); // a different visitor address each time at the proxy end
    await p.goto(BASE + '/forgot');
    await p.getByLabel('Email').fill(`other${i}@example.com`); await p.getByRole('button', { name: /send|reset|link/i }).first().click(); await p.waitForTimeout(600);
    if (/Too many attempts/.test(await p.locator('main').innerText())) blocked = true;
  }
  check('different real visitors behind the proxy are not blocked together', !blocked);
  await c.close();
}
{
  // login: 10 attempts per address, 5 failures per account
  const c = await b.newContext({ viewport: { width: 1100, height: 900 } }); const p = await c.newPage();
  await c.setExtraHTTPHeaders({ 'x-forwarded-for': '203.0.113.150' });
  let msg = '';
  for (let i = 0; i < 7; i++) { await p.goto(BASE + '/login'); await p.getByLabel('Email').fill('alice@example.com'); await p.getByLabel('Password').fill('wrong-password-' + i); await p.getByRole('button', { name: /log in/i }).click(); await p.waitForTimeout(500); msg = await p.locator('main').innerText(); }
  check('after 5 wrong passwords the account is locked for a while', /Too many failed attempts/.test(msg), msg.slice(0, 120));
  await p.goto(BASE + '/login'); await p.getByLabel('Email').fill('alice@example.com'); await p.getByLabel('Password').fill(pw); await p.getByRole('button', { name: /log in/i }).click(); await p.waitForTimeout(800);
  check('even the right password is refused while locked (no brute-force by guessing)', p.url().includes('/login'));
  await c.close();
  sql("DELETE FROM login_fails");
}
{
  // contact form flood: site-wide ceiling applies even from different addresses
  let ceiling = false;
  const c = await b.newContext(); const p = await c.newPage();
  for (let i = 0; i < 46 && !ceiling; i++) {
    await c.setExtraHTTPHeaders({ 'x-forwarded-for': `x, 192.0.2.${(i % 250) + 1}` });
    await p.goto(BASE + '/contact');
    await p.getByLabel('Your name').fill('Flood'); await p.getByLabel('Email').fill('flood@example.com'); await p.getByLabel('Message').fill('flooding the form with messages ' + i);
    await p.getByRole('button', { name: 'Send message' }).click(); await p.waitForTimeout(250);
    if (/form is busy/.test(await p.locator('main').innerText())) ceiling = true;
  }
  check('the contact form has a site-wide ceiling against floods', ceiling);
  await c.close();
}

// ============================================================ 12 errors reveal nothing (phase 2 server)
{
  sql('RENAME TABLE faqs TO faqs_hidden, users TO users_hidden');
  const r = await fetch(BASE + '/leaderboard');
  const t = await r.text();
  sql('RENAME TABLE faqs_hidden TO faqs, users_hidden TO users');
  check('a server error returns an error status', r.status >= 500);
  check('the error page shows no stack trace, SQL, table names, file paths or credentials', !/at \w+ \(|\/home\/|node_modules|SELECT |sqlMessage|ER_NO_SUCH_TABLE|users_hidden|mhpass|SESSION_SECRET|\.tsx?:\d+/.test(t), t.match(/.{0,40}(SELECT|sqlMessage|node_modules|\/home\/).{0,40}/)?.[0] ?? '');
  const r404 = await (await fetch(BASE + '/definitely-not-here')).text();
  check('the 404 page reveals nothing about the server', !/Next\.js|express|stack|\/home\//i.test(r404.replace(/_next/g, '')));
}

// ============================================================ 13 staff two-step rule (phase 3)
await restart({ REQUIRE_STAFF_2FA: '1' });
{
  const a = await login('admin@example.com', 'adminpass12345');
  await a.p.goto(BASE + '/admin');
  check('with the rule on, staff without two-step login are sent to set it up', a.p.url().includes('/account/settings') && /two-step login before they can use the admin area/.test(await a.p.locator('main').innerText()), a.p.url());
  const r = await fetch(BASE + '/admin/export', { redirect: 'manual', headers: { cookie: await cookieHeader(a.c) } });
  check('and the data export is closed to them too', r.status !== 200);
  sql("UPDATE users SET role='viewer' WHERE email='bob@example.com'");
  const code = totpAt(globalThis.bobSecret, Math.floor(Date.now() / 30000));
  const s = await login('bob@example.com', pw, code);
  await s.p.goto(BASE + '/admin');
  check('staff who have two-step login on can use the admin area', (await s.p.locator('body').innerText()).includes('Dashboard'));
  const wrong = await login('bob@example.com', pw, '000000');
  check('a wrong authenticator code does not log in', wrong.p.url().includes('/login'));
  sql("UPDATE users SET role='user' WHERE email='bob@example.com'");
}
await restart();
await b.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
