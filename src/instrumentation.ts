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

  // Daily health email: check every 30 minutes; sendDailyDigest sends at most once a day and only when something needs a look.
  const g = globalThis as { __healthTimer?: ReturnType<typeof setInterval> };
  if (!g.__healthTimer) {
    const { sendDailyDigest } = await import('./lib/health');
    const { sendReminders } = await import('./lib/reminders');
    const run = () => {
      void sendDailyDigest().catch((err) => console.error('daily health email failed:', err));
      void sendReminders().catch((err) => console.error('draw reminders failed:', err));
    };
    g.__healthTimer = setInterval(run, Number(process.env.HEALTH_INTERVAL_MS) || 30 * 60_000);
    g.__healthTimer.unref();
    setTimeout(run, 60_000).unref(); // also soon after a restart, so a deploy never skips the morning email
  }
}
