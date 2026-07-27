import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const applications = await prisma.application.findMany({
      where: status ? { status } : {},
      orderBy: { appliedAt: 'desc' },
      include: {
        job: {
          select: {
            title: true, company: true, location: true,
            platform: true, matchScore: true, skills: true
          }
        }
      }
    });

    return NextResponse.json(applications.map(a => ({
      ...a,
      job: {
        ...a.job,
        skills: JSON.parse(a.job.skills || '[]')
      }
    })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
