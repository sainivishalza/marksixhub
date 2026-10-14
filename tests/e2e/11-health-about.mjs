import { chromium } from './pw.mjs';
import { execSync, spawn } from 'node:child_process';
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

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const a = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
await a.goto(BASE + '/login');
await a.getByLabel('Email').fill('admin@example.com');
await a.getByLabel('Password').fill('adminpass12345');
await a.getByRole('button', { name: /log in/i }).click();
await a.waitForTimeout(2000);

// Health page with a clean-but-empty site
await a.goto(BASE + '/admin/health');
await a.getByText('Data backup').waitFor();
let t = await a.locator('main, body').first().innerText();
check('health page loads for admin', t.includes('Health check'));
check('warns that no draw is open', t.includes('No draw is open'));
check('warns that ADMIN_PASSWORD is still set', t.includes('ADMIN_PASSWORD is still set'));
check('warns staff have no two-step login', t.includes('no two-step login'));

// Make real problems: a draw whose date has passed with no result, and an order still pending for it
sql("INSERT INTO draws (draw_no, draw_date, status) VALUES ('26/900', CURDATE() - INTERVAL 3 DAY, 'upcoming')");
sql("INSERT INTO users (email, pass_hash, points, email_verified) VALUES ('buyer@example.com','x',0,1)");
const uid = sql("SELECT id FROM users WHERE email='buyer@example.com'");
sql(`INSERT INTO orders (user_id, draw_no, tickets, points, status, created_at) VALUES (${uid}, '26/900', 1, 10, 'pending', UTC_TIMESTAMP() - INTERVAL 2 DAY)`);
sql(`INSERT INTO point_log (user_id, delta, reason) VALUES (${uid}, 5, 'drift test')`);
await a.goto(BASE + '/admin/health');
await a.getByText('Data backup').waitFor();
t = await a.locator('main, body').first().innerText();
check('flags the result that was never entered', t.includes('result for 26/900 is not entered'));
check('flags the order for a closed draw', t.includes('still needs approving or rejecting'));
check('flags the order waiting over a day', t.includes('has waited more than a day'));
check('flags a points balance that does not match', t.includes('does not match the points history'));
check('summary says things to look at', /\d+ things? to look at/.test(t));
check('health page reachable from admin menu', (await a.locator('a[href="/admin/health"]').count()) >= 1);

// Daily email: restart the server with a short timer and a fake mail server
const mailsBefore = mails.length;
execSync('fuser -k 3333/tcp || true');
await new Promise((r) => setTimeout(r, 1500));
const env = { ...process.env, HEALTH_INTERVAL_MS: '2000', HEALTH_ALERT_EMAIL: 'owner@example.com', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_USER: 'info@marksixhub.com', SMTP_PASS: 'secret', MAIL_FROM: 'Mark Six Hub <info@marksixhub.com>', PORT: '3333' };
spawn('node', ['server.js'], { cwd: process.cwd(), env, detached: true, stdio: 'ignore' }).unref();
await new Promise((r) => setTimeout(r, 14000));
const digest = mails.filter((m) => m.to === 'owner@example.com');
check('exactly one health email sent', digest.length === 1, String(digest.length));
const text = digest[0]?.body ?? '';
check('email names the problems', text.includes('26/900') && text.includes('PROBLEM'));
check('email links to the health page', text.includes('/admin/health'));
await new Promise((r) => setTimeout(r, 7000));
check('not sent again the same day', mails.filter((m) => m.to === 'owner@example.com').length === 1);

// About page
const p = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
await p.goto(BASE + '/about');
const at = await p.locator('main').innerText();
check('about page explains free play and where results come from', at.includes('Free play, no money') && at.includes('Where the results come from'));
check('about page shows the operator when set', at.includes('Test Operator Ltd') && at.includes('1 Test Road'));
check('footer shows the operator and links About', (await p.locator('footer').innerText()).includes('Run by Test Operator Ltd') && (await p.locator('footer a[href="/about"]').count()) === 1);
check('about has one h1 and a description', (await p.locator('h1').count()) === 1 && ((await p.locator('meta[name=description]').getAttribute('content')) ?? '').length > 50);
await b.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
