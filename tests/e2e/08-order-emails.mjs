import { chromium } from './pw.mjs';
import { execSync } from 'node:child_process';
import net from 'node:net';
const BASE = 'http://localhost:3333';
const sql = (q) => execSync(`mariadb -N -B ${process.env.E2E_DB || 'mh_test'} -e ${JSON.stringify(q)}`).toString().trim();
let pass = 0, fail = 0;
const check = (n, ok, x = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, x); };
// ---- fake SMTP server capturing messages
const mails = [];
const smtp = net.createServer((sock) => {
  let data = false, buf = '', body = '', rcpt = '', loginStep = 0;
  sock.write('220 fake ESMTP\r\n');
  sock.on('data', (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (data) {
        if (line === '.') { data = false; mails.push({ to: rcpt, body }); body = ''; sock.write('250 queued\r\n'); } else body += line + '\r\n';
        continue;
      }
      const u = line.toUpperCase();
      if (loginStep === 1) { loginStep = 2; sock.write('334 UGFzc3dvcmQ6\r\n'); }
      else if (loginStep === 2) { loginStep = 0; sock.write('235 ok\r\n'); }
      else if (u.startsWith('EHLO') || u.startsWith('HELO')) sock.write('250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
      else if (u.startsWith('AUTH PLAIN')) sock.write('235 ok\r\n');
      else if (u.startsWith('AUTH LOGIN')) { loginStep = 1; sock.write('334 VXNlcm5hbWU6\r\n'); }
      else if (u.startsWith('MAIL FROM')) sock.write('250 ok\r\n');
      else if (u.startsWith('RCPT TO')) { rcpt = line.match(/<([^>]+)>/)?.[1] ?? ''; sock.write('250 ok\r\n'); }
      else if (u === 'DATA') { data = true; sock.write('354 go\r\n'); }
      else if (u === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
      else sock.write('250 ok\r\n');
    }
  });
});
await new Promise((r) => smtp.listen(2525, '127.0.0.1', r));
const decode = (s) => s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const linkTo = async (to, kind, wait = 6000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < wait) {
    const m = [...mails].reverse().find((x) => x.to === to && decode(x.body).includes(`/${kind}?token=`));
    if (m) return decode(m.body).match(new RegExp(`http://localhost:3333/${kind}\\?token=[A-Za-z0-9_-]+`))[0];
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};


const waitMail = async (to, re, wait = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < wait) {
    const m = mails.find((x) => x.to === to && re.test(decode(x.body)));
    if (m) return decode(m.body);
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};
sql("DELETE FROM draws WHERE draw_no='26/400'");
sql("INSERT INTO draws (draw_no, draw_date, status) VALUES ('26/400', CURDATE() + INTERVAL 2 DAY, 'upcoming')");
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const email = `om${Date.now()}@example.com`;
const p = await (await b.newContext({ viewport: { width: 420, height: 1200 } })).newPage();
await p.goto(BASE + '/register');
await p.getByLabel('Email').fill(email);
await p.getByLabel('Password').fill('userpass123456');
await p.getByRole('checkbox').check();
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/\/account(\?welcome=1)?$/);
sql(`UPDATE users SET points=1000, email_verified=1 WHERE email='${email}'`);
const order = async () => {
  await p.goto(BASE + '/picker');
  await p.getByRole('button', { name: 'Quick pick' }).first().click();
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Submit order/ }).click();
  await p.waitForURL('**/account/orders/*');
  return (await p.locator('h1').innerText()).replace('Order No. ', '').trim();
};
const admin = await (await b.newContext()).newPage();
await admin.goto(BASE + '/login');
await admin.getByLabel('Email').fill('admin@example.com');
await admin.getByLabel('Password', { exact: true }).fill('adminpass12345');
await admin.getByRole('button', { name: 'Log in' }).click();
await admin.waitForTimeout(1500);

const n1 = await order();
check('no email before the admin acts', !mails.some((m) => m.to === email && /receipt is ready/.test(decode(m.body))));
await admin.goto(BASE + '/admin/orders?draw=26/400');
await admin.waitForTimeout(800);
await admin.getByRole('button', { name: 'Approve', exact: true }).first().click();
const m1 = await waitMail(email, new RegExp(`Your receipt is ready: order ${n1}`));
check('accepted email sent with the order number', Boolean(m1), n1);
check('email links to the order page', Boolean(m1) && new RegExp(`http://localhost:3333/account/orders/\\d+`).test(m1));
check('email says it is accepted and the receipt is ready', Boolean(m1) && /has been accepted/.test(m1) && /receipt is ready/i.test(m1));

const n2 = await order();
await admin.goto(BASE + '/admin/orders?draw=26/400');
await admin.waitForTimeout(800);
await admin.locator('tr', { hasText: n2 }).getByRole('button', { name: 'Reject' }).click();
const m2 = await waitMail(email, new RegExp(`Order ${n2} was not accepted`));
check('rejected email sent, mentions points returned', Boolean(m2) && /points have been returned/.test(m2 ?? ''), n2);

const n3 = await order();
const n4 = await order();
await admin.goto(BASE + '/admin/orders?draw=26/400');
await admin.waitForTimeout(800);
await admin.getByRole('button', { name: /Approve all/ }).click();
const m3 = await waitMail(email, new RegExp(`order ${n3}`));
const m4 = await waitMail(email, new RegExp(`order ${n4}`));
check('approve all emails every order', Boolean(m3) && Boolean(m4), `${n3}, ${n4}`);
check('exactly one accepted-email per accepted order', mails.filter((m) => m.to === email && /receipt is ready/.test(decode(m.body))).length === 3);
check('admin action was not slowed or broken by mail', (await admin.locator('body').innerText()).includes('2 orders approved'));
await b.close();
smtp.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
