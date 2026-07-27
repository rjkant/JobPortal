import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    // Get active credentials to determine which platforms to run
    const credentials = await prisma.platformCredential.findMany({
      where: { isActive: true },
    });

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'No active platform credentials configured. Add credentials in Settings.' },
        { status: 400 }
      );
    }

    const platforms = credentials.map(c => c.platform);

    // Create a new automation run record
    const run = await prisma.automationRun.create({
      data: {
        status: 'running',
        platforms: JSON.stringify(platforms),
      },
    });

    // Kick off the automation engine asynchronously (fire and forget)
    // Import dynamically to avoid loading Playwright on every request
    import('@/lib/automation/engine').then(({ AutomationEngine }) => {
      const engine = new AutomationEngine(run.id);
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

export async function GET() {
  try {
    const runs = await prisma.automationRun.findMany({
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
