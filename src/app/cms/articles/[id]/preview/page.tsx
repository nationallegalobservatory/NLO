import { readSession } from '@/lib/cms/session';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { PreviewClient } from '@/components/cms/preview/PreviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

import { getArticleBySlug as getLocalArticleBySlug, getCategories as getLocalCategories, getAuthors as getLocalAuthors } from '@/lib/markdown';

export default async function CmsArticlePreviewPage({ params }: PageProps) {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  const { id } = await params;
  const slug = decodeURIComponent(id);

  let article: any = null;
  let categories: any[] = [];
  let authors: any[] = [];

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
    authors = getLocalAuthors();
  } else {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    const [{ data: a }, { data: cats }, { data: auths }] = await Promise.all([
      admin.from('articles').select('*').eq('slug', slug).maybeSingle(),
      admin.from('categories').select('slug, name, color').order('name'),
      admin.from('authors').select('slug, name, avatar, role, bio, social_links').order('name'),
    ]);

    if (!a) notFound();
    article = a;
    categories = cats ?? [];
    authors = auths ?? [];
  }

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
