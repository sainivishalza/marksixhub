# Decisions
- 2026-10-07: Domain marksixhub.com. Scope = information + number-picker only. Proxy betting and wallets excluded (Gambling Ordinance, licensing, no HKJC API). Describe the game as "Hong Kong Mark Six"; keep "HKJC" out of branding (trademark).
- 2026-10-07: Hostinger Node.js app (Express) deployed from GitHub, MySQL from hPanel. Hostinger's importer rejected the plain static site ("unsupported framework"), so the site is an Express app.
- 2026-10-07: Express 5 + EJS + mysql2, server-rendered, zero client JS. Why: least code, fastest, best SEO, strict CSP possible.
- 2026-10-07: Sessions in a signed cookie (cookie-session), passwords with Node's built-in scrypt (no native modules), own small CSRF token. Admin is a `role` on users, first admin seeded from env.
- 2026-10-07: Results are entered manually in the admin panel (no scraping HKJC). Prizes stored in HKD; admin-managed currency rates convert for display only.
- 2026-10-07: Tests fake the DB layer, so SQL itself is only verified against a real MySQL (see TASKS.md).
