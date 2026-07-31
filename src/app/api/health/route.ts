import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbError: string | null = null;

  try {
    // Lightweight probe — checks connection and that Settings table exists
    await prisma.settings.count();
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(
    {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      dbError,
      timestamp: new Date().toISOString(),
    },
    // Always 200 so Railway health check passes even during transient DB issues
    { status: 200 }
  );
}
