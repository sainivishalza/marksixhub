# Decisions
- 2026-10-07: Plain static HTML + CSS, zero dependencies. Why: least code, fastest load, smallest attack surface, best SEO.
- 2026-10-07: Host-neutral `_headers` file (Netlify/Cloudflare Pages format). Convert to vercel.json if hosting on Vercel.
- 2026-10-07: No inline scripts/styles so CSP can stay strict (`'self'` only).
- 2026-10-07: Domain is marksixhub.com. Scope = information + number-picker only. Proxy betting and wallets excluded (Gambling Ordinance, licensing, no HKJC API). Do not put "HKJC" in branding (trademark); describe as "Hong Kong Mark Six".
- 2026-10-07: Hosting = Hostinger shared (Apache/LiteSpeed, PHP + MySQL), deployed by Git from GitHub. Replaces Cloudflare Pages/Supabase idea. Security headers live in .htaccess (not _headers). DB credentials must live OUTSIDE public_html, never in the repo.
