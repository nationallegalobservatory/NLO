import { readSession } from '@/lib/cms/session';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { PreviewClient } from '@/components/cms/preview/PreviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CmsArticlePreviewPage({ params }: PageProps) {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  const { id } = await params;
  const slug = decodeURIComponent(id);

  if (!isCmsBackendConfigured()) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Preview</h1>
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          CMS not configured.
        </div>
      </div>
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const [{ data: article }, { data: categories }, { data: authors }] = await Promise.all([
    admin.from('articles').select('*').eq('slug', slug).maybeSingle(),
    admin.from('categories').select('slug, name, color').order('name'),
    admin.from('authors').select('slug, name, avatar, role, bio, social_links').order('name'),
  ]);

  if (!article) notFound();

  return (
    <PreviewClient
      initialArticle={article}
      categories={categories ?? []}
      authors={authors ?? []}
      viewerRole={session.role}
      backHref={`/cms/articles/${encodeURIComponent(slug)}`}
    />
  );
}
