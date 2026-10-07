# Mark Six Hub

Information-only Hong Kong Mark Six site: results, prizes, draw calendar, number picker, statistics, user accounts (saved numbers, currency choice) and an admin panel. Node.js + Express + MySQL. No betting, no wallets.

## Run locally
1. Create a MySQL database and copy `.env.example` to `.env` (leave `NODE_ENV` unset locally).
2. `npm install`
3. `npm run dev` (tables are created automatically; the admin account comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Test
    npm test

## Deploy on Hostinger (Node.js app, from GitHub)
1. hPanel > Databases > create a MySQL database and user. Note the name, user and password.
2. Websites > Add website > Node.js Apps > import from GitHub (`sainivishalza/marksixhub`, branch `main`). Framework: Express. Node 20 or newer. Entry file `server.js`, start command `npm start`.
3. Set the environment variables from `.env.example` (including a strong `SESSION_SECRET`).
4. Deploy, open the site, log in at `/login` with the admin email and password, then remove `ADMIN_PASSWORD` from the environment.
5. Point `marksixhub.com` at the app and enable SSL.

## Admin panel (`/admin`)
Draws & results (add upcoming draws, publish results and prize tiers), events, currencies and rates, site settings (name, description, banner), users.
