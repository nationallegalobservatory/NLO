import { getSupabaseAdmin } from '@/lib/cms/supabaseAdmin';

export type CmsAuthEvent =
  | 'login_request'
  | 'login_success'
  | 'login_failed'
  | 'login_throttled'
  | 'lockout'
  | 'logout';

/**
 * Append a CMS auth audit record. Fail-open: auditing must never break the
 * auth flow, so errors are swallowed (the table may not exist yet).
 */
export async function auditCmsAuth(
  eventType: CmsAuthEvent,
  emailAttempted: string,
  req?: Request,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return;
    await admin.from('cms_auth_audit_logs').insert({
      event_type: eventType,
      email_attempted: (emailAttempted || 'unknown').slice(0, 320),
      ip_address: req ? clientIpSafe(req) : null,
      user_agent: req?.headers.get('user-agent')?.slice(0, 512) || null,
    });
  } catch {
    // ignore — audit is best-effort
  }
}

function clientIpSafe(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim().slice(0, 64);
  return req.headers.get('x-real-ip')?.slice(0, 64) || null;
}
