// Web-layer tests against an in-memory stand-in for ../src/db (no MySQL needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { hashPassword } = require('../src/security');

const state = { users: [], saved: [], lastDrawSave: null };
const settings = [{ k: 'site_name', v: 'Mark Six Hub' }, { k: 'site_description', v: 'Desc' }, { k: 'announcement', v: '' }];
const currencies = [
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: '1.000000' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: '11.400000' },
];
const draw = { id: 1, draw_no: '26/001', draw_date: '2026-10-06', status: 'published', nums: '3,12,25,31,40,49', extra: 7, est_jackpot_hkd: 0, note: null };
const upcoming = { id: 2, draw_no: '26/002', draw_date: '2026-10-09', status: 'upcoming', nums: null, extra: null, est_jackpot_hkd: 8000000, note: 'Snowball' };
const prizes = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ draw_id: 1, division: d, winners: d, prize_hkd: 1000000 / d }));

const rules = [
  [/SELECT k, v FROM settings/, () => settings],
  [/FROM currencies WHERE active=1/, () => currencies],
  [/SELECT id, email, role, currency FROM users WHERE id=/, ([id]) => state.users.filter((u) => u.id === id)],
  [/SELECT \* FROM users WHERE email=/, ([e]) => state.users.filter((u) => u.email === e)],
  [/SELECT id FROM users WHERE email=/, ([e]) => state.users.filter((u) => u.email === e)],
  [/INSERT INTO users/, ([email, hash]) => (state.users.push({ id: state.users.length + 1, email, pass_hash: hash, role: 'user', currency: 'HKD' }), { insertId: state.users.length })],
  [/FROM saved_sets WHERE user_id=\? ORDER/, () => state.saved],
  [/COUNT\(\*\) AS n, SUM/, () => [{ n: 2, pub: 1 }]],
  [/COUNT\(\*\) AS n FROM users/, () => [{ n: state.users.length }]],
  [/COUNT\(\*\) AS n FROM saved_sets/, () => [{ n: 0 }]],
  [/COUNT\(\*\) AS n FROM draws/, () => [{ n: 1 }]],
  [/LIMIT 6 OFFSET 1/, () => []],
  [/status='published' ORDER BY draw_date DESC, id DESC LIMIT 1/, () => [draw]],
  [/status='published' ORDER BY draw_date DESC, id DESC LIMIT \? OFFSET/, () => [draw]],
  [/draw_no=\? AND status='published'/, ([no]) => (no === '26/001' ? [draw] : [])],
  [/SELECT nums FROM draws/, () => [{ nums: draw.nums }]],
  [/SELECT draw_no, draw_date FROM draws/, () => [draw]],
  [/status='upcoming' ORDER BY draw_date/, () => [upcoming]],
  [/FROM draw_prizes/, () => prizes],
  [/FROM events/, () => [{ id: 1, title: 'Lunar New Year Draw', event_date: '2027-02-06', body: 'Special', active: 1 }]],
  [/SELECT \* FROM draws ORDER BY/, () => [draw, upcoming]],
  [/SELECT \* FROM currencies ORDER BY/, () => currencies.map((c) => ({ ...c, active: 1 }))],
  [/created_at FROM users ORDER BY/, () => state.users.map((u) => ({ ...u, created_at: '2026-10-07 00:00:00' }))],
];
const fake = {
  q: async (sql, p) => {
    const r = rules.find(([re]) => re.test(sql));
    if (!r) throw new Error('Unmocked SQL: ' + sql);
    return r[1](p || []);
  },
  tx: async (fn) => fn(async (sql, p) => ((state.lastDrawSave = [sql, p]), { insertId: 9 })),
  cached: async (k, ttl, load) => load(),
  bust: () => {},
};
fake.one = async (sql, p) => (await fake.q(sql, p))[0] || null;
const dbPath = require.resolve('../src/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fake };

const app = require('../src/app');
let server, base;
test.before(async () => {
  state.users.push({ id: 1, email: 'admin@x.com', pass_hash: await hashPassword('admin-password-1'), role: 'admin', currency: 'HKD' });
  await new Promise((ok) => (server = app.listen(0, ok)));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const jar = () => {
  const c = {};
  return {
    async go(url, opts = {}) {
      const headers = { ...opts.headers, cookie: Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; ') };
      const res = await fetch(base + url, { redirect: 'manual', ...opts, headers });
      for (const sc of res.headers.getSetCookie()) {
        const [kv] = sc.split(';');
        const i = kv.indexOf('=');
        c[kv.slice(0, i)] = kv.slice(i + 1);
      }
      return res;
    },
    form(url, data) {
      return this.go(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) });
    },
  };
};
const tokenOf = (html) => /name="_csrf" value="([a-f0-9]+)"/.exec(html)[1];

test('public pages render with data, security headers and no inline styles/scripts', async () => {
  const j = jar();
  for (const url of ['/', '/results', '/results/26-001', '/upcoming', '/pick', '/pick?go=1&mode=hot&count=3&fav=7,18', '/statistics', '/how-to-play', '/disclaimer', '/login', '/register']) {
    const res = await j.go(url);
    assert.equal(res.status, 200, url);
    const html = await res.text();
    assert.match(html, /<title>[^<]{5,}<\/title>/, url);
    assert.doesNotMatch(html, /\sstyle=|<style|<script(?![^>]*application\/ld\+json)/, `inline code on ${url}`);
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
  }
  const home = await (await j.go('/')).text();
  assert.match(home, /26\/001/);
  assert.match(home, /HK\$8,000,000/);
  assert.equal((home.match(/<h1/g) || []).length, 1);
});

test('anonymous page views set no cookies', async () => {
  const res = await fetch(base + '/results');
  assert.equal(res.headers.getSetCookie().length, 0);
});

test('currency switch converts prizes', async () => {
  const j = jar();
  const r = await j.go('/currency?c=INR&next=/results/26-001');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/results/26-001');
  assert.match(await (await j.go('/results/26-001')).text(), /₹/);
  const bad = await j.go('/currency?c=INR&next=//evil.com');
  assert.equal(bad.headers.get('location'), '/');
});

test('unknown draw and bad slugs are 404, pick page has 3 sets', async () => {
  assert.equal((await fetch(base + '/results/26-999')).status, 404);
  assert.equal((await fetch(base + '/results/abc')).status, 404);
  const html = await (await fetch(base + '/pick?go=1&count=3')).text();
  assert.equal((html.match(/class="balls"/g) || []).length, 3);
});

test('robots.txt and sitemap.xml', async () => {
  assert.match(await (await fetch(base + '/robots.txt')).text(), /Sitemap: .*\/sitemap\.xml/);
  const sm = await (await fetch(base + '/sitemap.xml')).text();
  assert.match(sm, /\/results\/26-001/);
  assert.match(sm, /<urlset/);
});

test('static assets and security.txt are served', async () => {
  for (const u of ['/styles.css', '/favicon.svg', '/manifest.webmanifest', '/.well-known/security.txt']) {
    assert.equal((await fetch(base + u)).status, 200, u);
  }
});

test('register enforces CSRF, validates, logs in', async () => {
  const j = jar();
  const token = tokenOf(await (await j.go('/register')).text());
  assert.equal((await j.form('/register', { email: 'a@b.com', password: 'longenoughpass' })).status, 403);
  assert.equal((await j.form('/register', { _csrf: token, email: 'bad', password: 'longenoughpass' })).status, 400);
  assert.equal((await j.form('/register', { _csrf: token, email: 'a@b.com', password: 'short' })).status, 400);
  const ok = await j.form('/register', { _csrf: token, email: 'a@b.com', password: 'longenoughpass' });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), '/account');
  const acc = await j.go('/account');
  assert.equal(acc.status, 200);
  assert.match(await acc.text(), /a@b\.com/);
  assert.equal((await j.form('/register', { _csrf: tokenOf(await (await j.go('/register')).text()), email: 'a@b.com', password: 'longenoughpass' })).status, 400, 'duplicate email');
});

test('login rejects wrong password and anonymous /account redirects', async () => {
  const j = jar();
  assert.equal((await j.go('/account')).headers.get('location'), '/login?next=%2Faccount');
  const token = tokenOf(await (await j.go('/login')).text());
  assert.equal((await j.form('/login', { _csrf: token, email: 'admin@x.com', password: 'nope' })).status, 401);
  assert.equal((await j.form('/login', { _csrf: token, email: 'ghost@x.com', password: 'nope' })).status, 401);
});

test('admin area is hidden from anonymous users and normal users', async () => {
  assert.equal((await fetch(base + '/admin')).status, 404);
  const j = jar();
  const token = tokenOf(await (await j.go('/register')).text());
  await j.form('/register', { _csrf: token, email: 'u@b.com', password: 'longenoughpass' });
  assert.equal((await j.go('/admin')).status, 404);
  assert.equal((await j.go('/admin/draws')).status, 404);
});

test('admin can log in, view pages and validate/save a draw', async () => {
  const j = jar();
  const t1 = tokenOf(await (await j.go('/login')).text());
  const login = await j.form('/login', { _csrf: t1, email: 'admin@x.com', password: 'admin-password-1' });
  assert.equal(login.status, 302);
  assert.equal(login.headers.get('location'), '/admin');
  for (const u of ['/admin', '/admin/draws', '/admin/draws/new', '/admin/currencies', '/admin/events', '/admin/settings', '/admin/users']) {
    const res = await j.go(u);
    assert.equal(res.status, 200, u);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.match(res.headers.get('x-robots-tag') || (await res.text()), /noindex/);
  }
  const token = tokenOf(await (await j.go('/admin/draws/new')).text());
  const base6 = { _csrf: token, draw_no: '26/003', draw_date: '2026-10-13', status: 'published', est_jackpot_hkd: '0', extra: '8' };
  const dup = await j.form('/admin/draws/save', { ...base6, n1: 1, n2: 1, n3: 3, n4: 4, n5: 5, n6: 6 });
  assert.equal(dup.status, 400);
  assert.match(await dup.text(), /6 different winning numbers/);
  const badNo = await j.form('/admin/draws/save', { ...base6, draw_no: 'abc', n1: 1, n2: 2, n3: 3, n4: 4, n5: 5, n6: 6 });
  assert.equal(badNo.status, 400);
  const sameExtra = await j.form('/admin/draws/save', { ...base6, extra: '6', n1: 1, n2: 2, n3: 3, n4: 4, n5: 5, n6: 6 });
  assert.equal(sameExtra.status, 400);
  const ok = await j.form('/admin/draws/save', { ...base6, n1: 6, n2: 2, n3: 3, n4: 4, n5: 5, n6: 1, w1: 2, p1: 8000000 });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), '/admin/draws');
  assert.deepEqual(state.lastDrawSave[1], [9, 7, 0, 0], 'last prize row written');
  assert.equal((await j.form('/admin/draws/save', { ...base6, n1: 6, n2: 2, n3: 3, n4: 4, n5: 5, n6: 1 })).status, 302);
  assert.equal((await j.form('/admin/settings', { site_name: 'X' })).status, 403, 'CSRF required for admin writes');
});
