# Tasks

## Live site (main, Express on Hostinger)
- [x] Deployed, DB connected, admin login page works
- [ ] Redeploy to pick up CSP meta fix (commit 035998c); remove ADMIN_PASSWORD env var after first login

## Next.js rebuild (branch nextjs)
Done:
- [x] Project, theme tokens, DESIGN.md, layout, header, footer
- [x] Home (board hero, jackpot, latest result stub + check-my-numbers, countdown, guide, recent results, FAQ)
- [x] /picker, /results (paginated, sortable), /results/[slug] (+OG image, Event JSON-LD), /guide, /faq, 404, error, loading, sitemap, robots, manifest
- [x] Multi-currency display (cookie), dev-only sample data
- [x] Typecheck, build, 6 logic tests passing; picker keyboard + aria-live verified in browser

Done in part 2 (code written, type-checked, built; NOT yet run against a real MySQL):
- [x] Accounts: register, login, logout, change password, rate limits, signed-cookie sessions, saved sets (Save button on picker, /account)
- [x] Admin: dashboard + 30-day chart, draws (add/edit/publish/delete/search/pagination), CSV import, events, FAQ editor, per-page SEO, users (roles, search, CSV export), currencies, settings (site name, banner, jackpot toggle, maintenance mode)
- [x] Roles viewer/editor/admin; every server action checks the role itself
- [x] Public pages read FAQs/SEO/settings from the database; staging.* sites are noindex

Done in part 3:
- [x] Live on marksixhub.com (Next.js through server.js, webpack build for Hostinger's old glibc)
- [x] Draw details as the HKJC lists them: stop selling time, turnover, jackpot/snowball, estimated 1st division prize, fund (admin form, CSV import, public "Next draw" panel)
- [x] Admin: only draw number and date are required to announce a draw; results are added later; form keeps what was typed after an error
- [x] Number style: coloured rings, picked numbers become glossy white-centred balls (board, ticket, results)

Done in part 4 (not yet run against real MySQL):
- [x] Saved tickets are tagged with the next upcoming draw (saved_sets.draw_no); /account shows each ticket's result once that draw is published; admin draw page lists saved tickets per draw with matches. Information only: no wallets, payments or payouts (see CLAUDE.md).
- [x] Free play points (not money): sign-up bonus, daily claim, ticket costs points, winnings paid in points when a draw is published (each ticket pays once), admin can grant/remove points and set costs and prize points. Branch nextjs only; not yet on main or tested on real MySQL.
- [x] Picker: multi-ticket slip (Add another ticket), Place N tickets charges points in one transaction, balance shown on home and /picker. nextjs branch.
- [x] Picker modes: Single entry, Multiple entry (7 to 12 numbers = C(n,6) tickets, wins on every combination), Quick pick (choose 1 to 20 random tickets); slip + one order. Orders table; admin /admin/orders per draw: pick count per number, orders with user, numbers, points, result. nextjs branch; not tested on real MySQL.
- [x] Points history (account + admin user page), admin audit log, admin order refund (upcoming draws only), ordering closes at stop selling time (HK time; end of draw day if none), account order history with Play again. nextjs branch; not tested on real MySQL.
- [x] Favourite numbers (picker), win notices (picker + account, dismiss), dashboard cards (orders today, points held/won), orders CSV export, suspend/restore users (blocked users are signed out and cannot log in). nextjs branch; not tested on real MySQL.
- [x] Leaderboard (opt-in nickname), daily streak bonus, draw checklist, give-everyone points, confirm tick for making admins. Still open: forgot password (needs an email service). nextjs branch; not tested on real MySQL.
- [x] Login lockout (5 fails/15 min per account) + admin Failed logins; sign-up bonus limited to 3 accounts per address per day (hashed address); admin Points check (balance vs history); undo payout (unpublish or correcting a result reverses and re-pays); public /statistics page (hot, cold, overdue). nextjs branch; not tested on real MySQL.
- [x] Two-step login (authenticator app, optional per user), support role (look up users, refund orders), admin search, admin alerts, full JSON backup, order receipt page + closes-in countdown, number checker /check, badges, payout preview before publishing, failed-login cleanup (30 days). nextjs branch; not tested on real MySQL.
- [ ] Still open: forgot password and result emails (need an email service), scheduled auto-publish of draws (needs a job runner; risky to pay out unattended), service-worker/offline PWA.
- [x] Forgot password by email (SMTP via env vars SMTP_HOST/PORT/USER/PASS, MAIL_FROM): /forgot, /reset, 1-hour single-use hashed tokens, rate limited, same reply whether or not the email exists. Needs the SMTP env vars set on Hostinger; not tested against a real mail server. nextjs branch.
- [x] Tested against a real MariaDB 10.11 (migration + 76 browser checks across register, orders, refunds, payouts, undo, 2FA, reset, lockout, roles, suspend, exports). Bugs found and fixed: Points check SQL rejected by MariaDB, admins not sent to /admin after login, two-step setup page not refreshing, robots.txt Sitemap line built at build time (now dynamic; also hides /forgot and /reset). Not yet tested: real SMTP delivery, Hostinger's own MySQL version.
- [x] Multiple entry is now sets of 6: pick 6 and it becomes a ticket, the board clears for the next 6 (up to 20 per order). Every ticket is exactly 6 numbers (server-enforced); the 7-to-12-number combination entries were removed.
- [x] Order approval: orders are submitted Pending (points taken at submit), admin approves (one, or Approve all) or rejects (points returned); buyers see Pending, then Accepted: waiting for the result, then results. Publishing a draw is blocked while it has pending orders; only accepted orders pay. Clear Submit order button for everyone; logged-out users keep their tickets (localStorage) through login or sign-up. Browser-tested on MariaDB (91 checks).
- [x] Picker polish: ticket slots always one row of 6 (were wrapping onto 2-3 lines on phones), quick pick reveals low to high so balls stop jumping between slots, Multiple entry has its own Quick pick (random ticket, or fill the rest of a partial one).
- [x] Email verification at sign-up: with SMTP configured, new accounts must confirm via an emailed 24h single-use link (/verify, button-confirm so mail scanners cannot use it) before placing orders or claiming daily points; welcome points are held (users.pending_bonus) and paid on confirmation; resend (3/hour); password reset or admin 'Mark email as confirmed' also confirms. Existing accounts and the seeded admin count as confirmed. Without SMTP configured, sign-up works as before (auto-confirmed). Tested with a fake SMTP server (20 checks) plus all earlier suites.
- [x] Receipts: after Submit order the buyer lands on a receipt (our own branding) with draw no., one line per ticket (7+9+13+25+32+45), unit and total points, date/time in HKT, status, order no. and a reference code; downloadable as a PNG (/account/orders/[id]/receipt, owner only). 55 checks across the suites on MariaDB.
- [x] Order numbers follow the draw (26/107 -> 261070001, 261070002...; restarts per draw; locked so simultaneous orders never clash; old orders back-filled). The receipt is issued only after the admin accepts the order (pending shows an explanation, no download). Fixed: admin approve/reject/refund redirects were malformed (double ?), so notices never showed and the page could jump to another draw. 90+ browser checks on MariaDB.
- [x] Order emails: buyer gets 'Your receipt is ready: order N' (with link) when the admin accepts (single or Approve all), and 'Order N was not accepted' (points returned) when rejected. Sent in the background; skipped silently if SMTP is not configured. Tested with a fake SMTP server (8 checks).
- [x] Customer account redesign: /account is now Overview, Orders, Points and Settings with a sidebar (tabs on phones); points card with 7-day streak and the exact next claim, next-draw card, order slips with a Submitted/Accepted/Result progress bar and highlighted winning numbers, order page with the receipt beside the order, shared frame for log in and sign up. Tested on desktop and phone widths; all browser suites updated and passing.
- [x] Paid results history: visitors see the latest 40 results free; older results are bought with points by year (200 per year, 9 years = 1,800; upgrading charges only the extra years; permanent). Gated on the results list, each result page (noindex, no numbers), social image, sitemap, statistics and the number checker; staff see everything. Admin: Draws > Import past results (Excel .xlsx, adds new draws, never touches existing ones), per-user history grant, price in Settings. Tested with the real 9-year file (1,081 draws) on MariaDB: 39 checks. To go live: deploy, then upload the .xlsx in Admin > Draws > Import past results. Note: 2020 has only about 43 draws in the file.
- [x] Admin workflow: stop-selling time shows 12-hour HK time and warns on morning times; orders filter (All/Pending/Accepted/Rejected) with counts; pending-orders badge in the admin menu and phone app bar; dashboard 'waiting for approval' card. Not done: auto-fetch of official results (needs a data source), email alert to admin on new orders.
- [x] Users/site: sticky Submit order bar on phones (picker), free-play 'no cash value' note at checkout, win emails when a draw pays out (needs SMTP), installable web app icons (/pwa-icon/192, /512), optional Plausible via PLAUSIBLE_DOMAIN env var. Auth pages, 404, guide, FAQ checked at 375px: no overflow. Not done: offline service worker, Lighthouse run, scheduled backups.
- [x] Admin: preview payout now fills the result boxes of the draw form; 'Copy prizes from the last published draw' button; dashboard countdown to the next order close; email alert to the owner on each new order (ORDER_ALERT_EMAIL, needs SMTP); users/orders phone cards keep forms and ticket balls full width. Lighthouse could not run (the live host returns 403 to headless Chrome). Not done: auto-fetch of official results (needs a data source).

Todo (in order):
1. Deploy branch `nextjs` to a STAGING site on Hostinger (staging.marksixhub.com, its own new database, BASE_URL=https://staging.marksixhub.com). Walk through: register, login, admin draw add/publish, CSV import, FAQ edit, settings, maintenance. Fix any SQL errors from the runtime logs.
2. Lighthouse + header check on staging
3. Switch live: point marksixhub.com at the nextjs branch (or merge nextjs into main), keep the same database. Tables migrate automatically and are compatible with the old Express app.
4. Later: guide posts (MDX), logo upload and brand colours (needs file storage), page-view analytics (Plausible/Umami), forgot-password (needs email)

Deliberate deviations from the brief (see DESIGN.md): 7 ball columns on mobile (not 4), no "extra number" in the picker, real Mark Six ball colours, no SearchAction schema (no site search exists), "Free to use" instead of "Free forever", no notification bell (nothing to notify), page views not tracked yet.
