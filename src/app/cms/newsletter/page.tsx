import Link from 'next/link';
import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { SubscriberUpload } from '@/components/cms/SubscriberUpload';

import { getArticles } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function CmsNewsletterPage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');

  let activeCount: number | null = 0;
  let recentSends: any[] = [];
  let articles: any[] = [];

  if (isCmsBackendConfigured()) {
    const admin = getSupabaseAdmin();
    if (admin) {
      const [{ count }, { data: sends }, { data: arts }] = await Promise.all([
        admin
          .from('newsletter_subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
        admin
          .from('cms_send_log')
          .select(
            'id, campaign_subject, status, recipient_count, sent_count, failed_count, scheduled_for, finished_at, created_at',
          )
          .order('created_at', { ascending: false })
          .limit(10),
        admin
          .from('articles')
          .select('slug, title, date, type')
          .eq('cms_status', 'published')
          .order('date', { ascending: false })
          .limit(20),
      ]);
      activeCount = count;
      recentSends = sends ?? [];
      articles = arts ?? [];
    }
  } else {
    // Local mode: use real subscriber count from local store (zero fake data)
    const { getLocalSubscribers, getLocalCampaigns } = await import('@/lib/cms/localStore');
    const localSubs = getLocalSubscribers();
    activeCount = localSubs.length;
    recentSends = getLocalCampaigns();

    const localArticles = await getArticles();
    articles = localArticles.slice(0, 10).map((a) => ({
      slug: a.slug,
      title: a.title,
      date: (a.date as unknown) instanceof Date ? (a.date as unknown as Date).toISOString().slice(0, 10) : String(a.date || ''),
      type: a.type,
    }));
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-6 md:space-y-8">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
            Subscribers
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1">Newsletter</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {activeCount ?? 0} active subscribers.
          </p>
        </div>
        <Link
          href="/cms/newsletter/compose"
          className="border border-oxblood bg-oxblood text-white px-3 py-2 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background inline-flex items-center"
        >
          + Compose
        </Link>
      </header>

      <section>
        <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em] mb-3">
          Add subscribers
        </h2>
        <SubscriberUpload />
      </section>

      <section>
        <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em] mb-3">
          Recent campaigns
        </h2>
        <div className="border border-outline-variant">
          {(recentSends ?? []).length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">No campaigns yet.</p>
          ) : (
            <>
              {/* Mobile: card list (<md) */}
              <div className="md:hidden divide-y divide-outline-variant">
                {(recentSends ?? []).map((s) => (
                  <div key={s.id} className="p-3 text-sm">
                    <p className="font-medium truncate">{s.campaign_subject}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {s.sent_count}/{s.recipient_count}
                      {s.failed_count > 0 && (
                        <span className="text-error ml-1">({s.failed_count} failed)</span>
                      )}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {s.finished_at
                        ? `Sent ${new Date(s.finished_at).toLocaleString()}`
                        : s.scheduled_for
                          ? `Scheduled for ${new Date(s.scheduled_for).toLocaleString()}`
                          : 'Queued'}{' '}
                      · {s.status}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop: table (md+) */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        Subject
                      </th>
                      <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        Recipients
                      </th>
                      <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        Status
                      </th>
                      <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        When
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {(recentSends ?? []).map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2">{s.campaign_subject}</td>
                        <td className="px-4 py-2 text-xs text-on-surface-variant">
                          {s.sent_count}/{s.recipient_count}
                          {s.failed_count > 0 && (
                            <span className="text-error ml-1">({s.failed_count} failed)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs uppercase tracking-[0.12em]">
                          {s.status}
                        </td>
                        <td className="px-4 py-2 text-xs text-on-surface-variant">
                          {s.finished_at
                            ? new Date(s.finished_at).toLocaleString()
                            : s.scheduled_for
                              ? new Date(s.scheduled_for).toLocaleString()
                              : new Date(s.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em] mb-3">
          Published articles (attach to next email)
        </h2>
        <div className="border border-outline-variant divide-y divide-outline-variant">
          {(articles ?? []).map((a) => (
            <div key={a.slug} className="px-4 py-2 text-sm flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-on-surface-variant font-mono truncate">{a.slug}</p>
              </div>
              <p className="text-xs text-on-surface-variant shrink-0">
                {a.date} · {a.type}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
