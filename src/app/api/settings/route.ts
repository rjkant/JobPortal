import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DEFAULTS: Record<string, string> = {
  automation_schedule: '0 */6 * * *',     // every 6 hours
  max_applications_per_run: '20',
  min_match_score: '60',
  auto_apply_enabled: 'true',
  gemini_model: 'gemini-1.5-flash',
};

export async function GET() {
  try {
    const rows = await prisma.settings.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body: Record<string, string> = await req.json();

    // Upsert each setting
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    const rows = await prisma.settings.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
