import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/cms/subscribers
 * body: { text: string, source?: string }
 *
 * Parses newline/comma/semicolon-separated emails, upserts into
 * newsletter_subscribers, returns counts.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { text, source } = (await req.json().catch(() => ({}))) as {
    text?: string;
    source?: string;
  };
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'NO_TEXT' }, { status: 400 });
  }

  const tokens = text
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const valid = tokens.filter((t) => EMAIL_RE.test(t));
  const skipped = tokens.length - valid.length;
  const dedup = [...new Set(valid)];

  if (dedup.length === 0) {
    return NextResponse.json({ added: 0, skipped, total: 0 });
  }

  if (isCmsBackendConfigured()) {
    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        const rows = dedup.map((email) => ({
          email,
          source: source || 'import',
          active: true,
        }));

        const { error } = await admin
          .from('newsletter_subscribers')
          .upsert(rows, { onConflict: 'email', ignoreDuplicates: true });

        if (!error) {
          const { count: total } = await admin
            .from('newsletter_subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('active', true);

          return NextResponse.json({ added: dedup.length, skipped, total: total ?? dedup.length });
        }
        console.warn('Supabase subscribers upsert error, falling back to local database store:', error);
      } catch (err) {
        console.warn('Supabase subscribers exception, falling back to local database store:', err);
      }
    }
  }

  // Local database store fallback
  const { addLocalSubscribers } = await import('@/lib/cms/localStore');
  const res = addLocalSubscribers(dedup, source || 'import');
  return NextResponse.json({ added: res.added, skipped, total: res.total });
}
