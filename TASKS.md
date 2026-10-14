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
- [x] Admin draw form: 'Fill from copied results text' box reads draw number, six numbers + extra, turnover and each prize's units and amount (parseResultText in mark6.ts, tested); fills the boxes only, admin checks and saves. Not done: offline service worker, scheduled backups.
- [x] Paste-fill reads the results page layout ("1st $14,072,930" with a separate Winning Unit column), draw date, and warns that PDF/print shows the ball numbers as pictures (not text). PDF upload not built: the six numbers are vector drawings in the PDF.

Todo (in order):
1. Deploy branch `nextjs` to a STAGING site on Hostinger (staging.marksixhub.com, its own new database, BASE_URL=https://staging.marksixhub.com). Walk through: register, login, admin draw add/publish, CSV import, FAQ edit, settings, maintenance. Fix any SQL errors from the runtime logs.
2. Lighthouse + header check on staging
3. Switch live: point marksixhub.com at the nextjs branch (or merge nextjs into main), keep the same database. Tables migrate automatically and are compatible with the old Express app.
4. Later: guide posts (MDX), logo upload and brand colours (needs file storage), page-view analytics (Plausible/Umami), forgot-password (needs email)

Deliberate deviations from the brief (see DESIGN.md): 7 ball columns on mobile (not 4), no "extra number" in the picker, real Mark Six ball colours, no SearchAction schema (no site search exists), "Free to use" instead of "Free forever", no notification bell (nothing to notify), page views not tracked yet.

## Site quality pass (20 items) — deployed to main at 71c09ef
- [x] Mobile: home hero, admin chart and admin order header no longer overflow at 320px; footer links are 36px+ tall; mobile menu, favicon.ico + apple-icon, custom 404 with header/footer, clickable site name and email (CONTACT_EMAIL) and optional tap-to-call phone (CONTACT_PHONE) in the footer, Privacy and Terms pages, XML sitemap link removed.
- [x] Messages: daily-claim result, welcome after sign-up, logged-out notice. Axe fixes (jackpot role, picker group, FAQ/orders heading order). Icons cached one week.
- [x] Re-audited on the final build: no horizontal overflow on 29 pages at 320/390/768px (jackpot figure shrunk on very small phones), axe clean on public, account and admin pages (the admin "no h1" was the loading skeleton being scanned too early; one admin link now underlined), picker e2e updated for the Add to slip flow.
- [ ] Open for the owner: review Privacy/Terms text (owner chose no public phone number; CONTACT_PHONE stays empty).

## Genuine SEO content (nextjs, not yet on main)
- [x] /statistics/[n]: one page per ball 1 to 49 (times drawn, extra count, gap, longest wait, usual partners, latest appearances) from the visitor's visible window only; in sitemap, linked from /statistics and from each result.
- [x] Each result page has "Draw at a glance" (odd/even, low/high, sum, runs, colours, repeats from the previous draw, links to the draws either side). All worked out from the data, no filler text.
- [x] 六合彩 in the home and results titles/descriptions and a zh-HK line in the hero.
- [ ] Owner: add the site in Google Search Console and submit /sitemap.xml; real author/About page needs the owner's name and background.

## Boss review prep (nextjs)
- [x] Share preview fixed: every page named no og:image (only result pages had one), so WhatsApp/Facebook showed no picture. pageMetadata now sets the 1200x630 image (56 KB).
- [x] Contact page + form (/contact): emails CONTACT_EMAIL with Reply-To, honeypot, 3/hour/IP limit, keeps typed text, honest error if mail fails. Tested against a local SMTP sink.
- [x] iPhone Safari: fields under 16px made the page zoom on focus (contact, forgot, settings); all fields are 16px on phones now.
- [x] Optional Google Analytics 4 (GA_MEASUREMENT_ID) and Search Console meta tag (GOOGLE_SITE_VERIFICATION), both off until set; privacy text updated.
- [ ] Owner: set GA_MEASUREMENT_ID + GOOGLE_SITE_VERIFICATION on Hostinger, verify in Search Console and submit /sitemap.xml; turn on Hostinger backups (hPanel > Backups) and download the admin JSON backup; test in real Safari on an iPhone.

## Legal / compliance pass (nextjs)
- [x] Sign-up: required "18 or older + Terms + Privacy" tick-box (also enforced on the server). Contact form says how the message is used.
- [x] Delete my account (Account > Settings, users only): password + typing DELETE; removes email, password, nickname, IP hash, 2FA, favourites, tokens; orders and point history stay on a nameless account; refused while an order is pending. Staff accounts are removed by an admin.
- [x] Cookie notice shown only when GA_MEASUREMENT_ID is set; Google Analytics loads only after Accept, choice kept in localStorage.
- [x] Privacy (host, retention, deletion, analytics) and Terms (no payments, no refunds) updated; counselling line in the footer; /.well-known/security.txt.
- [ ] Owner: legal name/company + contact address for the footer and Terms (not invented); verify the 1834 633 counselling number is current; have a lawyer read Privacy/Terms before launch.

## About page + health check (nextjs)
- [x] /about: what the site is, free play only, where results come from, how an order is handled, no predictions, contact. "Who runs the site" appears only when OPERATOR_NAME (and optional OPERATOR_ADDRESS) are set in the environment; the footer shows the same line. Linked from the footer, in the sitemap, AboutPage JSON-LD.
- [x] Admin > Health check (manage level): database, email settings, open draw, results not entered, orders pending for closed draws, orders waiting over 24h, points balances vs history, staff without two-step login, ADMIN_PASSWORD still set, https.
- [x] Daily email at 8am Hong Kong time or later (checked every 30 min and 1 min after start) to HEALTH_ALERT_EMAIL, else ORDER_ALERT_EMAIL, else ADMIN_EMAIL; only when something needs a look; one per day, claimed in the settings table so two processes never double-send.
- [ ] Owner: set OPERATOR_NAME/OPERATOR_ADDRESS (and HEALTH_ALERT_EMAIL) on Hostinger; check the "where results come from" wording matches how you really enter results.

## Pending items done (nextjs)
- [x] Results search: find a draw by number (1 to 49, main or extra) or by draw number (26/104 or 104); only inside the visitor's visible window, so locked history cannot be searched; searched/sorted pages are noindex; parameterised SQL.
- [x] Health check also warns when no data backup (Settings > Download full backup) was downloaded in the last 7 days (read from the audit log).
- [x] "How it works" 3-step strip on the picker.
- [x] Win emails already existed (notifyWins).
- [ ] Not built, on purpose: draw reminder emails (need an opt-in setting first, privacy page promises mail only about things the user asked for); auto-publish and auto-approve (a wrong automatic payout is hard to undo); fetching results from an outside site (no source agreed); Chinese translation of the pages (large; needs a reviewed translation).

## Owner-view polish (nextjs)
- [x] Home: trust chips (Free play, No deposits, No cash-out, 18+), guest sign-up line with the welcome points, "How it works" and facts rewritten to match the real points flow (they still said "never take bets, use the HKJC"), tools strip (Check my numbers, Search results, Statistics, Leaderboard).
- [x] New logo (three balls in a gold ring, flat fills) in the header, favicon, apple icon and PWA icons; share images carry "Free play · 18+" and the domain.
- [x] Trust lines: sign-up page ("Free play only..."), result pages ("Entered by our team from the official result... Tell us").
- [x] Opt-in draw reminder emails: users.remind / remind_sent, toggle in Account > Settings (off by default), one email per draw when it closes within 24h, only confirmed and unblocked users, signed unsubscribe link (confirm button, no login) and List-Unsubscribe header, privacy text updated.
- [ ] Not built: product video / animation, weekly statistics email, Chinese version (needs a reviewed translation), real photo or name on About (needs OPERATOR_NAME). Bot screen on the live site is a Hostinger setting (hPanel), not code.

## Points transfer between members with QR (nextjs)
- [x] Each member has a random pay code (users.pay_code, 10 characters, no look-alikes) and a QR code of https://.../pay/CODE at Account > Send & receive; "Make a new code" replaces it and the old QR stops working.
- [x] Scan (phone camera) > log in if needed > /pay/CODE shows the recipient's nickname (or "Member 1234", never an email) > amount + password (+ authenticator code for two-step users) > Send. Or paste a code/link on the same page.
- [x] One database transaction: both rows locked lowest id first, rules checked on the locked balances, both balances and both history lines written together. One-time form id makes double-click/retry send once. 56 end-to-end checks incl. QR decode, races, crossing transfers, daily cap.
- [x] Safety: confirmed email on both sides, account at least N days old to send, max per transfer, max per 24 hours, 10 attempts per 10 minutes, 5 wrong passwords per 15 minutes (only failures count), admin on/off switch and limits in Settings, Admin > Transfers list, recipient email, blocked/deleted/unconfirmed accounts cannot receive.
- [x] Bug fixed: deleting an account zeroed the balance without a history line, so Points check flagged it forever; it now writes "Account deleted".
- [x] Terms, privacy and About updated (points could not be transferred before).
- [ ] Owner: watch Admin > Transfers for many small transfers into one account (the remaining abuse route is aged accounts feeding one account); lower the daily limit or switch sending off in Settings if you see it.

## Safety net (nextjs)
- [x] `npm run check:deploy`: rehearses Hostinger's production install + build (normal and --legacy-peer-deps) in a clean copy. Verified it fails on the exact mistake that broke the live build (type package in devDependencies).
- [x] Server error alerts: Next's onRequestError emails the owner (HEALTH_ALERT_EMAIL > ORDER_ALERT_EMAIL > ADMIN_EMAIL), at most one email per 10 minutes and the same error once an hour; no query string, cookies or body. 11 e2e checks.
- [x] Dependencies: minor/patch updates applied. `npm audit` still lists 8 issues, all in Tailwind 3's build-time chain (braces, micromatch, postcss-selector-parser); no fix exists short of a Tailwind 4 migration, and none run at request time.
- [x] Admin dashboard: transfers in the last 24 hours and members with draw reminders.
- [ ] Not done: friend invite link, weekly leaderboard reset, achievements, in-site QR scanner, Chinese version (need your decisions or a translator).
