# Mark Six Hub

## Goal
marksixhub.com: information-only Hong Kong Mark Six site (number picker, results, prizes, draw calendar, guide/FAQ, accounts for saved numbers, admin panel). NO betting, NO wallets, NO proxy orders (illegal/regulated). No horse racing. Never put "HKJC" in branding. Minimal code, zero known bugs.

## Workflow
- At session start: read TASKS.md and DESIGN.md. At end: update TASKS.md.
- Log non-obvious choices in DECISIONS.md. One task at a time.
- Never read node_modules or .next. Before finishing a change: `npm run typecheck`, `npm test`, `npm run build`.
- Branches: `main` = live Express site (still deployed on Hostinger). `nextjs` = the Next.js rebuild. Do not merge to main until TASKS.md says parity is reached.

## Stack (branch nextjs)
Next.js 16 App Router, React 19, TypeScript strict, Tailwind 3 (tokens in tailwind.config.ts), Framer Motion, Radix accordion, MySQL via mysql2.
- `src/app/*` routes. `src/components/*` UI. `src/lib/*`: `mark6.ts` (ball colours, quickPick, evaluate), `data.ts` (server-only DB reads), `format.ts`, `seo.ts`, `sample.ts` (dev-only fixtures when no DB is configured).
- `legacy-express/` is the old app, kept for reference until parity. Same MySQL tables; only add new tables, never change existing ones.
- Config from env vars only (`.env.example`). Never commit `.env`; the repo is public.

## Code rules
- Least code possible. Server components by default; `'use client'` only for the picker, countdown, jackpot, check form, currency switch, accordion.
- Tailwind class names must appear in full in source (no `` `ball-${x}` ``). Do not name a colour `base` (clashes with `text-base`).
- Prizes stored in HKD; other currencies are display-only conversions.
- Every SQL uses `?` placeholders. User-supplied text is rendered as text only (React escapes it).

## Security
- Headers in next.config.ts. Hostinger may overwrite CSP; do not rely on CSP alone.
- Passwords: scrypt (format `s1$salt$hash`, same as legacy). Sessions: signed cookie (jose). Rate-limit auth routes. Redirect targets must be same-site paths.

## SEO
- One h1 per page, Metadata API on every page via `pageMetadata()`, canonical URLs, JSON-LD (WebSite, BreadcrumbList, FAQPage, Event), sitemap.ts, robots.ts, OG images. Private pages are noindex.

## Design
See DESIGN.md. Balls are the only saturated colour; gold means actionable/selected. Mobile first, keyboard accessible, reduced motion respected.
