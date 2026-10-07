const app = require('./src/app');
const cfg = require('./src/config');
const { migrate } = require('./src/setup');

migrate()
  .then(() => app.listen(cfg.port, () => console.log(`Mark Six Hub listening on ${cfg.port}`)))
  .catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
