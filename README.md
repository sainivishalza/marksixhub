# Mark Six Hub (Next.js)

Information-only Hong Kong Mark Six site: number picker, results, prizes, guide and FAQ, user accounts with saved numbers, and an admin panel. Next.js 16 + MySQL. No betting, no wallets.

## Run locally
1. Copy `.env.example` to `.env.local` and fill in a MySQL database (or leave the `DB_*` values empty to preview public pages with sample data).
2. `npm install`
3. `npm run dev`

Checks: `npm run typecheck`, `npm test`, `npm run build`.

## Deploy on Hostinger (Node.js app from GitHub)
Works with the Express preset already set up: Hostinger runs `npm install` and starts `server.js`.
- `npm install` runs `scripts/postinstall.js`, which builds Next.js when `NODE_ENV=production`. All build tools are therefore in `dependencies` on purpose.
- `server.js` starts the Next.js production server. The Next.js preset (build `npm run build`, start `npm start`) also works.
- A failed build leaves the previous version live (Hostinger only switches after a successful build).
- Environment variables: see `.env.example`. Tables are created automatically on first start (`src/instrumentation.ts`), and the first admin comes from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Remove `ADMIN_PASSWORD` after the first login.
- A site whose `BASE_URL` host starts with `staging.` is served noindex with a robots.txt that blocks everything.

## Admin (`/admin`)
Roles: viewer (look only), editor (draws, events, FAQs, SEO), admin (also users, currencies, settings). Draws can be added one by one or imported from CSV.

## Layout
`src/app/(site)` public pages, `src/app/admin` admin, `src/actions` server actions (each checks the user's role), `src/lib` logic, `legacy-express/` the old Express app (reference only).

## Tests
- `npm test`: fast unit tests (`tests/*.test.ts`), no database needed.
- `npm run check:deploy`: rehearses the Hostinger production install and build in a clean copy. Run it before merging to `main`.
- `npm run e2e`: all browser tests (`tests/e2e/`) against a real local MariaDB, about 25 minutes. Needs a root-capable `mariadb` command and a browser (`npx playwright install chromium`, or set `CHROMIUM_PATH`). `npm run e2e -- 14 16` runs only suites 14 and 16. The paid 9-year history import was tested with a private dataset that is not in the repository.
