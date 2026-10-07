const router = require('express').Router();
const { q, one } = require('../db');
const { parseNums, toStored } = require('../mark6');
const { hashPassword, verifyPassword, requireUser, authLimiter, safeNext } = require('../security');

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/;
const MAX_SETS = 50;

const login = (req, res, user) => {
  req.session = { uid: user.id };
};

router.get('/login', (req, res) => res.render('login', { title: 'Log in', noindex: true, error: null, next: safeNext(req.query.next) }));

router.post('/login', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await one('SELECT * FROM users WHERE email=?', [email]);
  const ok = user ? await verifyPassword(String(req.body.password || ''), user.pass_hash) : (await verifyPassword('x', 's1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA'), false);
  if (!ok) return res.status(401).render('login', { title: 'Log in', noindex: true, error: 'Wrong email or password.', next: safeNext(req.body.next) });
  login(req, res, user);
  res.redirect(user.role === 'admin' && !req.body.next ? '/admin' : safeNext(req.body.next));
});

router.get('/register', (req, res) => res.render('register', { title: 'Create account', noindex: true, error: null }));

router.post('/register', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const fail = (error) => res.status(400).render('register', { title: 'Create account', noindex: true, error });
  if (!EMAIL.test(email)) return fail('Enter a valid email address.');
  if (password.length < 10 || password.length > 200) return fail('Password must be 10 to 200 characters.');
  if (await one('SELECT id FROM users WHERE email=?', [email])) return fail('That email is already registered.');
  const { insertId } = await q('INSERT INTO users (email, pass_hash, currency) VALUES (?,?,?)', [email, await hashPassword(password), res.locals.cur.code]);
  login(req, res, { id: insertId });
  res.redirect('/account');
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

router.get('/account', requireUser, async (req, res) => {
  const sets = (await q('SELECT id, nums, created_at FROM saved_sets WHERE user_id=? ORDER BY id DESC', [req.session.uid])).map((s) => ({ ...s, numbers: parseNums(s.nums) }));
  res.render('account', { title: 'My account', noindex: true, sets });
});

router.post('/account/sets', requireUser, async (req, res) => {
  const nums = parseNums(req.body.nums);
  const [{ n }] = await q('SELECT COUNT(*) AS n FROM saved_sets WHERE user_id=?', [req.session.uid]);
  if (nums.length === 6 && n < MAX_SETS) {
    await q('INSERT INTO saved_sets (user_id, nums) VALUES (?,?)', [req.session.uid, toStored(nums)]);
    req.session.flash = 'Numbers saved.';
  } else {
    req.session.flash = n >= MAX_SETS ? `You can save up to ${MAX_SETS} sets.` : 'Pick exactly 6 different numbers from 1 to 49.';
  }
  res.redirect('/account');
});

router.post('/account/sets/:id/delete', requireUser, async (req, res) => {
  await q('DELETE FROM saved_sets WHERE id=? AND user_id=?', [parseInt(req.params.id, 10) || 0, req.session.uid]);
  res.redirect('/account');
});

module.exports = router;
