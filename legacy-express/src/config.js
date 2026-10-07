const env = process.env;
const prod = env.NODE_ENV === 'production';

if (prod && (env.SESSION_SECRET || '').length < 32) {
  throw new Error('SESSION_SECRET (32+ chars) is required in production');
}

module.exports = {
  prod,
  port: Number(env.PORT) || 3000,
  baseUrl: (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  secret: env.SESSION_SECRET || 'dev-only-secret-change-me',
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  db: {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASS || '',
    database: env.DB_NAME || 'marksixhub',
  },
};
