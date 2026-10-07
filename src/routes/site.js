const router = require('express').Router();
const { q, one, cached } = require('../db');
const { MODES, parseNums, frequency, pickSet } = require('../mark6');
const { getCurrencies } = require('../context');
const { prod } = require('../config');
const { safeNext } = require('../security');

const PER_PAGE = 20;

const shape = (d) => d && { ...d, numbers: parseNums(d.nums), slug: d.draw_no.replace('/', '-') };
const getFreq = () =>
  cached('freq', 300000, async () => frequency((await q("SELECT nums FROM draws WHERE status='published'")).map((r) => r.nums)));

router.get('/', async (req, res) => {
  const [latest, next, recent, events] = await Promise.all([
    one("SELECT * FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT 1"),
    one("SELECT * FROM draws WHERE status='upcoming' ORDER BY draw_date ASC LIMIT 1"),
    q("SELECT * FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT 6 OFFSET 1"),
    q('SELECT * FROM events WHERE active=1 AND event_date >= CURDATE() ORDER BY event_date LIMIT 5'),
  ]);
  const prizes = latest ? await q('SELECT * FROM draw_prizes WHERE draw_id=? ORDER BY division', [latest.id]) : [];
  res.render('home', {
    title: `${res.locals.site.site_name} | Mark Six Results, Prizes & Number Picker`,
    latest: shape(latest),
    next,
    recent: recent.map(shape),
    events,
    prizes,
    jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: res.locals.site.site_name, url: res.locals.baseUrl },
  });
});

router.get('/results', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const [{ n }] = await q("SELECT COUNT(*) AS n FROM draws WHERE status='published'");
  const rows = await q("SELECT * FROM draws WHERE status='published' ORDER BY draw_date DESC, id DESC LIMIT ? OFFSET ?", [
    PER_PAGE,
    (page - 1) * PER_PAGE,
  ]);
  res.render('results', {
    title: `Mark Six Results${page > 1 ? ` - Page ${page}` : ''} | ${res.locals.site.site_name}`,
    description: 'Every Mark Six draw: winning numbers, extra number and prize amounts.',
    canonical: res.locals.baseUrl + '/results' + (page > 1 ? `?page=${page}` : ''),
    rows: rows.map(shape),
    page,
    pages: Math.max(1, Math.ceil(n / PER_PAGE)),
  });
});

router.get('/results/:slug', async (req, res, next) => {
  if (!/^\d{2}-\d{3}$/.test(req.params.slug)) return next();
  const draw = shape(await one("SELECT * FROM draws WHERE draw_no=? AND status='published'", [req.params.slug.replace('-', '/')]));
  if (!draw) return next();
  const prizes = await q('SELECT * FROM draw_prizes WHERE draw_id=? ORDER BY division', [draw.id]);
  res.render('result', {
    title: `Mark Six Result ${draw.draw_no} - ${res.locals.fmtDate(draw.draw_date)} | ${res.locals.site.site_name}`,
    description: `Mark Six draw ${draw.draw_no} winning numbers: ${draw.numbers.join(', ')} + extra ${draw.extra}. Full prize breakdown.`,
    draw,
    prizes,
  });
});

router.get('/upcoming', async (req, res) => {
  const [draws, events] = await Promise.all([
    q("SELECT * FROM draws WHERE status='upcoming' ORDER BY draw_date"),
    q('SELECT * FROM events WHERE active=1 AND event_date >= CURDATE() ORDER BY event_date'),
  ]);
  res.render('upcoming', {
    title: `Upcoming Mark Six Draws & Events | ${res.locals.site.site_name}`,
    description: 'Next Mark Six draw dates, estimated jackpots and special events.',
    draws,
    events,
  });
});

router.get('/pick', async (req, res) => {
  const mode = MODES.includes(req.query.mode) ? req.query.mode : 'random';
  const count = Math.min(10, Math.max(1, parseInt(req.query.count, 10) || 1));
  const fav = parseNums(req.query.fav).slice(0, 5);
  const freq = mode === 'hot' || mode === 'cold' ? await getFreq() : Array(50).fill(0);
  const sets = req.query.go ? Array.from({ length: count }, () => pickSet(mode, fav, freq)) : [];
  res.render('pick', {
    title: `Mark Six Number Generator - Free Lucky Number Picker | ${res.locals.site.site_name}`,
    description: 'Free Mark Six number generator. Random, balanced, hot or cold picks, or lock in your own lucky numbers.',
    canonical: res.locals.baseUrl + '/pick',
    sets,
    mode,
    count,
    fav,
    MODES,
  });
});

router.get('/statistics', async (req, res) => {
  const freq = await getFreq();
  const [{ n }] = await q("SELECT COUNT(*) AS n FROM draws WHERE status='published'");
  const ranked = Array.from({ length: 49 }, (_, i) => ({ n: i + 1, count: freq[i + 1] })).sort((a, b) => b.count - a.count || a.n - b.n);
  res.render('statistics', {
    title: `Mark Six Number Statistics - Hot & Cold Numbers | ${res.locals.site.site_name}`,
    description: 'How often each Mark Six number has been drawn, with the hottest and coldest numbers.',
    draws: n,
    ranked,
    hot: ranked.slice(0, 10),
    cold: ranked.slice(-10).reverse(),
  });
});

router.get('/how-to-play', (req, res) =>
  res.render('how', {
    title: `How to Play Mark Six - Rules & Prize Divisions | ${res.locals.site.site_name}`,
    description: 'Mark Six explained: pick 6 numbers from 1 to 49, how the extra number works and the 7 prize divisions.',
  }),
);

router.get('/disclaimer', (req, res) =>
  res.render('disclaimer', { title: `Disclaimer | ${res.locals.site.site_name}`, description: 'This site is independent and not affiliated with the Hong Kong Jockey Club.' }),
);

router.get('/currency', async (req, res) => {
  const code = String(req.query.c || '');
  if ((await getCurrencies()).some((c) => c.code === code)) {
    res.cookie('cur', code, { maxAge: 365 * 24 * 3600 * 1000, sameSite: 'lax', secure: prod, httpOnly: true });
    if (res.locals.user) await q('UPDATE users SET currency=? WHERE id=?', [code, res.locals.user.id]);
  }
  res.redirect(safeNext(req.query.next));
});

router.get('/robots.txt', (req, res) =>
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /login\nDisallow: /register\nDisallow: /currency\nSitemap: ${res.locals.baseUrl}/sitemap.xml\n`),
);

router.get('/sitemap.xml', async (req, res) => {
  const base = res.locals.baseUrl;
  const pages = ['/', '/results', '/upcoming', '/pick', '/statistics', '/how-to-play', '/disclaimer'];
  const draws = await q("SELECT draw_no, draw_date FROM draws WHERE status='published' ORDER BY draw_date DESC");
  const urls = [
    ...pages.map((p) => `<url><loc>${base}${p}</loc></url>`),
    ...draws.map((d) => `<url><loc>${base}/results/${d.draw_no.replace('/', '-')}</loc><lastmod>${d.draw_date}</lastmod></url>`),
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});

module.exports = router;
module.exports.shape = shape;
