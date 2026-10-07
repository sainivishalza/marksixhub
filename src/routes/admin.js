const router = require('express').Router();
const { q, one, tx, bust } = require('../db');
const { requireAdmin } = require('../security');
const { parseNums, toStored, validBall } = require('../mark6');
const { shape } = require('./site');

router.use(requireAdmin, (req, res, next) => {
  res.locals.noindex = true;
  res.locals.title = 'Admin';
  next();
});

const done = (req, res, to, msg) => {
  req.session.flash = msg;
  res.redirect(to);
};
const int = (v, min = 0) => Math.max(min, parseInt(v, 10) || 0);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

router.get('/', async (req, res) => {
  const [[draws], [users], [sets]] = await Promise.all([
    q("SELECT COUNT(*) AS n, SUM(status='published') AS pub FROM draws"),
    q('SELECT COUNT(*) AS n FROM users'),
    q('SELECT COUNT(*) AS n FROM saved_sets'),
  ]);
  res.render('admin/dashboard', { draws, users, sets });
});

/* ---------- draws ---------- */
router.get('/draws', async (req, res) => {
  res.render('admin/draws', { rows: (await q('SELECT * FROM draws ORDER BY draw_date DESC, id DESC LIMIT 200')).map(shape) });
});

router.get('/draws/new', (req, res) => {
  const last = req.query.draw_no;
  res.render('admin/draw_form', { d: { id: null, draw_no: last || '', draw_date: '', status: 'upcoming', numbers: [], extra: '', est_jackpot_hkd: 0, note: '' }, prizes: {}, errors: [] });
});

router.get('/draws/:id/edit', async (req, res, next) => {
  const d = shape(await one('SELECT * FROM draws WHERE id=?', [int(req.params.id)]));
  if (!d) return next();
  const prizes = Object.fromEntries((await q('SELECT * FROM draw_prizes WHERE draw_id=?', [d.id])).map((p) => [p.division, p]));
  res.render('admin/draw_form', { d, prizes, errors: [] });
});

function readDraw(b) {
  const errors = [];
  const d = {
    draw_no: String(b.draw_no || '').trim(),
    draw_date: String(b.draw_date || ''),
    status: b.status === 'published' ? 'published' : 'upcoming',
    est_jackpot_hkd: int(b.est_jackpot_hkd),
    note: String(b.note || '').trim().slice(0, 255),
  };
  if (!/^\d{2}\/\d{3}$/.test(d.draw_no)) errors.push('Draw number must look like 26/081.');
  if (!isDate(d.draw_date)) errors.push('Draw date is required.');
  const six = [1, 2, 3, 4, 5, 6].map((i) => parseInt(b['n' + i], 10));
  const extra = parseInt(b.extra, 10);
  d.numbers = six.filter(validBall);
  d.extra = validBall(extra) ? extra : '';
  if (d.status === 'published') {
    if (new Set(six).size !== 6 || !six.every(validBall)) errors.push('Enter 6 different winning numbers between 1 and 49.');
    else if (!validBall(extra) || six.includes(extra)) errors.push('Extra number must be 1 to 49 and different from the six.');
  }
  const prizes = {};
  for (let div = 1; div <= 7; div++) prizes[div] = { division: div, winners: int(b['w' + div]), prize_hkd: int(b['p' + div]) };
  return { d, prizes, errors };
}

router.post('/draws/save', async (req, res) => {
  const id = int(req.body.id);
  const { d, prizes, errors } = readDraw(req.body);
  const form = (status) => res.status(status).render('admin/draw_form', { d: { ...d, id: id || null }, prizes, errors });
  if (errors.length) return form(400);
  const published = d.status === 'published';
  const nums = published ? toStored(d.numbers) : null;
  const extra = published ? d.extra : null;
  try {
    await tx(async (run) => {
      let drawId = id;
      if (id) {
        await run('UPDATE draws SET draw_no=?, draw_date=?, status=?, nums=?, extra=?, est_jackpot_hkd=?, note=? WHERE id=?', [d.draw_no, d.draw_date, d.status, nums, extra, d.est_jackpot_hkd, d.note || null, id]);
      } else {
        drawId = (await run('INSERT INTO draws (draw_no, draw_date, status, nums, extra, est_jackpot_hkd, note) VALUES (?,?,?,?,?,?,?)', [d.draw_no, d.draw_date, d.status, nums, extra, d.est_jackpot_hkd, d.note || null])).insertId;
      }
      for (const p of Object.values(prizes)) {
        await run('REPLACE INTO draw_prizes (draw_id, division, winners, prize_hkd) VALUES (?,?,?,?)', [drawId, p.division, p.winners, p.prize_hkd]);
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      errors.push('That draw number already exists.');
      return form(400);
    }
    throw err;
  }
  bust('freq');
  done(req, res, '/admin/draws', `Draw ${d.draw_no} saved.`);
});

router.post('/draws/:id/delete', async (req, res) => {
  await q('DELETE FROM draws WHERE id=?', [int(req.params.id)]);
  bust('freq');
  done(req, res, '/admin/draws', 'Draw deleted.');
});

/* ---------- currencies ---------- */
router.get('/currencies', async (req, res) => {
  res.render('admin/currencies', { rows: await q("SELECT * FROM currencies ORDER BY code='HKD' DESC, code") });
});

router.post('/currencies/save', async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const rate = code === 'HKD' ? 1 : Number(req.body.rate);
  const name = String(req.body.name || '').trim().slice(0, 40);
  if (!/^[A-Z]{3}$/.test(code) || !name || !(rate > 0) || rate > 1e9) return done(req, res, '/admin/currencies', 'Enter a 3-letter code, a name and a rate above 0.');
  await q('INSERT INTO currencies (code, name, symbol, rate, active) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), symbol=VALUES(symbol), rate=VALUES(rate), active=VALUES(active)', [
    code, name, String(req.body.symbol || '').trim().slice(0, 6), rate, code === 'HKD' || req.body.active ? 1 : 0,
  ]);
  bust('currencies');
  done(req, res, '/admin/currencies', `${code} saved.`);
});

router.post('/currencies/:code/delete', async (req, res) => {
  if (req.params.code !== 'HKD') await q('DELETE FROM currencies WHERE code=?', [req.params.code]);
  bust('currencies');
  done(req, res, '/admin/currencies', 'Currency removed.');
});

/* ---------- events ---------- */
router.get('/events', async (req, res) => {
  res.render('admin/events', { rows: await q('SELECT * FROM events ORDER BY event_date DESC LIMIT 200') });
});

router.post('/events/save', async (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 120);
  if (!title || !isDate(req.body.event_date)) return done(req, res, '/admin/events', 'Title and date are required.');
  const row = [title, req.body.event_date, String(req.body.body || '').trim().slice(0, 500), req.body.active ? 1 : 0];
  const id = int(req.body.id);
  if (id) await q('UPDATE events SET title=?, event_date=?, body=?, active=? WHERE id=?', [...row, id]);
  else await q('INSERT INTO events (title, event_date, body, active) VALUES (?,?,?,?)', row);
  done(req, res, '/admin/events', 'Event saved.');
});

router.post('/events/:id/delete', async (req, res) => {
  await q('DELETE FROM events WHERE id=?', [int(req.params.id)]);
  done(req, res, '/admin/events', 'Event deleted.');
});

/* ---------- settings & users ---------- */
router.get('/settings', (req, res) => res.render('admin/settings'));

router.post('/settings', async (req, res) => {
  const fields = { site_name: 60, site_description: 300, announcement: 300 };
  for (const [k, max] of Object.entries(fields)) {
    await q('REPLACE INTO settings (k, v) VALUES (?,?)', [k, String(req.body[k] || '').trim().slice(0, max)]);
  }
  bust('settings');
  done(req, res, '/admin/settings', 'Settings saved.');
});

router.get('/users', async (req, res) => {
  res.render('admin/users', { rows: await q('SELECT id, email, role, currency, created_at FROM users ORDER BY id DESC LIMIT 200') });
});

module.exports = router;
