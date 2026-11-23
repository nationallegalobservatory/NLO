import { NextRequest, NextResponse } from 'next/server';
import { signSession, setSessionCookie, isAuthorizedCmsEmail, type CmsRole } from '@/lib/cms/session';
import { auditCmsAuth } from '@/lib/cms/audit';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'nlo-cms-session';
const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;

function devLoginAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || Boolean(process.env.ENABLE_DEV_LOGIN);
}

function resolveIdentity(searchParams: URLSearchParams, body?: {
  email?: string;
  name?: string;
  role?: string;
}) {
  const email = (body?.email ?? searchParams.get('email') ?? 'bhoomija.k2810@gmail.com')
    .trim()
    .toLowerCase();
  const name = (body?.name ?? searchParams.get('name') ?? 'Bhoomija Khanna').trim();
  const roleParam = body?.role ?? searchParams.get('role') ?? 'owner';
  const role: CmsRole = roleParam === 'editor' || roleParam === 'viewer' ? roleParam : 'owner';
  return { email, name, role };
}

/**
 * POST /api/cms/auth/dev-login
 *
 * Development-only sign-in for testing the CMS locally. Disabled in
 * production unless ENABLE_DEV_LOGIN=true. The minted session still has to
 * pass the authorized-identity gate in verifySession.
 */
export async function POST(req: NextRequest) {
  if (!devLoginAllowed()) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    role?: string;
  };
  const { email, name, role } = resolveIdentity(new URL(req.url).searchParams, body);

  if (!isAuthorizedCmsEmail(email)) {
    await auditCmsAuth('login_failed', email, req);
    return NextResponse.json({ error: 'FORBIDDEN_IDENTITY' }, { status: 403 });
  }

  try {
    const token = await signSession({ email, name, role });
    await setSessionCookie(token);
    await auditCmsAuth('login_success', email, req);

    return NextResponse.json({ ok: true, user: { email, name, role } });
  } catch (err) {
    return NextResponse.json(
      { error: 'SIGN_ERROR', message: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cms/auth/dev-login
 *
 * Direct browser link that signs the session cookie and redirects to /cms.
 */
export async function GET(req: NextRequest) {
  if (!devLoginAllowed()) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { email, name, role } = resolveIdentity(req.nextUrl.searchParams);

  if (!isAuthorizedCmsEmail(email)) {
    await auditCmsAuth('login_failed', email, req);
    return NextResponse.json({ error: 'FORBIDDEN_IDENTITY' }, { status: 403 });
  }

  const rawNext = req.nextUrl.searchParams.get('next') || '/cms/dashboard';
  const next = rawNext.startsWith('/cms') ? rawNext : '/cms/dashboard';

  const token = await signSession({ email, name, role });

  const url = req.nextUrl.clone();
  url.pathname = next;
  url.search = '';

  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  await auditCmsAuth('login_success', email, req);
  return res;
}
