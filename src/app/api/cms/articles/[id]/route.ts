import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/cms/articles/[id]
 * body: partial article fields
 *
 * id is the slug. Only owners + editors can write.
 * For monthly-report format, snap publish time to 27th 18:30 IST of the chosen month.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isCmsBackendConfigured()) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (session.role === 'viewer') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id } = await params;
  const slug = decodeURIComponent(id);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });

  // Monthly Review editorial rule: snap to 27th 18:30 IST.
  if (body.format === 'monthly-report' && body.cms_publish_at) {
    const d = new Date(body.cms_publish_at as string);
    if (!isNaN(d.getTime())) {
      d.setUTCDate(27);
      d.setUTCHours(13, 0, 0, 0); // 18:30 IST == 13:00 UTC
      body.cms_publish_at = d.toISOString();
    }
  }

  const update: Record<string, unknown> = {
    cms_updated_at: new Date().toISOString(),
    cms_updated_by: session.email,
  };

  const allowed: Array<keyof typeof body> = [
    'title',
    'content',
    'abstract',
    'citation',
    'coverImage',
    'cms_cover_image_path',
    'categories',
    'tags',
    'format',
    'publishAt',
    'cms_publish_at',
    'cms_status',
  ];
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }

  const { data, error } = await admin
    .from('articles')
    .update(update)
    .eq('slug', slug)
    .select('slug, cms_status')
    .single();

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, article: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isCmsBackendConfigured()) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (session.role !== 'owner') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const { id } = await params;
  const slug = decodeURIComponent(id);
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });

  const { error } = await admin.from('articles').update({ cms_status: 'archived' }).eq('slug', slug);
  if (error) {
    return NextResponse.json({ error: 'DB_ERROR', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
