import { chromium } from './pw.mjs';
const BASE = 'http://localhost:3333';
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [name, vp] of [['phone', { width: 390, height: 1400 }], ['desktop', { width: 1280, height: 1000 }]]) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  await p.goto(BASE + '/picker');
  await p.getByRole('tab', { name: 'Multiple entry' }).click();
  check(`${name}: multiple entry has a quick pick button`, await p.getByRole('button', { name: 'Quick pick a ticket' }).isVisible());
  await p.getByRole('button', { name: 'Quick pick a ticket' }).click();
  await p.getByRole('button', { name: 'Quick pick a ticket' }).click();
  await p.getByRole('button', { name: 'Quick pick a ticket' }).click();
  const tickets = await p.locator('[aria-label="Tickets on your slip"] li').count();
  check(`${name}: 3 quick pick tickets on the slip`, tickets === 3, String(tickets));
  // each ticket has 6 unique numbers
  const sets = await p.locator('[aria-label="Tickets on your slip"] li').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('[aria-label^="Number"]')].map((x) => x.textContent)));
  check(`${name}: every ticket has 6 different numbers`, sets.every((s) => s.length === 6 && new Set(s).size === 6), JSON.stringify(sets[0]));
  // partial: pick 3 then fill the rest
  for (const n of [1, 2, 3]) await p.locator(`[data-n="${n}"]`).click();
  await p.getByRole('button', { name: 'Fill the rest and add' }).click();
  const last = await p.locator('[aria-label="Tickets on your slip"] li').last().evaluate((e) => [...e.querySelectorAll('[aria-label^="Number"]')].map((x) => Number(x.textContent)));
  check(`${name}: fill the rest keeps the 3 picked numbers`, [1, 2, 3].every((n) => last.includes(n)) && last.length === 6, JSON.stringify(last));
  // single mode: slots stay on one row
  await p.getByRole('tab', { name: 'Single entry' }).click();
  await p.getByRole('button', { name: 'Quick pick' }).first().click();
  await p.waitForTimeout(1800);
  const ys = await p.locator('[aria-label="Your ticket"] > div > div').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))]);
  check(`${name}: ticket slots on a single row`, ys.length === 1, JSON.stringify(ys));
}
await b.close();
console.log(`${pass}/${pass + fail} passed`);
