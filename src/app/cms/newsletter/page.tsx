import Link from 'next/link';
import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { SubscriberUpload } from '@/components/cms/SubscriberUpload';

export const dynamic = 'force-dynamic';

export default async function CmsNewsletterPage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  if (!isCmsBackendConfigured()) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Newsletter</h1>
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          CMS not configured.
        </div>
      </div>
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const [{ count: activeCount }, { data: recentSends }, { data: articles }] = await Promise.all([
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
