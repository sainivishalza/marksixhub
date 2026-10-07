const crypto = require('node:crypto');
const { promisify } = require('node:util');
const rateLimit = require('express-rate-limit');

const scrypt = promisify(crypto.scrypt);
const OPTS = { N: 16384, r: 8, p: 1 };

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64, OPTS);
  return `s1$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [version, salt, hash] = String(stored).split('$');
  if (version !== 's1' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, OPTS);
  return crypto.timingSafeEqual(expected, actual);
}

function sameToken(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Token is created lazily, so pages without forms never set a cookie.
function csrf(req, res, next) {
  const token = () => (req.session.csrf ||= crypto.randomBytes(24).toString('hex'));
  res.locals.csrfField = () => `<input type="hidden" name="_csrf" value="${token()}">`;
  if (req.method === 'POST' && !sameToken(req.body && req.body._csrf, req.session.csrf)) {
    return res.status(403).render('error', {
      title: 'Session expired',
      message: 'Your form expired. Go back, refresh the page and try again.',
    });
  }
  next();
}

const requireUser = (req, res, next) =>
  res.locals.user ? next() : res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));

const requireAdmin = (req, res, next) =>
  res.locals.user && res.locals.user.role === 'admin' ? next() : res.status(404).render('404', { title: 'Page not found' });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts. Try again in 15 minutes.',
});

const safeNext = (n) => (typeof n === 'string' && /^\/(?![/\\])/.test(n) ? n : '/');

module.exports = { hashPassword, verifyPassword, csrf, requireUser, requireAdmin, authLimiter, safeNext };
