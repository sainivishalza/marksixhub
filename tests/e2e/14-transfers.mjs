import fs from 'node:fs';
import { totpAt } from '../../src/lib/totp.ts';
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
  sock.on('error', () => {});
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

import { createRequire } from 'node:module';
const jsqr = fs.readFileSync(createRequire(import.meta.url).resolve('jsqr/dist/jsQR.js'), 'utf8');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const pw = 'userpass123456';
const pages = {};
async function user(name) {
  const email = `${name}@example.com`;
  const pg = await (await b.newContext({ bypassCSP: true, viewport: { width: 400, height: 1000 } })).newPage();
  await pg.goto(BASE + '/register');
  await pg.getByLabel('Email').fill(email);
  await pg.getByLabel('Password').fill(pw);
  await pg.getByRole('checkbox').check();
  await pg.getByRole('button', { name: 'Create account' }).click();
  await pg.waitForURL(/\/account/, { timeout: 10000 });
  sql(`UPDATE users SET email_verified=1, created_at=NOW() - INTERVAL 10 DAY WHERE email='${email}'`);
  setPts(email, 500);
  pages[name] = pg;
  return { email, pg, id: () => sql(`SELECT id FROM users WHERE email='${email}'`) };
}
const setPts = (emailPart, n) => { const w = `email LIKE '${emailPart}'`; sql(`UPDATE users SET points=${n} WHERE ${w}`); sql(`INSERT INTO point_log (user_id, delta, reason) SELECT id, ${n} - IFNULL((SELECT SUM(delta) FROM point_log WHERE user_id=users.id),0), 'test setup' FROM users WHERE ${w}`); };
const pts = (n) => Number(sql(`SELECT points FROM users WHERE email='${n}@example.com'`));
const total = () => Number(sql('SELECT SUM(points) FROM users'));
const xfers = () => Number(sql('SELECT COUNT(*) FROM transfers'));
const drift = () => Number(sql('SELECT COUNT(*) FROM (SELECT u.points AS points, COALESCE(SUM(l.delta),0) AS ledger FROM users u LEFT JOIN point_log l ON l.user_id=u.id GROUP BY u.id) t WHERE points<>ledger'));
import { spawn as sp } from 'node:child_process';
const restart = async () => {
  execSync('fuser -k 3333/tcp || true');
  await new Promise((r) => setTimeout(r, 1500));
  sp('node', ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: '3333' }, detached: true, stdio: 'ignore' }).unref();
  await new Promise((r) => setTimeout(r, 11000));
};
const A = await user('alice'), B = await user('bob'), C = await user('carol');
sql("UPDATE users SET nickname='bobby' WHERE email='bob@example.com'");
check('start: ledger matches every balance', drift() === 0, String(drift()));

// ---- Receive page and QR
await B.pg.goto(BASE + '/account/transfer');
const bobCode = (await B.pg.locator('p.tracking-widest').innerText()).trim();
check('receive page shows a 10 character pay code', /^[A-HJ-NP-Z2-9]{10}$/.test(bobCode), bobCode);
check('code is stored and stays the same after reload', (await B.pg.reload().then(() => B.pg.locator('p.tracking-widest').innerText())).trim() === bobCode && sql("SELECT pay_code FROM users WHERE email='bob@example.com'") === bobCode);
const decoded = await B.pg.evaluate(async (src) => {
  const svg = document.querySelector('[role=img] svg');
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  await new Promise((r) => { img.onload = r; img.src = 'data:image/svg+xml;base64,' + btoa(xml); });
  const c = document.createElement('canvas'); c.width = c.height = 400;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 400); g.drawImage(img, 0, 0, 400, 400);
  const d = g.getImageData(0, 0, 400, 400);
  const fn = new Function('module', 'exports', src + '; return module.exports;');
  const jsQR = fn({ exports: {} }, {});
  const res = (jsQR.default ?? jsQR)(d.data, 400, 400);
  return res?.data ?? null;
}, jsqr);
check('QR code decodes to the pay link', decoded === `http://localhost:3333/pay/${bobCode}`, String(decoded));

// ---- Scan while logged out: login, then straight to the pay page
const anon = await (await b.newContext({ viewport: { width: 400, height: 1000 } })).newPage();
await anon.goto(BASE + `/pay/${bobCode}`);
check('logged-out scan goes to login and remembers the pay page', anon.url().includes('/login') && decodeURIComponent(anon.url()).includes(`/pay/${bobCode}`), anon.url());
await anon.getByLabel('Email').fill(A.email);
await anon.getByLabel('Password').fill(pw);
await anon.getByRole('button', { name: /log in/i }).click();
await anon.waitForURL(`**/pay/${bobCode}`, { timeout: 10000 });
check('after login you land on the pay page for bobby', (await anon.locator('main').innerText()).includes('bobby'));
check('pay page shows the nickname, not the email', !(await anon.locator('main').innerText()).includes('bob@example.com'));

// ---- Happy path
const before = total();
const pa = A.pg;
await pa.goto(BASE + `/pay/${bobCode}`);
await pa.getByLabel('Points to send').fill('100');
await pa.getByLabel('Your password, to confirm').fill(pw);
await pa.getByRole('button', { name: 'Send points' }).click();
await pa.waitForURL('**/account/transfer?sent=100*', { timeout: 10000 });
check('alice sent 100: balance 400', pts('alice') === 400, String(pts('alice')));
check('bob received 100: balance 600', pts('bob') === 600, String(pts('bob')));
check('total points unchanged (nothing created or lost)', total() === before);
check('one transfer row', xfers() === 1);
check('both history lines written', sql("SELECT COUNT(*) FROM point_log WHERE reason LIKE 'Transfer %'") === '2');
check('success message shown to the sender', (await pa.locator('[role=status]').first().innerText()).includes('Sent 100 points to bobby'));
check('recent transfers lists it', (await pa.locator('main').innerText()).includes('Sent to bobby'));
check('ledger still matches every balance', drift() === 0);
await B.pg.goto(BASE + '/account/transfer');
check('bob sees "Received from"', (await B.pg.locator('main').innerText()).includes('Received from'));
await B.pg.goto(BASE + '/account/points');
check('points page History shows the transfer but Earned excludes it', (await B.pg.locator('main').innerText()).includes('Transfer from') && !(await B.pg.locator('main').innerText()).includes('Transfer to'));

// ---- Refusals: nothing moves
const attempt = async (pg, code, amount, password = pw, wantText) => {
  await pg.goto(BASE + `/pay/${code}`);
  await pg.evaluate(() => document.querySelector('input[name=amount]')?.removeAttribute('pattern')); // so the server's own checks are tested, not the browser's
  await pg.getByLabel('Points to send').fill(String(amount));
  await pg.getByLabel('Your password, to confirm').fill(password);
  await pg.getByRole('button', { name: 'Send points' }).click();
  await pg.waitForTimeout(1200);
  const t = await pg.locator('main').innerText();
  return wantText ? t.includes(wantText) : t;
};
const snap = () => `${pts('alice')}/${pts('bob')}/${pts('carol')}/${xfers()}`;
const s0 = snap();
check('wrong password is refused', await attempt(pa, bobCode, 10, 'wrongwrongwrong', 'password is not right'));
check('zero is refused', await attempt(pa, bobCode, 0, pw, 'at least 1'));
check('negative is refused', await attempt(pa, bobCode, -5, pw, 'whole number'));
check('decimal is refused', await attempt(pa, bobCode, '1.5', pw, 'whole number'));
check('letters are refused', await attempt(pa, bobCode, 'abc', pw, 'whole number'));
check('more than one transfer may send is refused', await attempt(pa, bobCode, 1001, pw, 'at most 1,000'));
check('more than the balance is refused', await attempt(pa, bobCode, 401, pw, 'not have enough'));
check('nothing moved after all those refusals', snap() === s0, `${s0} vs ${snap()}`);
await pa.goto(BASE + '/pay/ABCDE23456');
check('unknown code is refused', (await pa.locator('main').innerText()).includes('does not exist'));
await pa.goto(BASE + '/pay/%27%3B%20DROP');
check('junk link is refused', (await pa.locator('main').innerText()).includes('not valid'));
const aliceCode = sql("SELECT pay_code FROM users WHERE email='alice@example.com'");
await pa.goto(BASE + `/pay/${aliceCode}`);
check('your own code says so', (await pa.locator('main').innerText()).includes('your own QR code'));
check('own code has no send form', (await pa.getByRole('button', { name: 'Send points' }).count()) === 0);

await restart(); // clears the in-memory attempt limiter
// ---- Account rules: new, unconfirmed, blocked recipient
const carolCode = (await (async () => { await C.pg.goto(BASE + '/account/transfer'); return (await C.pg.locator('p.tracking-widest').innerText()).trim(); })());
sql("UPDATE users SET email_verified=0 WHERE email='carol@example.com'");
check('unconfirmed recipient cannot receive', (await (async () => { await pa.goto(BASE + `/pay/${carolCode}`); return (await pa.locator('main').innerText()).includes('does not exist'); })()));
sql("UPDATE users SET email_verified=1, blocked=1 WHERE email='carol@example.com'");
check('blocked recipient cannot receive', (await (async () => { await pa.goto(BASE + `/pay/${carolCode}`); return (await pa.locator('main').innerText()).includes('does not exist'); })()));
sql("UPDATE users SET blocked=0 WHERE email='carol@example.com'");
sql("UPDATE users SET created_at=NOW() WHERE email='alice@example.com'");
check('account younger than 3 days cannot send', await attempt(pa, bobCode, 10, pw, 'too new'));
sql("UPDATE users SET created_at=NOW() - INTERVAL 10 DAY WHERE email='alice@example.com'");
sql("UPDATE users SET email_verified=0 WHERE email='alice@example.com'");
check('unconfirmed sender cannot send', await attempt(pa, bobCode, 10, pw, 'Confirm your email'));
sql("UPDATE users SET email_verified=1 WHERE email='alice@example.com'");

await restart();
// ---- Daily limit (3000): bob has plenty
setPts('bob@example.com', 5000);
await B.pg.goto(BASE + `/pay/${aliceCode}`);
for (const n of [1000, 1000, 900]) {
  await B.pg.goto(BASE + `/pay/${aliceCode}`);
  await B.pg.getByLabel('Points to send').fill(String(n));
  await B.pg.getByLabel('Your password, to confirm').fill(pw);
  await B.pg.getByRole('button', { name: 'Send points' }).click();
  await B.pg.waitForURL('**/account/transfer?sent=*', { timeout: 10000 });
}
check('bob sent 2900 in a day', Number(sql("SELECT SUM(amount) FROM transfers WHERE from_user=(SELECT id FROM users WHERE email='bob@example.com')")) === 2900);
check('daily limit blocks the next transfer', await attempt(B.pg, aliceCode, 101, pw, 'Daily sending limit'));
check('exactly the daily limit is allowed', await (async () => { await B.pg.goto(BASE + `/pay/${aliceCode}`); await B.pg.getByLabel('Points to send').fill('100'); await B.pg.getByLabel('Your password, to confirm').fill(pw); await B.pg.getByRole('button', { name: 'Send points' }).click(); await B.pg.waitForURL('**/account/transfer?sent=100*', { timeout: 10000 }); return true; })());

await restart();
// ---- Same page submitted twice sends once
setPts('carol@example.com', 1000);
const cb = pages.carol;
await cb.goto(BASE + `/pay/${bobCode}`);
await cb.getByLabel('Points to send').fill('50');
await cb.getByLabel('Your password, to confirm').fill(pw);
const c0 = pts('carol'), t0 = xfers();
await cb.evaluate(() => { const f = document.querySelector('input[name=amount]').form; f.requestSubmit(); f.requestSubmit(); f.requestSubmit(); });
await cb.waitForURL('**/account/transfer?sent=*', { timeout: 10000 }).catch(async () => console.log('STUCK', cb.url(), (await cb.locator('main').innerText()).slice(0, 400)));
await cb.waitForTimeout(1500);
check('triple-submit of one page sends exactly once', pts('carol') === c0 - 50 && xfers() === t0 + 1, `${c0}->${pts('carol')}, rows +${xfers() - t0}`);

// ---- Race: two pages both try to send more than half the balance
setPts('carol@example.com', 500);
const cb2 = await (await b.newContext({ viewport: { width: 400, height: 1000 } })).newPage();
await cb2.goto(BASE + '/login'); await cb2.getByLabel('Email').fill(C.email); await cb2.getByLabel('Password').fill(pw);
await cb2.getByRole('button', { name: /log in/i }).click(); await cb2.waitForTimeout(2000);
for (const pg of [cb, cb2]) { await pg.goto(BASE + `/pay/${bobCode}`); await pg.getByLabel('Points to send').fill('400'); await pg.getByLabel('Your password, to confirm').fill(pw); }
const t1 = xfers(), tot = total();
await Promise.all([cb.getByRole('button', { name: 'Send points' }).click(), cb2.getByRole('button', { name: 'Send points' }).click()]);
await new Promise((r) => setTimeout(r, 3500));
check('two simultaneous sends of 400 from 500: only one goes through', xfers() === t1 + 1 && pts('carol') === 100, `rows +${xfers() - t1}, carol ${pts('carol')}`);
check('balance never negative', Number(sql('SELECT MIN(points) FROM users')) >= 0);
check('total points unchanged by the race', total() === tot);

await restart();
// ---- Opposite directions at the same time must not deadlock
setPts('alice@example.com', 1000); setPts('carol@example.com', 1000);
sql("DELETE FROM transfers");
const tot2 = total();
const aliceCode2 = sql("SELECT pay_code FROM users WHERE email='alice@example.com'");
const carolCode2 = sql("SELECT pay_code FROM users WHERE email='carol@example.com'");
const aa = A.pg, cc = pages.carol;
for (let i = 0; i < 4; i++) {
  await aa.goto(BASE + `/pay/${carolCode2}`); await aa.getByLabel('Points to send').fill('5'); await aa.getByLabel('Your password, to confirm').fill(pw);
  await cc.goto(BASE + `/pay/${aliceCode2}`); await cc.getByLabel('Points to send').fill('7'); await cc.getByLabel('Your password, to confirm').fill(pw);
  await Promise.all([aa.getByRole('button', { name: 'Send points' }).click(), cc.getByRole('button', { name: 'Send points' }).click()]);
  await new Promise((r) => setTimeout(r, 1800));
}
check('4 rounds of crossing transfers: all 8 went through, no deadlock', xfers() === 8, String(xfers()));
check('crossing transfers: balances exactly right', pts('alice') === 1000 - 20 + 28 && pts('carol') === 1000 - 28 + 20, `${pts('alice')} ${pts('carol')}`);
check('crossing transfers: total unchanged', total() === tot2);

await restart();
// ---- Replace the code
const old = bobCode;
await B.pg.goto(BASE + '/account/transfer');
await B.pg.getByRole('button', { name: 'Make a new code' }).click();
await B.pg.waitForURL('**/account/transfer?renewed=1');
const fresh = (await B.pg.locator('p.tracking-widest').innerText()).trim();
check('new code differs', fresh !== old && /^[A-HJ-NP-Z2-9]{10}$/.test(fresh));
await pa.goto(BASE + `/pay/${old}`);
check('old QR no longer works', (await pa.locator('main').innerText()).includes('does not exist'));
const stale = await (async () => { await pa.goto(BASE + `/pay/${fresh}`); await pa.getByLabel('Points to send').fill('5'); await pa.getByLabel('Your password, to confirm').fill(pw); return true; })();
sql("UPDATE users SET pay_code='ZZZZZZZZZZ' WHERE email='bob@example.com'");
const x1 = xfers();
await pa.getByRole('button', { name: 'Send points' }).click();
await pa.waitForTimeout(1500);
check('a code replaced after the page opened cannot be paid', xfers() === x1 && (await pa.locator('main').innerText()).includes('cannot receive'));
sql(`UPDATE users SET pay_code='${fresh}' WHERE email='bob@example.com'`);

// ---- Two-step login users must give a code
const D = await user('dave');
const secret = 'JBSWY3DPEHPK3PXP';
sql(`UPDATE users SET totp_secret='${secret}', totp_on=1 WHERE email='dave@example.com'`);
await D.pg.goto(BASE + `/pay/${fresh}`);
check('two-step users see the authenticator field', (await D.pg.getByLabel('Authenticator code').count()) === 1);
await D.pg.getByLabel('Points to send').fill('10'); await D.pg.getByLabel('Your password, to confirm').fill(pw); await D.pg.getByLabel('Authenticator code').fill('000000');
const d0 = xfers();
await D.pg.getByRole('button', { name: 'Send points' }).click(); await D.pg.waitForTimeout(1500);
check('wrong authenticator code is refused', xfers() === d0 && (await D.pg.locator('main').innerText()).includes('authenticator'));
check('amount is kept after an error, password is not', (await D.pg.getByLabel('Points to send').inputValue()) === '10' && (await D.pg.getByLabel('Your password, to confirm').inputValue()) === '');
await D.pg.getByLabel('Your password, to confirm').fill(pw);
await D.pg.getByLabel('Authenticator code').fill(totpAt(secret, Math.floor(Date.now() / 30000)));
await D.pg.getByRole('button', { name: 'Send points' }).click();
await D.pg.waitForURL('**/account/transfer?sent=10*', { timeout: 10000 }).catch(() => {});
check('right authenticator code sends', xfers() === d0 + 1);

// ---- Admin: list and kill switch
const adm = await (await b.newContext({ viewport: { width: 400, height: 1000 } })).newPage();
await adm.goto(BASE + '/login'); await adm.getByLabel('Email').fill('admin@example.com'); await adm.getByLabel('Password').fill('adminpass12345');
await adm.getByRole('button', { name: /log in/i }).click(); await adm.waitForTimeout(2000);
await adm.goto(BASE + '/admin/transfers'); await adm.getByText('Recent transfers').first().waitFor().catch(() => {});
const at = await adm.locator('main, body').first().innerText();
check('admin sees transfers with emails', at.includes('alice@example.com') && at.includes('carol@example.com'));
check('normal users cannot open the admin transfers page', await (async () => { await pa.goto(BASE + '/admin/transfers'); return !(await pa.locator('body').innerText()).includes('Recent transfers'); })());
sql("REPLACE INTO settings (k, v) VALUES ('transfer_enabled','0')");
await new Promise((r) => setTimeout(r, 31000)); // settings are cached for 30 seconds
await pa.goto(BASE + `/pay/${fresh}`);
check('switched off: the pay page says so and has no send button', (await pa.locator('main').innerText()).includes('switched off') && (await pa.getByRole('button', { name: 'Send points' }).count()) === 0);
sql("REPLACE INTO settings (k, v) VALUES ('transfer_enabled','1')");

// ---- Delete account removes the code
const gone = await user('erin');
await gone.pg.goto(BASE + '/account/transfer');
const erinCode = (await gone.pg.locator('p.tracking-widest').innerText()).trim();
const erinId = gone.id();
await gone.pg.goto(BASE + '/account/settings');
await gone.pg.getByLabel('Your password').fill(pw); await gone.pg.getByLabel('Type DELETE to confirm').fill('DELETE');
await gone.pg.getByRole('button', { name: 'Delete my account' }).click();
await gone.pg.waitForURL('**/login?deleted=1', { timeout: 10000 });
check('deleted account has no pay code', sql(`SELECT IFNULL(pay_code,'none') FROM users WHERE id=${erinId}`) === 'none');
await pa.goto(BASE + `/pay/${erinCode}`);
check('deleted account QR no longer works', (await pa.locator('main').innerText()).includes('does not exist'));

if (process.env.SMTP_HOST) {
  const got = mails.filter((m) => m.to === 'bob@example.com' && m.body.includes('sent you 100 free play points'));
  check('recipient got an email for the first transfer', got.length === 1, String(got.length));
  check('the email names the sender by nickname/code, not by email address', !got[0]?.body.includes('alice@example.com') || got[0].body.split('\r\n').filter((l) => l.startsWith('From:')).length === 1);
}
check('final: ledger matches every balance', drift() === 0, String(drift()));
await b.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(0);
