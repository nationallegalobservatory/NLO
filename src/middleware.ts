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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /cms/* and /api/cms/*
  if (!pathname.startsWith('/cms') && !pathname.startsWith('/api/cms')) {
    return NextResponse.next();
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
      return NextResponse.json({ error: 'SESSION_EXPIRED' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/cms/login';
    url.searchParams.set('next', pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cms/:path*', '/api/cms/:path*'],
};
