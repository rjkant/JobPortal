import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/get-user-id';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const credentials = await prisma.platformCredential.findMany({
      where: { userId, isActive: true },
    });

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'No active platform credentials configured. Add credentials in Settings.' },
        { status: 400 }
      );
    }

    const platforms = credentials.map(c => c.platform);

    const run = await prisma.automationRun.create({
      data: { userId, status: 'running', platforms: JSON.stringify(platforms) },
    });

    import('@/lib/automation/engine').then(({ AutomationEngine }) => {
      const engine = new AutomationEngine(run.id, userId);
      engine.run().catch(err => {
        console.error('Automation engine error:', err);
      });
    });

    return NextResponse.json({ runId: run.id, status: 'started', platforms });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to start automation' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const runs = await prisma.automationRun.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(
      runs.map(r => ({
        ...r,
        platforms: JSON.parse(r.platforms || '[]'),
        errors: r.errors ? JSON.parse(r.errors) : [],
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}
