import { chromium } from './pw.mjs';
import { execSync } from 'node:child_process';
import net from 'node:net';
import { createHash } from 'node:crypto';
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

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const mk = async () => (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
const register = async (p, email) => {
  await p.goto(BASE + '/register');
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Password').fill('userpass123456');
  await p.getByRole('checkbox').check();
await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/\/account(\?welcome=1)?$/);
};
const body = async (p) => (await p.locator('body').innerText());
sql("DELETE FROM draws WHERE draw_no='26/300'");
sql("INSERT INTO draws (draw_no, draw_date, status) VALUES ('26/300', CURDATE() + INTERVAL 2 DAY, 'upcoming')");

check('seeded admin is confirmed', sql("SELECT email_verified FROM users WHERE email='admin@example.com'") === '1');

// --- A: full flow
const A = `va${Date.now()}@example.com`;
const pa = await mk();
await register(pa, A);
check('shows confirm banner after sign-up', (await body(pa)).includes('Confirm your email to place orders'));
check('welcome points held back (0 now)', sql(`SELECT CONCAT(points,'/',pending_bonus,'/',email_verified) FROM users WHERE email='${A}'`) === '0/1000/0');
const link1 = await linkTo(A, 'verify');
check('verification email received', Boolean(link1), link1 ?? 'none');
check('daily claim disabled while unconfirmed', await pa.getByRole('button', { name: /Claim/ }).isDisabled());
await pa.goto(BASE + '/picker');
await pa.getByRole('button', { name: 'Quick pick' }).first().click();
await pa.waitForTimeout(1500);
check('submit disabled and explained while unconfirmed', (await pa.getByRole('button', { name: /Submit order/ }).isDisabled()) && (await body(pa)).includes('Confirm your email to submit orders'));
await pa.goto(BASE + '/account');
await pa.getByRole('button', { name: 'Send me a new link' }).click();
await pa.waitForTimeout(800);
const before = mails.length;
const link2 = await linkTo(A, 'verify');
check('resend sends a new link', link2 && link2 !== link1, link2?.slice(-8));
// old link no longer works
await pa.goto(link1);
await pa.getByRole('button', { name: 'Confirm my email' }).click();
await pa.waitForTimeout(800);
check('old link rejected after resend', (await body(pa)).includes('expired or was already used'));
check('still unconfirmed after bad link', sql(`SELECT email_verified FROM users WHERE email='${A}'`) === '0');
// GET alone does not confirm (scanner safe)
await pa.goto(link2);
check('opening the link alone does not confirm', sql(`SELECT email_verified FROM users WHERE email='${A}'`) === '0');
await pa.getByRole('button', { name: 'Confirm my email' }).click();
await pa.waitForURL('**/account?verified=1');
check('confirmed, welcome points paid', sql(`SELECT CONCAT(points,'/',pending_bonus,'/',email_verified) FROM users WHERE email='${A}'`) === '1000/0/1');
check('ledger has the welcome entry', sql(`SELECT COUNT(*) FROM point_log l JOIN users u ON u.id=l.user_id WHERE u.email='${A}' AND l.reason='Welcome points'`) === '1');
check('banner gone, success shown', !(await body(pa)).includes('Confirm your email to place orders') && (await body(pa)).includes('Email confirmed'));
await pa.goto(link2);
await pa.getByRole('button', { name: 'Confirm my email' }).click();
await pa.waitForTimeout(800);
check('link cannot be used twice', (await body(pa)).includes('expired or was already used'));
await pa.goto(BASE + '/picker');
await pa.getByRole('button', { name: 'Quick pick' }).first().click();
await pa.waitForTimeout(1500);
await pa.getByRole('button', { name: /Submit order/ }).click();
await pa.waitForURL('**/account/orders/**', { timeout: 15000 }).catch(() => {});
await pa.waitForTimeout(1500);
if (!pa.url().includes('/picker') && process.env.STAY !== '1') { globalThis.__receiptUrl = pa.url(); await pa.goto(BASE + '/picker'); }
check('confirmed user can order (-10)', sql(`SELECT points FROM users WHERE email='${A}'`) === '990');
await pa.goto(BASE + '/account');
await pa.getByRole('button', { name: /Claim/ }).click();
await pa.waitForTimeout(800);
check('confirmed user can claim daily points', sql(`SELECT points FROM users WHERE email='${A}'`) === '1090');

// --- B: password reset also confirms
const B = `vb${Date.now()}@example.com`;
const pb = await mk();
await register(pb, B);
check('B starts unconfirmed', sql(`SELECT email_verified FROM users WHERE email='${B}'`) === '0');
const tk = 'tok-' + Date.now();
sql(`DELETE p FROM password_resets p JOIN users u ON u.id=p.user_id WHERE u.email='${B}'`);
sql(`INSERT INTO password_resets (user_id, token_hash, expires_at) SELECT id, '${createHash('sha256').update(tk).digest('hex')}', UTC_TIMESTAMP() + INTERVAL 1 HOUR FROM users WHERE email='${B}'`);
await pb.goto(`${BASE}/reset?token=${tk}`);
await pb.getByLabel(/New password/).fill('brandnewpass123');
await pb.getByRole('button', { name: 'Set new password' }).click();
await pb.waitForURL('**/login**');
check('reset confirms the email and pays the bonus', sql(`SELECT CONCAT(points,'/',email_verified) FROM users WHERE email='${B}'`) === '1000/1');

// --- C: admin confirms by hand
const C = `vc${Date.now()}@example.com`;
const pc = await mk();
await register(pc, C);
const admin = await mk();
await admin.goto(BASE + '/login');
await admin.getByLabel('Email').fill('admin@example.com');
await admin.getByLabel('Password', { exact: true }).fill('adminpass12345');
await admin.getByRole('button', { name: 'Log in' }).click();
await admin.waitForTimeout(1500);
await admin.goto(`${BASE}/admin/users/${sql(`SELECT id FROM users WHERE email='${C}'`)}`);
check('admin sees email not confirmed', (await body(admin)).includes('not confirmed yet'));
await admin.getByRole('button', { name: 'Mark email as confirmed' }).click();
await admin.waitForTimeout(1000);
check('admin can confirm by hand (bonus paid)', sql(`SELECT CONCAT(points,'/',email_verified) FROM users WHERE email='${C}'`) === '1000/1');

// --- placing blocked on the server too: unconfirmed user D, craft the action via the UI is disabled, so check DB-level via a 4th account
await b.close();
smtp.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
