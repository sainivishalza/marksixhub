const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieSession = require('cookie-session');
const cfg = require('./config');
const { csrf } = require('./security');
const context = require('./context');
const csp = require('./csp');

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

if (cfg.prod) {
  app.use((req, res, next) => {
    const insecure = req.headers['x-forwarded-proto'] === 'http';
    const www = (req.headers.host || '').startsWith('www.');
    if (insecure || www) return res.redirect(301, cfg.baseUrl + req.originalUrl);
    // The site is HTTPS-only (HSTS). Default the header so secure cookies work if the proxy omits it.
    req.headers['x-forwarded-proto'] ||= 'https';
    next();
  });
}

app.use(
  helmet({
    contentSecurityPolicy: { directives: csp.directives },
    frameguard: { action: 'deny' },
    strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
  }),
);
app.use(compression());
app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'allow', maxAge: '7d' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(
  cookieSession({
    name: 'mh',
    keys: [cfg.secret],
    maxAge: 7 * 24 * 3600 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: cfg.prod,
  }),
);
app.use(context);
app.use(csrf);

app.use(require('./routes/site'));
app.use(require('./routes/account'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).render('404', { title: 'Page not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render('error', { title: 'Something went wrong', message: 'Please try again in a moment.' }, (e, html) =>
    res.send(e ? 'Service temporarily unavailable. Please try again shortly.' : html),
  );
});

module.exports = app;
