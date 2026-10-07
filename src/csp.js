const { prod } = require('./config');

const directives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: prod ? [] : null,
};

// Hosting layers may overwrite the CSP header, so the same policy is also sent as a <meta> tag.
// Browsers ignore frame-ancestors in <meta>; X-Frame-Options (helmet frameguard) covers that.
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const meta = Object.entries(directives)
  .filter(([k, v]) => v && k !== 'frameAncestors')
  .map(([k, v]) => [kebab(k), ...v].join(' '))
  .join('; ');

module.exports = { directives, meta };
