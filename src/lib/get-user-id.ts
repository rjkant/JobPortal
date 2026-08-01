/**
 * Extract the authenticated userId from the request.
 * The middleware already verified the JWT and injected x-user-id into headers.
 * Falls back to reading the cookie directly (for edge cases).
 */
import { NextRequest } from 'next/server';
import { getAuthUser } from './auth';

export async function getUserId(req: NextRequest): Promise<string | null> {
  // Fast path: middleware already set the header
  const fromHeader = req.headers.get('x-user-id');
  if (fromHeader) return fromHeader;

  // Slow path: verify cookie ourselves
  const user = await getAuthUser(req);
  return user?.userId ?? null;
}
