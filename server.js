// Entry file for hosts that start an app from server.js (Hostinger's Express preset does this).
// It runs the Next.js production server; `next build` runs during `npm install` (see scripts/postinstall.js).
const http = require('node:http');
const next = require('next');

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http.createServer((req, res) => handle(req, res)).listen(port, () => console.log(`Mark Six Hub listening on ${port}`));
  })
  .catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
