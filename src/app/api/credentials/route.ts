import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { getUserId } from '@/lib/get-user-id';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const credentials = await prisma.platformCredential.findMany({ where: { userId } });
    return NextResponse.json(
      credentials.map(c => ({
        ...c,
        password: c.password ? '••••••••' : '',
        sessionCookies: undefined,
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, email, password } = await req.json();
    if (!platform || !email || !password) {
      return NextResponse.json({ error: 'platform, email and password required' }, { status: 400 });
    }

    const encryptedPassword = encrypt(password);

    const cred = await prisma.platformCredential.upsert({
      where: { userId_platform: { userId, platform } },
      update: { email, password: encryptedPassword, isActive: true },
      create: { userId, platform, email, password: encryptedPassword },
    });

    return NextResponse.json({ id: cred.id, platform: cred.platform, email: cred.email, isActive: cred.isActive });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save credential' }, { status: 500 });
  }
}
