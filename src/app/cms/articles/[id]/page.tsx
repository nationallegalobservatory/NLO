import { readSession } from '@/lib/cms/session';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { ArticleEditor } from '@/components/cms/ArticleEditor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

import { getArticleBySlug as getLocalArticleBySlug, getCategories as getLocalCategories } from '@/lib/markdown';

export default async function CmsArticleEditorPage({ params }: PageProps) {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  const { id } = await params;
  const slug = decodeURIComponent(id);

  let article: any = null;
  let categories: any[] = [];

  if (!isCmsBackendConfigured()) {
    const folders = ['judgments', 'policies', 'research', 'opinions'] as const;
    let local: any = null;
    for (const f of folders) {
      local = await getLocalArticleBySlug(f, slug);
      if (local) break;
    }
    if (!local) notFound();
    article = {
      ...local,
      author_slug: local.author,
      cms_status: 'published',
      cms_publish_at: null,
      content: local.rawContent || local.content,
    };
    categories = getLocalCategories();
  } else {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    const { data: a, error } = await admin
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !a) notFound();
    article = a;

    const { data: cats } = await admin
      .from('categories')
      .select('slug, name, color')
      .order('name');
    categories = cats ?? [];
  }

  return (
    <ArticleEditor
      initialArticle={article}
      categories={categories ?? []}
      viewerRole={session.role}
    />
  );
}
