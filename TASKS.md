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

Todo (in order):
1. Auth: register/login/logout (scrypt `s1$` hashes from legacy work as-is), signed-cookie sessions (jose), rate limit, CSRF-safe server actions; /account with saved number sets ("Save" button on picker for logged-in users)
2. Admin (/admin, role admin): dashboard KPIs + chart (Recharts), draws CRUD (7 numbers, 7 prize tiers, publish/draft, CSV import), currencies, events, users (search, CSV export), content/SEO (FAQ editor, per-page meta, guide posts), settings (site name, maintenance mode, jackpot toggle). Needs new tables: faqs, page_seo, picks log
3. Roles editor/viewer (schema change: widen users.role enum, additive migration)
4. Tests with a real MySQL (none available locally); Lighthouse + header check on live
5. Deploy: Hostinger Node.js app, framework Next.js, build `npm run build`, start `npm start`; same env vars; merge nextjs into main only after steps 1-2 work

Deliberate deviations from the brief (see DESIGN.md): 7 ball columns on mobile (not 4), no "extra number" in the picker, real Mark Six ball colours, no SearchAction schema (no site search exists), "Free to use" instead of "Free forever", fonts via next/font/google (self-hosted at build).
