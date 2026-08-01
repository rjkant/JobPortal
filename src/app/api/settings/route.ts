import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/get-user-id';

const DEFAULTS: Record<string, string> = {
  automation_schedule: '0 */6 * * *',
  max_applications_per_run: '20',
  min_match_score: '60',
  auto_apply_enabled: 'true',
  gemini_model: 'gemini-1.5-flash',
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.settings.findMany({ where: { userId } });
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) settings[row.key] = row.value;
    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: Record<string, string> = await req.json();

    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.settings.upsert({
          where: { userId_key: { userId, key } },
          update: { value: String(value) },
          create: { userId, key, value: String(value) },
        })
      )
    );

    const rows = await prisma.settings.findMany({ where: { userId } });
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) settings[row.key] = row.value;
    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
