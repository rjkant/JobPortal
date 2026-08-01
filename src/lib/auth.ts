import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'jobpilot-dev-secret-change-in-production'
);
const COOKIE_NAME = 'job_token';
const EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

/** Sign a JWT and return the token string */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

/** Verify a JWT token string and return the payload, or null if invalid */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/** Set the auth cookie in the current response context (server action / route handler) */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/',
  });
}

/** Clear the auth cookie */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Get the authenticated user from the request cookies, or null */
export async function getAuthUser(req?: NextRequest): Promise<JwtPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}

/** Shorthand: get userId or throw 401 response */
export async function requireAuth(req?: NextRequest): Promise<JwtPayload> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}
