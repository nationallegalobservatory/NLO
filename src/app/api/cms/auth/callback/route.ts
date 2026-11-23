import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { signSession, setSessionCookie, isAuthorizedCmsEmail } from '@/lib/cms/session';
import { checkAuthRateLimit, clientIp, resetAuthRateLimit } from '@/lib/cms/rateLimit';
import { auditCmsAuth } from '@/lib/cms/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cms/auth/callback?token=...
 *
 * Validates the magic-link token (single-use), sets a signed HTTP-only
 * session cookie, and redirects into the CMS.
 */
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkAuthRateLimit(`callback:${ip}`);
  if (!rl.allowed) {
    return NextResponse.redirect(new URL('/cms/login?error=rate_limited', req.url));
  }

  if (!isCmsBackendConfigured()) {
    return NextResponse.redirect(new URL('/cms/login?error=not_configured', req.url));
  }

  const token = req.nextUrl.searchParams.get('token');
  const rawNext = req.nextUrl.searchParams.get('next') || '/cms/dashboard';
  // Only allow in-app CMS paths — block open redirects.
  const next = rawNext.startsWith('/cms') ? rawNext : '/cms/dashboard';

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
    await auditCmsAuth('login_failed', 'unknown', req);
    return NextResponse.redirect(new URL('/cms/login?error=invalid_token', req.url));
  }

  if (!isAuthorizedCmsEmail(user.email)) {
    // Defense in depth: even a valid DB token for a non-authorized identity
    // must never mint a session.
    await admin
      .from('cms_users')
      .update({ magic_link_token: null, magic_link_expires_at: null })
      .eq('id', user.id);
    await auditCmsAuth('login_failed', user.email, req);
    return NextResponse.redirect(new URL('/cms/login?error=invalid_token', req.url));
  }

  if (!user.magic_link_expires_at || new Date(user.magic_link_expires_at) < new Date()) {
    await auditCmsAuth('login_failed', user.email, req);
    return NextResponse.redirect(new URL('/cms/login?error=expired_token', req.url));
  }

  // Consume the token (one-time use) before minting the session.
  await admin
    .from('cms_users')
    .update({
      magic_link_token: null,
      magic_link_expires_at: null,
      last_login_at: new Date().toISOString(),
      failed_login_attempts: 0,
      lockout_until: null,
    })
    .eq('id', user.id);

  const sessionToken = await signSession({
    email: user.email,
    name: user.name,
    role: user.role as 'owner' | 'editor' | 'viewer',
  });
  await setSessionCookie(sessionToken);
  resetAuthRateLimit(`callback:${ip}`);
  await auditCmsAuth('login_success', user.email, req);

  return NextResponse.redirect(new URL(next, req.url));
}
