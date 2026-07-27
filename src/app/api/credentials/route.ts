import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const credentials = await prisma.platformCredential.findMany();
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

export async function POST(req: Request) {
  try {
    const { platform, email, password } = await req.json();
    if (!platform || !email || !password) {
      return NextResponse.json({ error: 'platform, email and password required' }, { status: 400 });
    }

    const existing = await prisma.platformCredential.findFirst({ where: { platform } });
    const encryptedPassword = encrypt(password);

    const cred = existing
      ? await prisma.platformCredential.update({
          where: { id: existing.id },
          data: { email, password: encryptedPassword, isActive: true }
        })
      : await prisma.platformCredential.create({
          data: { platform, email, password: encryptedPassword }
        });

    return NextResponse.json({ id: cred.id, platform: cred.platform, email: cred.email, isActive: cred.isActive });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save credential' }, { status: 500 });
  }
}
