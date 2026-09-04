import Link from 'next/link';
import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { getArticles as getLocalArticles } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUSES = ['all', 'draft', 'review', 'scheduled', 'published', 'archived'] as const;
const STATUS_COLORS: Record<string, string> = {
  draft: 'border-outline-variant text-on-surface-variant',
  review: 'border-amber-500/50 text-amber-700 dark:text-amber-400',
  scheduled: 'border-blue-500/50 text-blue-700 dark:text-blue-400',
  published: 'border-primary/50 text-primary bg-primary/5',
  archived: 'border-outline-variant text-on-surface-variant opacity-60',
};

export default async function CmsArticlesPage({ searchParams }: PageProps) {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  const params = await searchParams;
  const status = params.status;

  let articles: Array<{
    slug: string;
    title: string;
    type: string;
    date: string;
    cms_status: string;
    cms_publish_at: string | null;
    categories: string[];
    tags: string[];
    cms_updated_at: string | null;
  }> = [];
  let error: { message: string } | null = null;

  if (!isCmsBackendConfigured()) {
    const local = await getLocalArticles(undefined, true);
    articles = local.map((a) => {
      const dStr = (a.date as unknown) instanceof Date ? (a.date as unknown as Date).toISOString().split('T')[0] : String(a.date || '');
      return {
        slug: a.slug,
        title: a.title,
        type: a.type,
        date: dStr,
        cms_status: 'published',
        cms_publish_at: null,
        categories: a.categories,
        tags: a.tags,
        cms_updated_at: dStr,
      };
    });
    if (status && status !== 'all' && status !== 'published') {
      articles = [];
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      articles = articles.filter((a) => a.title.toLowerCase().includes(q));
    }
  } else {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    let query = admin
      .from('articles')
      .select('slug, title, type, date, cms_status, cms_publish_at, categories, tags, cms_updated_at')
      .order('cms_updated_at', { ascending: false, nullsFirst: false });

    if (status && ['draft', 'review', 'scheduled', 'published', 'archived'].includes(status)) {
      query = query.eq('cms_status', status);
    }
    if (params.q) {
      query = query.ilike('title', `%${params.q}%`);
    }

    const res = await query.limit(200);
    articles = res.data ?? [];
    error = res.error;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      <header className="mb-4 sm:mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
            Library
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1">Articles</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/cms/upload"
            className="border border-oxblood bg-oxblood text-white px-3 py-2 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background inline-flex items-center"
          >
            + New
          </Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {STATUSES.map((s) => {
          const active = (status ?? 'all') === s;
          const href = s === 'all' ? '/cms/articles' : `/cms/articles?status=${s}`;
          return (
            <Link
              key={s}
              href={href}
              className={
                'px-3 py-2 min-h-[36px] border font-technical-ui uppercase tracking-[0.14em] inline-flex items-center ' +
                (active
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary')
              }
            >
              {s}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="border border-error/40 bg-error/10 px-4 py-3 text-sm text-error mb-4">
          {error.message}
        </div>
      )}

      {(articles ?? []).length === 0 ? (
        <div className="border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          No articles match. Try a different status, or upload one.
        </div>
      ) : (
        <>
          {/* === DESKTOP/TABLET: dense table (md+) === */}
          <div className="hidden md:block border border-outline-variant overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Title
                  </th>
                  <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Type
                  </th>
                  <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Status
                  </th>
                  <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {(articles ?? []).map((a) => (
                  <tr key={a.slug} className="hover:bg-surface-container-low">
                    <td className="px-4 py-2">
                      <Link
                        href={`/cms/articles/${encodeURIComponent(a.slug)}`}
                        className="text-foreground hover:text-primary"
                      >
                        {a.title}
                      </Link>
                      <p className="text-xs text-on-surface-variant font-mono mt-0.5">{a.slug}</p>
                    </td>
                    <td className="px-4 py-2 text-xs uppercase tracking-[0.12em]">{a.type}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          'px-2 py-0.5 border text-[10px] uppercase tracking-[0.12em] ' +
                          (STATUS_COLORS[a.cms_status ?? 'published'] ||
                            STATUS_COLORS.draft)
                        }
                      >
                        {a.cms_status ?? 'published'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-on-surface-variant">
                      {a.cms_publish_at
                        ? new Date(a.cms_publish_at).toLocaleDateString()
                        : a.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* === MOBILE: card list (<md) === */}
          <div className="md:hidden space-y-3">
            {(articles ?? []).map((a) => (
              <Link
                key={a.slug}
                href={`/cms/articles/${encodeURIComponent(a.slug)}`}
                className="block border border-outline-variant p-3 hover:border-primary active:bg-surface-container-low transition-colors"
              >
                <p className="text-sm font-medium text-foreground leading-snug">{a.title}</p>
                <p className="text-xs text-on-surface-variant font-mono mt-1 truncate">{a.slug}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-technical-ui uppercase tracking-[0.12em]">
                  <span className="text-on-surface-variant">{a.type}</span>
                  <span className="text-on-surface-variant">·</span>
                  <span
                    className={
                      'px-1.5 py-0.5 border ' +
                      (STATUS_COLORS[a.cms_status ?? 'published'] || STATUS_COLORS.draft)
                    }
                  >
                    {a.cms_status ?? 'published'}
                  </span>
                  <span className="text-on-surface-variant">·</span>
                  <span className="text-on-surface-variant">
                    {a.cms_publish_at
                      ? new Date(a.cms_publish_at).toLocaleDateString()
                      : a.date}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
