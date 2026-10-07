// Runs once when the server starts: creates missing tables and seeds defaults. Safe to repeat.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { dbConfigured } = await import('./lib/db');
  if (!dbConfigured) {
    console.log('startup: no database configured, skipping migration');
    return;
  }
  const { migrate } = await import('./lib/migrate');
  await migrate()
    .then(() => console.log('startup: database ready'))
    .catch((err) => console.error('Database migration failed:', err));
}
