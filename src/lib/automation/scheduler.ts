// eslint-disable-next-line @typescript-eslint/no-require-imports
const cron = require('node-cron') as typeof import('node-cron');
import { prisma } from '@/lib/db';
import { AutomationEngine } from './engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scheduledTask: any = null;
let currentCronExpr = '';

export async function initScheduler() {
  // Only run in server context (not during Next.js build)
  if (typeof window !== 'undefined') return;

  const settings = await prisma.settings.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  const cronExpr = settingsMap['automation_schedule'] ?? '0 */6 * * *';
  startScheduler(cronExpr);
}

export function startScheduler(cronExpr: string) {
  if (scheduledTask) {
    scheduledTask.stop?.();
    scheduledTask = null;
  }

  if (!cron.validate(cronExpr)) {
    console.error(`[Scheduler] Invalid cron expression: ${cronExpr}`);
    return;
  }

  currentCronExpr = cronExpr;
  console.log(`[Scheduler] Starting with schedule: ${cronExpr}`);

  scheduledTask = cron.schedule(cronExpr, async () => {
    console.log('[Scheduler] Triggering automation run...');
    try {
      const credentials = await prisma.platformCredential.findMany({ where: { isActive: true } });
      if (credentials.length === 0) {
        console.log('[Scheduler] No active credentials, skipping run');
        return;
      }

      const run = await prisma.automationRun.create({
        data: {
          status: 'running',
          platforms: JSON.stringify(credentials.map(c => c.platform)),
        },
      });

      const engine = new AutomationEngine(run.id);
      await engine.run();
    } catch (err) {
      console.error('[Scheduler] Error during scheduled run:', err);
    }
  });
}

export function stopScheduler() {
  scheduledTask?.stop();
  scheduledTask = null;
}

export function getCurrentCronExpr() {
  return currentCronExpr;
}
