import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/get-user-id';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const weekAgo = subDays(new Date(), 7);

    // Scope all queries to user's jobs
    const userJobIds = (await prisma.jobListing.findMany({
      where: { userId },
      select: { id: true },
    })).map(j => j.id);

    const [
      totalApplications,
      appliedThisWeek,
      shortlisted,
      interviews,
      offers,
      recentApplications,
      lastRun,
    ] = await Promise.all([
      prisma.application.count({ where: { jobId: { in: userJobIds } } }),
      prisma.application.count({ where: { jobId: { in: userJobIds }, appliedAt: { gte: weekAgo } } }),
      prisma.application.count({ where: { jobId: { in: userJobIds }, status: 'shortlisted' } }),
      prisma.application.count({ where: { jobId: { in: userJobIds }, status: 'interview' } }),
      prisma.application.count({ where: { jobId: { in: userJobIds }, status: 'offer' } }),
      prisma.application.findMany({
        where: { jobId: { in: userJobIds } },
        take: 10,
        orderBy: { appliedAt: 'desc' },
        include: {
          job: { select: { title: true, company: true, platform: true } },
        },
      }),
      prisma.automationRun.findFirst({
        where: { userId, status: 'completed' },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    const appJobs = await prisma.application.findMany({
      where: { jobId: { in: userJobIds } },
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
