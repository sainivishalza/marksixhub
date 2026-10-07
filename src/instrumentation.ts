// Runs once when the server starts: creates missing tables and seeds defaults. Safe to repeat.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { dbConfigured } = await import('./lib/db');
  if (!dbConfigured) return;
  const { migrate } = await import('./lib/migrate');
  await migrate().catch((err) => console.error('Database migration failed:', err));
}
