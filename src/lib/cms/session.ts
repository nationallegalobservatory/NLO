import { cookies } from 'next/headers';

const SESSION_COOKIE = 'nlo-cms-session';
const SESSION_TTL_HOURS = 24 * 14; // 14 days

export type CmsRole = 'owner' | 'editor' | 'viewer';

export interface CmsSession {
  email: string;
  name: string;
  role: CmsRole;
  expiresAt: number;
}

interface CmsSessionPayload {
  email: string;
  name: string;
  role: CmsRole;
  exp: number;
}

/** Sign a session JWT with a server-only secret. */
export async function signSession(payload: Omit<CmsSessionPayload, 'exp'>): Promise<string> {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'CMS_SESSION_SECRET is not set. Add it to .env.local before using the CMS. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
  const exp = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const body: CmsSessionPayload = { ...payload, exp };

  // Tiny HMAC-SHA256 signer using the Web Crypto API (no extra deps).
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const data = `${payload.email}.${payload.role}.${exp}`;
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigB64 = Buffer.from(sig).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${payloadB64}.${sigB64}`;
}

export async function verifySession(token: string): Promise<CmsSession | null> {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret) return null;

  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );

  let body: CmsSessionPayload;
  try {
    body = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const expected = Buffer.from(
    await crypto.subtle.sign('HMAC', key, enc.encode(`${body.email}.${body.role}.${body.exp}`)),
  ).toString('base64url');
  if (expected !== sigB64) return null;
  if (body.exp < Date.now()) return null;

  return { email: body.email, name: body.name, role: body.role, expiresAt: body.exp };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<CmsSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<CmsSession> {
  const session = await readSession();
  if (!session) {
    throw new Error('UNAUTHENTICATED');
  }
  return session;
}
