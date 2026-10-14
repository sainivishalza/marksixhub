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

// A draw that closes in about 5 hours (Hong Kong time)
const hk = new Date(Date.now() + 8 * 3600_000 + 5 * 3600_000);
const date = hk.toISOString().slice(0, 10), time = hk.toISOString().slice(11, 19);
sql(`INSERT INTO draws (draw_no, draw_date, status, stop_selling_time) VALUES ('26/950', '${date}', 'upcoming', '${time}')`);

async function signup(email) {
  const pg = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage();
  await pg.goto(BASE + '/register');
  await pg.getByLabel('Email').fill(email);
  await pg.getByLabel('Password').fill('userpass123456');
  await pg.getByRole('checkbox').check();
  await pg.getByRole('button', { name: 'Create account' }).click();
  await pg.waitForURL(/\/account/, { timeout: 10000 });
  return pg;
}
const on = await signup('remind-on@example.com');
await signup('remind-off@example.com');
await signup('remind-unconfirmed@example.com');
sql("UPDATE users SET email_verified=1 WHERE email IN ('remind-on@example.com','remind-off@example.com')");

// Turn reminders on in settings (default is off)
await on.goto(BASE + '/account/settings');
const box = on.getByLabel('Email me before each draw closes');
check('reminders are off by default', !(await box.isChecked()));
await box.check();
await on.locator('#reminders button[type=submit]').click();
await on.waitForTimeout(1500);
check('saving turns reminders on', sql("SELECT remind FROM users WHERE email='remind-on@example.com'") === '1');
check('settings shows a confirmation', (await on.locator('#reminders').innerText()).includes('Reminders are on'));
sql("UPDATE users SET remind=1, email_verified=0 WHERE email='remind-unconfirmed@example.com'");

// Restart with a short timer and the fake mail server
execSync('fuser -k 3333/tcp || true');
await new Promise((r) => setTimeout(r, 1500));
const env = { ...process.env, HEALTH_INTERVAL_MS: '2000', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_USER: 'info@marksixhub.com', SMTP_PASS: 'secret', MAIL_FROM: 'Mark Six Hub <info@marksixhub.com>', PORT: '3333' };
spawn('node', ['server.js'], { cwd: process.cwd(), env, detached: true, stdio: 'ignore' }).unref();
await new Promise((r) => setTimeout(r, 14000));
const to = (e) => mails.filter((m) => m.to === e);
check('opted-in user got exactly one reminder', to('remind-on@example.com').length === 1, String(to('remind-on@example.com').length));
check('user who did not opt in got nothing', to('remind-off@example.com').length === 0);
check('unconfirmed email got nothing', to('remind-unconfirmed@example.com').length === 0);
const mail = to('remind-on@example.com')[0]?.body ?? '';
check('email names the draw and closing time', mail.includes('26/950') && mail.includes('Hong Kong time'));
check('email has a picker link and a stop link', mail.includes('/picker') && mail.includes('/unsubscribe?t='));
check('email carries a List-Unsubscribe header', /List-Unsubscribe:\s*<http/i.test(mail));
await new Promise((r) => setTimeout(r, 7000));
check('not sent again for the same draw', to('remind-on@example.com').length === 1);

// Unsubscribe from the email link
const link = mail.replace(/=\r?\n/g, '').match(/http:\/\/localhost:3333\/unsubscribe\?t=[0-9A-Za-z_.-]+/)?.[0];
check('found the stop link in the email', Boolean(link), String(link));
const anon = await (await b.newContext()).newPage();
await anon.goto(link);
check('unsubscribe page asks before stopping', (await anon.locator('main').innerText()).includes('Stop the reminder emails'));
check('visiting the link alone does not unsubscribe', sql("SELECT remind FROM users WHERE email='remind-on@example.com'") === '1');
await anon.getByRole('button', { name: 'Stop reminders' }).click();
await anon.waitForURL('**/unsubscribe?done=1');
check('confirming stops reminders without logging in', sql("SELECT remind FROM users WHERE email='remind-on@example.com'") === '0' && (await anon.locator('main').innerText()).includes('will not get'));
await anon.goto(BASE + '/unsubscribe?t=1.forgedtoken');
check('forged link is refused', (await anon.locator('main [role=alert]').innerText()).includes('not valid'));
const id = sql("SELECT id FROM users WHERE email='remind-off@example.com'");
sql("UPDATE users SET remind=1 WHERE email='remind-off@example.com'");
await anon.goto(BASE + `/unsubscribe?t=${id}.AAAAAAAAAAAAAAAAAAAAAA`);
check('valid id with a wrong signature is refused', (await anon.locator('main [role=alert]').count()) === 1);
check('other users were not changed', sql("SELECT remind FROM users WHERE email='remind-unconfirmed@example.com'") === '1');
await b.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
