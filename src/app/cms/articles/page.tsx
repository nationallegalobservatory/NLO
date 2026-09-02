import Link from 'next/link';
import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function CmsArticlesPage({ searchParams }: PageProps) {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  const params = await searchParams;
  const status = params.status;

  if (!isCmsBackendConfigured()) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Articles</h1>
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          CMS not configured. See <code className="font-mono">/cms/README.md</code>.
        </div>
      </div>
    );
  }

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

  const { data: articles, error } = await query.limit(200);

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
            Library
          </p>
          <h1 className="text-2xl font-semibold mt-1">Articles</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/cms/upload"
            className="border border-oxblood bg-oxblood text-white px-3 py-1.5 text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background"
          >
            + New
          </Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {(['all', 'draft', 'review', 'scheduled', 'published', 'archived'] as const).map((s) => {
          const active = (status ?? 'all') === s;
          const href = s === 'all' ? '/cms/articles' : `/cms/articles?status=${s}`;
          return (
            <Link
              key={s}
              href={href}
              className={
                'px-3 py-1.5 border font-technical-ui uppercase tracking-[0.14em] ' +
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

      <div className="border border-outline-variant">
        <table className="w-full text-sm">
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
                <td className="px-4 py-2 text-xs uppercase tracking-[0.12em]">
                  {a.cms_status ?? 'published'}
                </td>
                <td className="px-4 py-2 text-xs text-on-surface-variant">
                  {a.cms_publish_at
                    ? new Date(a.cms_publish_at).toLocaleDateString()
                    : a.date}
                </td>
              </tr>
            ))}
            {(articles ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                  No articles match. Try a different status, or upload one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
