import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const [run, logs] = await Promise.all([
      prisma.automationRun.findUnique({ where: { id: runId } }),
      prisma.automationLog.findMany({
        where: { runId },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      run: {
        ...run,
        platforms: JSON.parse(run.platforms || '[]'),
        errors: run.errors ? JSON.parse(run.errors) : [],
      },
      logs,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
