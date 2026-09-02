import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { signSession, setSessionCookie } from '@/lib/cms/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cms/auth/callback?token=...
 *
 * Validates the magic-link token, sets a session cookie, redirects to /cms.
 */
export async function GET(req: NextRequest) {
  if (!isCmsBackendConfigured()) {
    return NextResponse.redirect(new URL('/cms/login?error=not_configured', req.url));
  }

  const token = req.nextUrl.searchParams.get('token');
  const next = req.nextUrl.searchParams.get('next') || '/cms/dashboard';

  if (!token) {
    return NextResponse.redirect(new URL('/cms/login?error=missing_token', req.url));
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.redirect(new URL('/cms/login?error=not_configured', req.url));
  }

  const { data: user, error } = await admin
    .from('cms_users')
    .select('id, email, name, role, magic_link_expires_at')
    .eq('magic_link_token', tokenHash)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.redirect(new URL('/cms/login?error=invalid_token', req.url));
  }

  if (!user.magic_link_expires_at || new Date(user.magic_link_expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/cms/login?error=expired_token', req.url));
  }

  // Consume the token (one-time use).
  await admin
    .from('cms_users')
    .update({
      magic_link_token: null,
      magic_link_expires_at: null,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  const sessionToken = await signSession({
    email: user.email,
    name: user.name,
    role: user.role as 'owner' | 'editor' | 'viewer',
  });
  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL(next, req.url));
}
