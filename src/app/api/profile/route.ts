import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/get-user-id';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { userId, fullName: '', email: '', phone: '', location: '', currentRole: '' }
      });
    }
    return NextResponse.json({
      ...profile,
      skills: JSON.parse(profile.skills || '[]'),
      desiredRoles: JSON.parse(profile.desiredRoles || '[]'),
      preferredLocs: JSON.parse(profile.preferredLocs || '[]'),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = {
      fullName: body.fullName ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      location: body.location ?? '',
      totalExperience: parseFloat(body.totalExperience) || 0,
      currentRole: body.currentRole ?? '',
      skills: JSON.stringify(Array.isArray(body.skills) ? body.skills : []),
      desiredRoles: JSON.stringify(Array.isArray(body.desiredRoles) ? body.desiredRoles : []),
      preferredLocs: JSON.stringify(Array.isArray(body.preferredLocs) ? body.preferredLocs : []),
      expectedCTC: body.expectedCTC ?? '',
      noticePeriod: body.noticePeriod ?? '',
      linkedinUrl: body.linkedinUrl ?? '',
      summary: body.summary ?? '',
    };

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json({
      ...profile,
      skills: JSON.parse(profile.skills || '[]'),
      desiredRoles: JSON.parse(profile.desiredRoles || '[]'),
      preferredLocs: JSON.parse(profile.preferredLocs || '[]'),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
