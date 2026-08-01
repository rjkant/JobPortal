import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/** Routes that don't require authentication */
const PUBLIC_PATHS = new Set(['/login', '/register']);
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();

  // Check JWT cookie
  const token = req.cookies.get('job_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Page routes → redirect to /login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Pass userId in header so API routes can read it without re-verifying
  const res = NextResponse.next();
  res.headers.set('x-user-id', user.userId);
  res.headers.set('x-user-email', user.email);
  res.headers.set('x-user-name', user.name);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
