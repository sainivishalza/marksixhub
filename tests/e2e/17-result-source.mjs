import { chromium } from './pw.mjs';
import { execFileSync, execSync, spawn } from 'node:child_process';
import http from 'node:http';
const BASE = 'http://localhost:3333';
const sql = (q) => execFileSync('mariadb', [process.env.E2E_DB || 'mh_test', '-N', '-B', '-e', q]).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- fake result source: its answer is chosen by the test
let mode = 'json', hits = 0;
const good = { drawNo: '26/970', date: '2026-10-20', numbers: [4, 28, 31, 44, 47, 48], extra: 19, turnover: 14675740, prizes: [{ division: 1, winners: 0, prize: 8000000 }, { division: 2, winners: 3, prize: 450000 }, { division: 3, winners: 90, prize: 41000 }] };
http.createServer((req, res) => {
  hits++;
  if (req.url === '/redirect-target') { res.end('x'); return; }
  const send = (code, type, body) => { res.writeHead(code, { 'content-type': type }); res.end(body); };
  if (mode === 'json') return send(200, 'application/json', JSON.stringify(good));
  if (mode === 'html') return send(200, 'text/html', '<html><script>var a="9 9 9"</script><div>Draw 26/971 21/10/2026</div><ul><li>1</li><li>2</li><li>3</li><li>10</li><li>20</li><li>30</li><li>Extra</li><li>40</li></ul><p>Turnover $ 12,345,000</p></html>');
  if (mode === 'badjson') return send(200, 'application/json', JSON.stringify({ ...good, numbers: [1, 1, 2, 3, 4, 5] }));
  if (mode === 'notjson') return send(200, 'application/json', '{oops');
  if (mode === 'error') return send(500, 'text/plain', 'boom');
  if (mode === 'empty') return send(200, 'text/html', '<html><div id="app"></div></html>');
  if (mode === 'slow') return setTimeout(() => send(200, 'application/json', JSON.stringify(good)), 12000);
  if (mode === 'redirect') { res.writeHead(302, { location: '/redirect-target' }); return res.end(); }
  if (mode === 'huge') return send(200, 'text/plain', 'x'.repeat(2_000_000));
}).listen(4555, '127.0.0.1');

execSync('fuser -k 3333/tcp || true'); await wait(1500);
spawn('node', ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: '3333', RESULT_SOURCE_URL: 'http://127.0.0.1:4555/result' }, detached: true, stdio: 'ignore' }).unref();
await wait(12000);

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const a = await (await b.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
await a.goto(BASE + '/login'); await a.getByLabel('Email').fill('admin@example.com'); await a.getByLabel('Password').fill('adminpass12345');
await a.getByRole('button', { name: /log in/i }).click(); await a.waitForTimeout(2000);
const fetchBtn = a.getByRole('button', { name: /Fetch the latest result/ });
const msg = async () => (await a.locator('[role=status]').filter({ hasText: /Filled|read|source|Could not|No winning|answered|took too long|could not|Too many/i }).last().innerText().catch(() => '')).trim();
const val = (name) => a.locator(`input[name="${name}"]`).inputValue();
const open = async () => { await a.goto(BASE + '/admin/draws/new'); await fetchBtn.waitFor(); };

await open();
check('button appears when a source is configured', (await fetchBtn.count()) === 1);

// JSON source fills the whole form, saves nothing
mode = 'json';
const draws0 = sql('SELECT COUNT(*) FROM draws');
await fetchBtn.click(); await a.waitForTimeout(1500);
check('numbers filled', [await val('n1'), await val('n2'), await val('n3'), await val('n4'), await val('n5'), await val('n6')].join(',') === '4,28,31,44,47,48');
check('extra, draw number, date and turnover filled', (await val('extra')) === '19' && (await val('draw_no')) === '26/970' && (await val('draw_date')) === '2026-10-20' && (await val('turnover_hkd')) === '14675740');
check('prizes filled', (await val('w2')) === '3' && (await val('p2')) === '450000' && (await val('p3')) === '41000');
check('message names the source and tells you to check', /from 127\.0\.0\.1/.test(await msg()) && /Check every box/.test(await msg()), await msg());
check('nothing was saved by fetching', sql('SELECT COUNT(*) FROM draws') === draws0);

// HTML page source
mode = 'html'; await open(); await fetchBtn.click(); await a.waitForTimeout(1500);
check('HTML page is read: numbers, extra and draw number', [await val('n1'), await val('n6'), await val('extra'), await val('draw_no')].join(',') === '1,30,40,26/971');
check('script text inside the page was ignored', (await val('n1')) !== '9');

// Refusals: nothing filled, a clear message
for (const [m, want] of [['badjson', /six different numbers/], ['notjson', /could not be read/], ['error', /answered 500/], ['empty', /No winning numbers/], ['redirect', /could not be reached/], ['huge', /No winning numbers|more data/]]) {
  mode = m; await open(); await fetchBtn.click(); await a.waitForTimeout(1800);
  check(`source mode "${m}": refused with a message, form stays empty`, want.test(await msg()) && (await val('n1')) === '', `${await msg()} | n1=${await val('n1')}`);
}
mode = 'slow'; await open(); const t0 = Date.now(); await fetchBtn.click(); await a.waitForTimeout(10500);
check('a slow source is cut off after about 8 seconds', /took too long/.test(await msg()) && Date.now() - t0 < 12000, await msg());

// Access control and audit
const cold = await (await b.newContext()).newPage();
await cold.goto(BASE + '/admin/draws/new');
check('guests cannot open the draw form', cold.url().includes('/login') || !(await cold.locator('body').innerText()).includes('Fetch the latest'));
check('fetches are in the audit log', Number(sql("SELECT COUNT(*) FROM audit_log WHERE action='result.fetch'")) >= 8);
check('failures are logged with their reason', sql("SELECT COUNT(*) FROM audit_log WHERE action='result.fetch' AND detail LIKE '%answered 500%'") !== '0');

// Rate limit: 10 per minute
mode = 'json'; await open();
let limited = false;
for (let i = 0; i < 12 && !limited; i++) { await fetchBtn.click(); await a.waitForTimeout(500); if (/Too many requests/.test(await msg())) limited = true; }
check('more than 10 fetches in a minute are refused', limited);

// Without the setting the button is hidden
execSync('fuser -k 3333/tcp || true'); await wait(1500);
spawn('node', ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: '3333', RESULT_SOURCE_URL: '' }, detached: true, stdio: 'ignore' }).unref();
await wait(12000);
const a2 = await (await b.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
await a2.goto(BASE + '/login'); await a2.getByLabel('Email').fill('admin@example.com'); await a2.getByLabel('Password').fill('adminpass12345');
await a2.getByRole('button', { name: /log in/i }).click(); await a2.waitForTimeout(2000);
await a2.goto(BASE + '/admin/draws/new'); await a2.waitForTimeout(800);
check('no source set: the button is not shown, paste box still is', (await a2.getByRole('button', { name: /Fetch the latest/ }).count()) === 0 && (await a2.getByRole('button', { name: 'Fill the form' }).count()) === 1);
await b.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
