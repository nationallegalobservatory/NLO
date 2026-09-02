import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { requireSession } from '@/lib/cms/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cms/auth/invite
 * body: { email: string, name: string, role: 'owner'|'editor'|'viewer' }
 *
 * Only `owner` may invite. Idempotent on email (re-inviting updates name/role).
 */
export async function POST(req: NextRequest) {
  if (!isCmsBackendConfigured()) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }
  try {
    const session = await requireSession();
    if (session.role !== 'owner') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { email, name, role } = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    role?: string;
  };

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }
  if (!['owner', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'BAD_ROLE' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }

  const { data, error } = await admin
    .from('cms_users')
    .upsert(
      { email: email.trim().toLowerCase(), name, role },
      { onConflict: 'email' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: data });
}
