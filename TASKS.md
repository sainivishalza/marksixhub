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

Todo (in order):
1. Deploy branch `nextjs` to a STAGING site on Hostinger (staging.marksixhub.com, its own new database, BASE_URL=https://staging.marksixhub.com). Walk through: register, login, admin draw add/publish, CSV import, FAQ edit, settings, maintenance. Fix any SQL errors from the runtime logs.
2. Lighthouse + header check on staging
3. Switch live: point marksixhub.com at the nextjs branch (or merge nextjs into main), keep the same database. Tables migrate automatically and are compatible with the old Express app.
4. Later: guide posts (MDX), logo upload and brand colours (needs file storage), page-view analytics (Plausible/Umami), forgot-password (needs email)

Deliberate deviations from the brief (see DESIGN.md): 7 ball columns on mobile (not 4), no "extra number" in the picker, real Mark Six ball colours, no SearchAction schema (no site search exists), "Free to use" instead of "Free forever", no notification bell (nothing to notify), page views not tracked yet.
