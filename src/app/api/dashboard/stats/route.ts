import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

export async function GET() {
  try {
    const weekAgo = subDays(new Date(), 7);

    const [
      totalApplications,
      appliedThisWeek,
      shortlisted,
      interviews,
      offers,
      recentApplications,
      platformBreakdown,
      lastRun,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { appliedAt: { gte: weekAgo } } }),
      prisma.application.count({ where: { status: 'shortlisted' } }),
      prisma.application.count({ where: { status: 'interview' } }),
      prisma.application.count({ where: { status: 'offer' } }),
      prisma.application.findMany({
        take: 10,
        orderBy: { appliedAt: 'desc' },
        include: {
          job: { select: { title: true, company: true, platform: true } },
        },
      }),
      prisma.application.groupBy({
        by: ['jobId'],
        _count: { jobId: true },
      }),
      prisma.automationRun.findFirst({
        where: { status: 'completed' },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    // Platform breakdown: join with jobs
    const appJobs = await prisma.application.findMany({
      select: { job: { select: { platform: true } } },
    });
    const platformMap: Record<string, number> = {};
    for (const a of appJobs) {
      const p = a.job.platform;
      platformMap[p] = (platformMap[p] ?? 0) + 1;
    }
    const topPlatforms = Object.entries(platformMap)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    const successRate =
      totalApplications > 0
        ? Math.round(((shortlisted + interviews + offers) / totalApplications) * 100)
        : 0;

    // Next run: 6 hours after last completed run, or 6h from now
    const lastRunAt = lastRun?.completedAt ?? lastRun?.startedAt ?? new Date();
    const nextRunAt = new Date(lastRunAt.getTime() + 6 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      totalApplications,
      appliedThisWeek,
      shortlisted,
      interviews,
      successRate,
      topPlatforms,
      recentApplications: recentApplications.map(a => ({
        ...a,
        appliedAt: a.appliedAt.toISOString(),
      })),
      nextRunAt,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
