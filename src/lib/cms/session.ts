import { cookies } from 'next/headers';

const SESSION_COOKIE = 'nlo-cms-session';
const SESSION_TTL_HOURS = 24 * 14; // 14 days

/** The single authorized identity for the NLO Editorial CMS (RFC-2026-CMS-01). */
export const CMS_OWNER_EMAIL =
  process.env.CMS_OWNER_EMAIL || 'bhoomija.k2810@gmail.com';

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
  exp: number; // Unix timestamp in milliseconds
  nonce: string; // Random 16-byte cryptographic salt
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function jsonToB64url(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return b64urlEncode(bytes);
}

/** Constant-time byte comparison (edge-safe; no node:crypto in middleware). */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

function signatureInput(p: Pick<CmsSessionPayload, 'email' | 'role' | 'exp' | 'nonce'>): string {
  return `${p.email}.${p.role}.${p.exp}.${p.nonce}`;
}

/**
 * Authorized-email gate. Production is strictly single-tenant: only
 * CMS_OWNER_EMAIL (default bhoomija.k2810@gmail.com). In non-production,
 * CMS_DEV_EMAILS (comma-separated) may add throwaway local identities so
 * dev-login keeps working without weakening the production perimeter.
 */
export function isAuthorizedCmsEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized === CMS_OWNER_EMAIL.toLowerCase()) return true;
  if (process.env.NODE_ENV === 'production') return false;
  const dev = (process.env.CMS_DEV_EMAILS || 'utkarshmanitripathi2006@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return dev.includes(normalized);
}

/** Sign a session token: `<base64url(payload)>.<base64url(hmac_sha256)>`. */
export async function signSession(payload: Omit<CmsSessionPayload, 'exp' | 'nonce'>): Promise<string> {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'CMS_SESSION_SECRET is not set. Add it to .env.local before using the CMS. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const exp = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const body: CmsSessionPayload = { ...payload, exp, nonce: b64urlEncode(nonceBytes) };

  const sig = await hmacSha256(secret, signatureInput(body));
  return `${jsonToB64url(body)}.${b64urlEncode(sig)}`;
}

export async function verifySession(token: string): Promise<CmsSession | null> {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret) return null;

  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  let body: CmsSessionPayload;
  try {
    body = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)!));
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  if (typeof body.email !== 'string' || typeof body.role !== 'string' ||
      typeof body.exp !== 'number' || typeof body.nonce !== 'string') {
    return null;
  }

  const providedSig = b64urlDecode(sigB64);
  if (!providedSig) return null;
  const expectedSig = await hmacSha256(secret, signatureInput(body));
  if (!timingSafeEqualBytes(providedSig, expectedSig)) return null;
  if (body.exp < Date.now()) return null;
  if (!isAuthorizedCmsEmail(body.email)) return null;

  return {
    email: body.email,
    name: typeof body.name === 'string' ? body.name : body.email,
    role: (['owner', 'editor', 'viewer'] as const).includes(body.role as CmsRole)
      ? (body.role as CmsRole)
      : 'viewer',
    expiresAt: body.exp,
  };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
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
