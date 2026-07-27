import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.platformCredential.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await params;
    const cred = await prisma.platformCredential.update({
      where: { id },
      data: { isActive: body.isActive }
    });
    return NextResponse.json({ id: cred.id, platform: cred.platform, isActive: cred.isActive });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 });
  }
}
