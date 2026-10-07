# Decisions
- 2026-10-07: Domain marksixhub.com. Scope = information + number-picker only. Proxy betting and wallets excluded (Gambling Ordinance, licensing, no HKJC API). Describe the game as "Hong Kong Mark Six"; keep "HKJC" out of branding (trademark).
- 2026-10-07: Hostinger Node.js app (Express) deployed from GitHub, MySQL from hPanel. Hostinger's importer rejected the plain static site ("unsupported framework"), so the site is an Express app.
- 2026-10-07: Express 5 + EJS + mysql2, server-rendered, zero client JS. Why: least code, fastest, best SEO, strict CSP possible.
- 2026-10-07: Sessions in a signed cookie (cookie-session), passwords with Node's built-in scrypt (no native modules), own small CSRF token. Admin is a `role` on users, first admin seeded from env.
- 2026-10-07: Results are entered manually in the admin panel (no scraping HKJC). Prizes stored in HKD; admin-managed currency rates convert for display only.
- 2026-10-07: Tests fake the DB layer, so SQL itself is only verified against a real MySQL (see TASKS.md).
- 2026-10-07: User chose the full Next.js rewrite (Next 16, Tailwind 3, Framer Motion). Built on branch `nextjs`; live Express site stays on `main` until parity. Old code moved to `legacy-express/`. Same MySQL tables so data and admin account carry over.
- 2026-10-07: Hostinger replaces the CSP response header with `upgrade-insecure-requests`, so the Express app also sends CSP as a meta tag. Next.js app relies on safe React rendering, next.config headers, and does not depend on CSP alone.
- 2026-10-07: Colour token named `night`, not `base` (clashed with Tailwind `text-base` font size and turned ball digits dark). Ball class names written in full so Tailwind does not purge blue/green.
