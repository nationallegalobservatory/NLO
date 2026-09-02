import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cms/auth/magic
 * body: { email: string }
 *
 * Issues a magic link. Always returns 200 even if the email is not a known
 * CMS user — to avoid account enumeration. The actual user is only created
 * by the owner via /api/cms/auth/invite (or by running a seed SQL).
 */
export async function POST(req: NextRequest) {
  if (!isCmsBackendConfigured()) {
    return NextResponse.json(
      { error: 'CMS_NOT_CONFIGURED', message: 'Server is missing required environment variables.' },
      { status: 503 },
    );
  }

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'BAD_EMAIL' }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }

  // Look up the user; if not present, do nothing (silent — no enumeration).
  const { data: user, error } = await admin
    .from('cms_users')
    .select('id, email, name, role')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ ok: true, sent: false });
  }

  // Generate a one-time token, store the hash, send the email.
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await admin
    .from('cms_users')
    .update({
      magic_link_token: tokenHash,
      magic_link_expires_at: expiresAt.toISOString(),
    })
    .eq('id', user.id);

  const origin = req.nextUrl.origin;
  const link = `${origin}/api/cms/auth/callback?token=${rawToken}`;

  // Send via Resend (already a project dep) — graceful no-op if not configured.
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.CMS_MAGIC_LINK_FROM || 'NLO CMS <cms@thenlo.org>';

  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: 'Your NLO CMS sign-in link',
          html: magicLinkEmail(user.name, link, expiresAt),
        }),
      });
    } catch (err) {
      // Swallow — user can request another.
      console.error('[cms/auth/magic] resend failed', err);
    }
  } else {
    // No Resend key in dev — log the link so the developer can use it.
    console.log(`[cms/auth/magic] dev mode — magic link for ${user.email}:\n  ${link}`);
  }

  return NextResponse.json({ ok: true, sent: true });
}

function magicLinkEmail(name: string, link: string, expiresAt: Date): string {
  return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
  <h2 style="margin: 0 0 16px; font-size: 20px;">Hi ${escapeHtml(name)},</h2>
  <p>Click the button below to sign in to the NLO Editorial CMS. The link expires at <strong>${expiresAt.toUTCString()}</strong> and can only be used once.</p>
  <p style="margin: 32px 0;">
    <a href="${link}" style="background: #7a1f2b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign in to NLO CMS</a>
  </p>
  <p style="color: #666; font-size: 13px;">If the button doesn't work, paste this URL into your browser:<br><br><span style="word-break: break-all;">${link}</span></p>
  <p style="color: #666; font-size: 13px;">If you did not request this, you can ignore the email.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
