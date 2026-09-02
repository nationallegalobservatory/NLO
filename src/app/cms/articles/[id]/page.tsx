import { readSession } from '@/lib/cms/session';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { ArticleEditor } from '@/components/cms/ArticleEditor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CmsArticleEditorPage({ params }: PageProps) {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  const { id } = await params;
  const slug = decodeURIComponent(id);

  if (!isCmsBackendConfigured()) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Article</h1>
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          CMS not configured.
        </div>
      </div>
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: article, error } = await admin
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !article) notFound();

  // Load categories for the picker
  const { data: categories } = await admin
    .from('categories')
    .select('slug, name, color')
    .order('name');

  return (
    <ArticleEditor
      initialArticle={article}
      categories={categories ?? []}
      viewerRole={session.role}
    />
  );
}
