# Mark Six Hub

## Goal
marksixhub.com: information-only Hong Kong Mark Six site (results, prizes, draw calendar, number generator, user accounts for saved numbers, admin panel). NO betting, NO wallets, NO proxy orders (illegal/regulated). No horse racing. Minimal code, zero known bugs.

## Workflow
- At session start: read TASKS.md and continue. At end: update TASKS.md.
- Log non-obvious choices in DECISIONS.md. One task at a time.
- Read only files you need; never read node_modules, dist, or logs.

## Code rules
- Least code possible. No dependency unless clearly necessary; pin versions.
- Files under ~300 lines. No dead code, no duplicate logic.
- Test or manually verify before marking a task done.

## Stack
PHP + MySQL on Hostinger shared hosting; plain HTML/CSS front end, minimal JS. Config with DB credentials stays outside public_html.

## Security
- No secrets in code; use .env (see .env.example), never commit it.
- Escape/validate all user input. Use HTTPS, CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- No inline scripts unless nonce/hash protected.

## SEO
- One h1 per page, unique title (<60 chars) and meta description (<160).
- Canonical URL, Open Graph tags, semantic HTML, alt text on images.
- Keep robots.txt and sitemap.xml updated when pages change.

## Performance budget
- Lighthouse 95+ (performance, SEO, best practices, accessibility).
- Page weight under 200 KB initial; images WebP/AVIF, lazy-loaded, sized.
- Minimal JS, no render-blocking resources, long cache for static assets.
