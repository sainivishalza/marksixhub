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
- 2026-10-07: Next.js app deploys under Hostinger's existing Express preset: root `server.js` starts Next, `postinstall` runs `next build` when NODE_ENV=production, and build tools live in `dependencies` (production installs skip devDependencies). Verified in a clean-folder simulation. Chosen so no hPanel settings need changing.
- 2026-10-07: Admin and account pages always read cookies first so they are never prerendered; every server action calls requireRole/requireUser itself.

- Declined wallets/top-ups/paid tickets/auto payouts: unlicensed betting in Hong Kong and against CLAUDE.md. Built free saved tickets linked to a draw instead.
- Points wallet allowed only as free play credits: no purchase, no top-up by payment, no cash-out, no prizes of value. If points ever become buyable or redeemable it becomes betting; do not add that. Tickets pay once (settled flag); un-publishing or editing a draw later does not claw back points; deleting a ticket does not refund.
- Ordering closes at the draw's stop_selling_time (HK, UTC+8), or 23:59:59 HK on the draw date if none. Refunds only for orders whose draw is still upcoming; ordered tickets cannot be deleted by users (prevents refund exploits), only old unordered saves can.
- Sign-up IPs are stored only as a salted hash (users.signup_ip) to limit welcome points to 3 accounts per address per day. Failed-login attempts store the plain address for admin review (login_fails, no automatic cleanup yet). Reversing a payout can leave a negative balance if the user already spent the points; ordering needs balance >= cost so they simply cannot order until it recovers.
- Two-step login stores the TOTP secret in plain text in users.totp_secret (needed to verify codes); the database must stay private. Support role ranks between viewer and editor, so editors and admins can also refund orders.
- Not built: scheduled auto-publish (an unattended payout from a typed-in result is too easy to get wrong), email features (no provider configured).
