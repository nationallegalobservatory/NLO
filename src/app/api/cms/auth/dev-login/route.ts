import { NextRequest, NextResponse } from 'next/server';
import { signSession, setSessionCookie } from '@/lib/cms/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cms/auth/dev-login
 *
 * One-click development login for testing the CMS locally.
 * Disabled in production environments.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEV_LOGIN) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { email, name, role } = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    role?: string;
  };

  const userEmail = email?.trim() || 'bhoomija.k2810@gmail.com';
  const userName = name?.trim() || (userEmail.includes('utkarsh') ? 'Utkarsh Mani Tripathi' : 'Bhoomija Khanna');
  const userRole = (role === 'editor' || role === 'viewer') ? role : 'owner';

  try {
    const token = await signSession({ email: userEmail, name: userName, role: userRole });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { email: userEmail, name: userName, role: userRole },
    });
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
 * Direct browser link that signs the session cookie and immediately redirects to /cms/dashboard.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEV_LOGIN) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email') || 'utkarshmanitripathi2006@gmail.com';
  const name = searchParams.get('name') || 'Utkarsh Mani Tripathi';
  const role = searchParams.get('role') || 'owner';
  const next = searchParams.get('next') || '/cms/dashboard';

  const userRole = (role === 'editor' || role === 'viewer') ? role : 'owner';
  const token = await signSession({ email, name, role: userRole });

  const url = req.nextUrl.clone();
  url.pathname = next.startsWith('/cms') ? next : '/cms/dashboard';
  url.search = '';

  const res = NextResponse.redirect(url);
  res.cookies.set('nlo-cms-session', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 24 * 60 * 60,
  });

  return res;
}
