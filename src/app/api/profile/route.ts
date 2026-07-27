import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    let profile = await prisma.userProfile.findFirst();
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { fullName: '', email: '', phone: '', location: '', currentRole: '' }
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const existing = await prisma.userProfile.findFirst();

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

    const profile = existing
      ? await prisma.userProfile.update({ where: { id: existing.id }, data })
      : await prisma.userProfile.create({ data });

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
