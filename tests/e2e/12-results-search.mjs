import { chromium } from './pw.mjs';
import { execSync } from 'node:child_process';
const BASE = 'http://localhost:3333';
const sql = (q) => execSync(`mariadb -N -B ${process.env.E2E_DB || 'mh_test'} -e ${JSON.stringify(q)}`).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
const rows = async () => new Set(await p.locator('main a[href^="/results/"]').evaluateAll((a) => a.map((x) => x.getAttribute('href')))).size;

await p.goto(BASE + '/results');
const all = await rows();
check('results list shows the free draws', all >= 20, String(all));
check('search box has a label', (await p.getByRole('searchbox').or(p.getByLabel(/Find a draw/)).count()) >= 1);

// by number: every row must contain 7 as a main number or the extra
await p.getByLabel(/Find a draw/).fill('7');
await p.getByRole('button', { name: 'Find' }).click();
await p.waitForURL('**/results?q=7');
const nums7 = sql("SELECT COUNT(*) FROM (SELECT nums, extra FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT 40) t WHERE FIND_IN_SET(7, nums) OR extra=7");
const shown7 = Math.min(20, Number(nums7));
check('number search shows only draws containing 7', (await rows()) === shown7, `${await rows()} vs ${shown7}`);
check('number search is fewer than all', (await rows()) < all);
check('searched page is noindex', (await p.locator('meta[name=robots]').getAttribute('content'))?.includes('noindex'));
check('Clear link is shown', (await p.getByRole('link', { name: 'Clear' }).count()) === 1);

// by draw number
await p.goto(BASE + '/results?q=26%2F104');
check('draw number search finds 26/104', (await rows()) === 1 && (await p.locator('main').innerText()).includes('26/104'));
await p.goto(BASE + '/results?q=104');
check('partial draw number works', (await rows()) >= 1);

// nothing found
await p.goto(BASE + '/results?q=zzz');
check('junk text finds nothing and says so', (await rows()) === 0 || (await p.locator('main').innerText()).includes('No draw matches'));
await p.goto(BASE + '/results?q=50');
check('50 is not a ball, searched as draw text, finds none', (await p.locator('main').innerText()).includes('No draw matches'));
await p.goto(BASE + "/results?q=%27%3B%20DROP%20TABLE%20draws%3B--");
check('SQL text is harmless', (await p.locator('main').innerText()).includes('No draw matches') && sql('SELECT COUNT(*) FROM draws') !== '0');
await p.goto(BASE + '/results?q=%3Cscript%3Ealert(1)%3C/script%3E');
check('HTML in the search is shown as text, not run', (await p.locator('main').innerText()).includes('<script>') && (await p.locator('main #x-injected').count()) === 0);

// plain /results is still indexable
await p.goto(BASE + '/results');
check('plain results page stays indexable', !((await p.locator('meta[name=robots]').count()) && (await p.locator('meta[name=robots]').getAttribute('content'))?.includes('noindex')));
// paid history not searchable by a guest
const old = sql("SELECT draw_no FROM draws WHERE status='published' ORDER BY draw_date ASC LIMIT 1");
await p.goto(BASE + '/results?q=' + encodeURIComponent(old));
check('guest cannot find an old locked draw by searching', (await p.locator('main').innerText()).includes('No draw matches'), old);

// backup warning on the health page clears after a backup download
const a = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
await a.goto(BASE + '/login');
await a.getByLabel('Email').fill('admin@example.com');
await a.getByLabel('Password').fill('adminpass12345');
await a.getByRole('button', { name: /log in/i }).click();
await a.waitForTimeout(2000);
await a.goto(BASE + '/admin/health');
await a.getByText('Data backup').waitFor();
check('health warns no backup yet', (await a.locator('main, body').first().innerText()).includes('No backup downloaded yet'));
const r = await a.request.get(BASE + '/admin/export');
check('backup downloads', r.status() === 200);
await a.goto(BASE + '/admin/health');
await a.getByText('Data backup').waitFor();
check('health shows backup downloaded today', (await a.locator('main, body').first().innerText()).includes('Last downloaded today'));
await b.close();
console.log(`${pass}/${pass + fail} passed`);
