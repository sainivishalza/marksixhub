const cfg = require('./config');
const { q, one, cached } = require('./db');
const { money, date } = require('./format');
const { ballClass } = require('./mark6');

const getSettings = () =>
  cached('settings', 60000, async () => Object.fromEntries((await q('SELECT k, v FROM settings')).map((r) => [r.k, r.v])));

const getCurrencies = () =>
  cached('currencies', 60000, () => q('SELECT code, name, symbol, rate FROM currencies WHERE active=1 ORDER BY code=\'HKD\' DESC, code'));

module.exports = async function context(req, res, next) {
  const [site, currencies] = await Promise.all([getSettings(), getCurrencies()]);

  let user = null;
  if (req.session.uid) {
    user = await one('SELECT id, email, role, currency FROM users WHERE id=?', [req.session.uid]);
    if (!user) req.session = {};
  }
  const fromCookie = /(?:^|;\s*)cur=([A-Z]{3})/.exec(req.headers.cookie || '');
  const wanted = (user && user.currency) || (fromCookie && fromCookie[1]);
  const cur = currencies.find((c) => c.code === wanted) || currencies[0] || { code: 'HKD', symbol: 'HK$', rate: 1, name: 'Hong Kong Dollar' };

  if (req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  Object.assign(res.locals, {
    site,
    currencies,
    cur,
    user,
    path: req.path,
    url: req.originalUrl,
    baseUrl: cfg.baseUrl,
    canonical: cfg.baseUrl + req.path,
    title: site.site_name,
    description: site.site_description,
    noindex: false,
    jsonld: null,
    fmt: (hkd) => money(hkd, cur),
    fmtDate: date,
    ballClass,
  });
  if (user) res.set('Cache-Control', 'private, no-store');
  next();
};

module.exports.getCurrencies = getCurrencies;
module.exports.getSettings = getSettings;
