// eslint-disable-next-line @typescript-eslint/no-require-imports
const cron = require('node-cron') as typeof import('node-cron');
import { prisma } from '@/lib/db';
import { AutomationEngine } from './engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scheduledTask: any = null;
let currentCronExpr = '';

export async function initScheduler() {
  if (typeof window !== 'undefined') return;

  let cronExpr = '0 */6 * * *';
  try {
    // Use the first available schedule setting (any user's)
    const setting = await prisma.settings.findFirst({
      where: { key: 'automation_schedule' },
    });
    cronExpr = setting?.value ?? cronExpr;
  } catch (err) {
    console.error('[Scheduler] Failed to load settings from DB, using default schedule:', err);
  }

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
    console.log('[Scheduler] Triggering automation runs for all active users...');
    try {
      // Find all users that have at least one active credential
      const activeCredentials = await prisma.platformCredential.findMany({
        where: { isActive: true },
        select: { userId: true, platform: true },
      });

      // Group by userId
      const byUser = new Map<string, string[]>();
      for (const c of activeCredentials) {
        const existing = byUser.get(c.userId) ?? [];
        existing.push(c.platform);
        byUser.set(c.userId, existing);
      }

      if (byUser.size === 0) {
        console.log('[Scheduler] No active credentials found, skipping');
        return;
      }

      // Run automation for each user
      for (const [userId, platforms] of byUser) {
        const run = await prisma.automationRun.create({
          data: {
            userId,
            status: 'running',
            platforms: JSON.stringify(platforms),
          },
        });

        const engine = new AutomationEngine(run.id, userId);
        engine.run().catch(err => {
          console.error(`[Scheduler] Run error for user ${userId}:`, err);
        });
      }
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
