import { NextResponse } from 'next/server';

// Simple health check endpoint used by Railway to verify the server is running.
// Does NOT touch the database so it responds immediately on startup.
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
