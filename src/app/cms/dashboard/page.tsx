import Link from 'next/link';
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  drafts: number;
  scheduled: number;
  published: number;
  subscribers: number;
  pendingUploads: number;
  recentArticles: Array<{
    slug: string;
    title: string;
    date: string;
    cms_status: string;
    cms_publish_at: string | null;
  }>;
  recentSends: Array<{
    id: string;
    subject: string;
    status: string;
    scheduled_for: string | null;
    finished_at: string | null;
  }>;
}

async function loadStats(): Promise<DashboardStats | { error: string }> {
  if (!isCmsBackendConfigured()) {
    return { error: 'CMS not configured. See /cms/README.md.' };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { error: 'CMS not configured.' };

  const [
    { count: drafts },
    { count: scheduled },
    { count: published },
    { count: subscribers },
    { count: pendingUploads },
    { data: recentArticles },
    { data: recentSends },
  ] = await Promise.all([
    admin.from('articles').select('*', { count: 'exact', head: true }).eq('cms_status', 'draft'),
    admin.from('articles').select('*', { count: 'exact', head: true }).eq('cms_status', 'scheduled'),
    admin.from('articles').select('*', { count: 'exact', head: true }).eq('cms_status', 'published'),
    admin.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('active', true),
    admin
      .from('cms_uploads')
      .select('*', { count: 'exact', head: true })
      .or('extraction_status.eq.pending,refactor_status.eq.pending'),
    admin
      .from('articles')
      .select('slug, title, date, cms_status, cms_publish_at')
      .order('cms_updated_at', { ascending: false, nullsFirst: false })
      .limit(8),
    admin
      .from('cms_send_log')
      .select('id, campaign_subject, status, scheduled_for, finished_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    drafts: drafts ?? 0,
    scheduled: scheduled ?? 0,
    published: published ?? 0,
    subscribers: subscribers ?? 0,
    pendingUploads: pendingUploads ?? 0,
    recentArticles: (recentArticles ?? []) as DashboardStats['recentArticles'],
    recentSends: (recentSends ?? []).map((s) => ({
      id: String(s.id),
      subject: String(s.campaign_subject ?? ''),
      status: String(s.status ?? ''),
      scheduled_for: s.scheduled_for ?? null,
      finished_at: s.finished_at ?? null,
    })),
  };
}

export default async function CmsDashboardPage() {
  await requireSession();
  const stats = await loadStats();

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-8">
        <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
          Overview
        </p>
        <h1 className="text-2xl font-semibold mt-1">Dashboard</h1>
      </header>

      {'error' in stats ? (
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          {stats.error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            <Stat label="Drafts" value={stats.drafts} href="/cms/articles?status=draft" />
            <Stat label="Scheduled" value={stats.scheduled} href="/cms/articles?status=scheduled" />
            <Stat label="Published" value={stats.published} href="/cms/articles?status=published" />
            <Stat label="Subscribers" value={stats.subscribers} href="/cms/newsletter" />
            <Stat
              label="Pending uploads"
              value={stats.pendingUploads}
              href="/cms/upload"
              highlight={stats.pendingUploads > 0}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section>
              <header className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em]">Recent articles</h2>
                <Link href="/cms/articles" className="text-xs text-primary hover:underline">
                  View all →
                </Link>
              </header>
              <div className="border border-outline-variant">
                {stats.recentArticles.length === 0 ? (
                  <p className="p-4 text-sm text-on-surface-variant">No articles yet.</p>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {stats.recentArticles.map((a) => (
                      <li key={a.slug} className="px-4 py-3">
                        <Link
                          href={`/cms/articles/${encodeURIComponent(a.slug)}`}
                          className="block group"
                        >
                          <p className="text-sm font-medium group-hover:text-primary">{a.title}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {a.date} · <span className="uppercase tracking-[0.12em]">{a.cms_status}</span>
                            {a.cms_publish_at
                              ? ` · publishes ${new Date(a.cms_publish_at).toLocaleString()}`
                              : ''}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section>
              <header className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em]">Recent sends</h2>
                <Link href="/cms/newsletter" className="text-xs text-primary hover:underline">
                  Newsletter →
                </Link>
              </header>
              <div className="border border-outline-variant">
                {stats.recentSends.length === 0 ? (
                  <p className="p-4 text-sm text-on-surface-variant">No campaigns sent yet.</p>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {stats.recentSends.map((s) => (
                      <li key={s.id} className="px-4 py-3">
                        <p className="text-sm font-medium truncate">{s.subject}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {s.finished_at
                            ? `Sent ${new Date(s.finished_at).toLocaleString()}`
                            : s.scheduled_for
                              ? `Scheduled for ${new Date(s.scheduled_for).toLocaleString()}`
                              : 'Queued'}{' '}
                          · {s.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <div
      className={
        'border p-4 ' +
        (highlight
          ? 'border-primary/40 bg-primary/5'
          : 'border-outline-variant bg-surface-container-lowest')
      }
    >
      <p className="font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {body}
      </Link>
    );
  }
  return body;
}
