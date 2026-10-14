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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
execSync('fuser -k 3333/tcp || true');
await wait(1500);
const env = { ...process.env, HEALTH_ALERT_EMAIL: 'owner@example.com', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_USER: 'info@marksixhub.com', SMTP_PASS: 'secret', MAIL_FROM: 'Mark Six Hub <info@marksixhub.com>', PORT: '3333' };
spawn('node', ['server.js'], { cwd: process.cwd(), env, detached: true, stdio: 'ignore' }).unref();
await wait(12000);
const hit = async (path) => (await fetch(BASE + path)).status;
const alerts = () => mails.filter((m) => m.to === 'owner@example.com' && m.body.includes('hit a server error'));

check('site is up', (await hit('/faq')) === 200);
check('a normal 404 sends no alert', (await hit('/no-such-page')) === 404 && alerts().length === 0);
await wait(1500);
check('still no alert after a 404', alerts().length === 0);

// Break the database the way a real fault would: a page that reads the users table
sql('RENAME TABLE users TO users_hidden');
const status = await hit('/leaderboard?token=SECRET123&x=1');
await wait(3000);
check('the broken page returned an error status', status >= 500, String(status));
check('exactly one alert email was sent', alerts().length === 1, String(alerts().length));
const body = (alerts()[0]?.body ?? '').split('=\r\n').join('').split('=\n').join('');
check('email names the page', body.includes('Page: /leaderboard'));
check('email does NOT contain the query string or token', !body.includes('SECRET123') && !body.includes('token='));
check('email has a short reference and the health link', /Reference: \d+/.test(body) && body.includes('/admin/health'));

// A burst of failures: still one email
for (let i = 0; i < 8; i++) await hit('/leaderboard?i=' + i);
await wait(3000);
check('eight more failures send no extra emails (10 minute gap)', alerts().length === 1, String(alerts().length));
sql('RENAME TABLE users_hidden TO users');
await wait(500);
check('site recovers after the fault', (await hit('/leaderboard')) === 200);
check('recovery sends nothing', alerts().length === 1);
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
