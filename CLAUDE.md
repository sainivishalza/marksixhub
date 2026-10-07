# Mark Six Hub

## Goal
marksixhub.com: information-only Hong Kong Mark Six site (results, prizes, draw calendar, number generator, accounts for saved numbers, admin panel). NO betting, NO wallets, NO proxy orders (illegal/regulated). No horse racing. Never put "HKJC" in branding. Minimal code, zero known bugs.

## Workflow
- At session start: read TASKS.md and continue. At end: update TASKS.md.
- Log non-obvious choices in DECISIONS.md. One task at a time.
- Read only files you need; never read node_modules or logs.
- Before finishing any change: `npm test` must pass.

## Stack and layout
Node 20+, Express 5, EJS views, MySQL (mysql2), no front-end framework, no client JS.
- `server.js` entry. `src/app.js` middleware, `src/context.js` per-request locals, `src/setup.js` schema + seeds
- `src/routes/{site,account,admin}.js`, `src/security.js` (scrypt, CSRF, rate limit), `src/mark6.js` (generator, stats)
- `views/` (admin in `views/admin/`), `public/` static files, `tests/` (node:test, DB is faked)
- Config only from env vars (see `.env.example`). Never commit `.env`; the repo is public.

## Code rules
- Least code possible. No dependency unless clearly necessary; pin versions.
- Files under ~300 lines. No dead code, no duplicate logic.
- Every SQL uses `?` placeholders. Every template output uses `<%= %>` (escaped); `<%-` only for trusted HTML.
- Every POST form includes `<%- csrfField() %>`. Admin routes sit behind `requireAdmin`.

## Security
- CSP is `'self'` only: no inline scripts, no inline `style=` attributes, no external hosts.
- Passwords: scrypt. Rate-limit auth routes. Redirect targets go through `safeNext`.
- Store money amounts in HKD; other currencies are display-only conversions.

## SEO
- One h1 per page, unique title and meta description, canonical URL, sitemap/robots generated in `routes/site.js`.
- Private pages (account, admin, login) are `noindex`.

## Performance budget
- Lighthouse 95+. No client JS. Gzip on. Static assets cached.
