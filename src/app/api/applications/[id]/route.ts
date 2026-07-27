import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await params;
    const app = await prisma.application.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      }
    });
    return NextResponse.json(app);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const app = await prisma.application.findUnique({
      where: { id },
      include: { job: true }
    });
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(app);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}
