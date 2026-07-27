/**
 * Session Manager
 *
 * Handles persisting and restoring platform login sessions (cookies)
 * so the bot doesn't need to log in on every run.
 *
 * Session cookies are stored encrypted in the PlatformCredential row
 * and are refreshed automatically after each successful scrape run
 * by BaseScraper.saveSessionCookies().
 */

import { prisma } from '@/lib/db';

export interface SessionStatus {
  platform: string;
  hasSession: boolean;
  lastLogin?: Date;
  isActive: boolean;
}

/** Return session health for all configured platforms */
export async function getAllSessionStatuses(): Promise<SessionStatus[]> {
  const credentials = await prisma.platformCredential.findMany({
    orderBy: { platform: 'asc' },
  });

  return credentials.map(cred => ({
    platform: cred.platform,
    hasSession: !!cred.sessionCookies,
    lastLogin: cred.lastLogin ?? undefined,
    isActive: cred.isActive,
  }));
}

/** Clear saved session cookies for a platform (force re-login next run) */
export async function clearSession(platform: string): Promise<void> {
  const cred = await prisma.platformCredential.findFirst({ where: { platform } });
  if (cred) {
    await prisma.platformCredential.update({
      where: { id: cred.id },
      data: { sessionCookies: null, lastLogin: null },
    });
  }
}

/** Clear all saved sessions */
export async function clearAllSessions(): Promise<void> {
  await prisma.platformCredential.updateMany({
    data: { sessionCookies: null, lastLogin: null },
  });
}

/** Check if a session is fresh (logged in within the last N hours) */
export function isSessionFresh(lastLogin: Date | null, maxAgeHours = 12): boolean {
  if (!lastLogin) return false;
  const ageMs = Date.now() - lastLogin.getTime();
  return ageMs < maxAgeHours * 60 * 60 * 1000;
}
