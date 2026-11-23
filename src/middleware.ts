import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/cms/session';

const SESSION_COOKIE = 'nlo-cms-session';

const PUBLIC_CMS_PATHS = new Set([
  '/cms/login',
  '/api/cms/auth/magic',
  '/api/cms/auth/callback',
  '/api/cms/auth/logout',
  '/api/cms/auth/dev-login',
]);

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const isDevLoginAllowed =
  process.env.NODE_ENV !== 'production' || Boolean(process.env.ENABLE_DEV_LOGIN);

const ALLOWED_ORIGINS = new Set(
  [
    'https://legal-observatory.vercel.app',
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : null,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null,
    process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3002' : null,
  ].filter((o): o is string => Boolean(o)),
);

/** CSRF guard: state-changing CMS API calls must originate from NLO itself. */
function checkOrigin(req: NextRequest): NextResponse | null {
  if (!MUTATING_METHODS.has(req.method)) return null;
  if (!req.nextUrl.pathname.startsWith('/api/cms')) return null;

  const origin = req.headers.get('origin');
  // No Origin header → non-browser client (curl, server-to-server). The
  // SameSite=Strict session cookie is not attached cross-site anyway.
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return null;
  return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /cms/* and /api/cms/*
  if (!pathname.startsWith('/cms') && !pathname.startsWith('/api/cms')) {
    return NextResponse.next();
  }

  const originRejection = checkOrigin(request);
  if (originRejection) return originRejection;

  if (pathname === '/api/cms/auth/dev-login' && !isDevLoginAllowed) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  if (PUBLIC_CMS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/cms/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'FORBIDDEN_IDENTITY' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/cms/login';
    url.search = '';
    url.searchParams.set('error', 'session_expired');
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cms/:path*', '/api/cms/:path*'],
};
