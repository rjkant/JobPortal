/**
 * Next.js Instrumentation — runs once when the server starts.
 * This is where we boot the automation scheduler.
 * https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register() {
  // Only run on Node.js server runtime, not on Edge or during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initScheduler } = await import('./lib/automation/scheduler');
      await initScheduler();
      console.log('[JobPilot] Automation scheduler initialized');
    } catch (err) {
      // Non-fatal — server continues even if scheduler fails to init
      console.error('[JobPilot] Scheduler init failed (non-fatal):', err);
    }
  }
}
