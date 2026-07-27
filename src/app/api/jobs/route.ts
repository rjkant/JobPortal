import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const platform = searchParams.get('platform') ?? 'all';
    const minScore = parseInt(searchParams.get('minScore') ?? '0');
    const search = searchParams.get('search') ?? '';

    const where: Record<string, unknown> = {
      matchScore: { gte: minScore },
      ...(platform !== 'all' ? { platform } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { company: { contains: search } },
          { description: { contains: search } },
        ]
      } : {})
    };

    const [jobs, total] = await Promise.all([
      prisma.jobListing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ matchScore: 'desc' }, { fetchedAt: 'desc' }],
        include: { _count: { select: { applications: true } } }
      }),
      prisma.jobListing.count({ where })
    ]);

    return NextResponse.json({
      jobs: jobs.map(j => ({
        ...j,
        skills: JSON.parse(j.skills || '[]'),
        applied: j._count.applications > 0,
      })),
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
