import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { ComposeClient } from '@/components/cms/ComposeClient';

export const dynamic = 'force-dynamic';

export default async function CmsComposePage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  let articles: any[] = [];
  let subscriberCount = 0;

  if (isCmsBackendConfigured()) {
    const admin = getSupabaseAdmin();
    if (admin) {
      const [{ data: arts }, { count }] = await Promise.all([
        admin
          .from('articles')
          .select('slug, title, date, type, abstract, citation, coverImage')
          .in('cms_status', ['published', 'scheduled'])
          .order('date', { ascending: false })
          .limit(30),
        admin
          .from('newsletter_subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
      ]);
      articles = arts ?? [];
      subscriberCount = count ?? 0;
    }
  }

  // Fallback to local files & local subscriber store if unconfigured or offline
  if (articles.length === 0) {
    const { getArticles } = await import('@/lib/markdown');
    const { getLocalSubscribers } = await import('@/lib/cms/localStore');
    const local = await getArticles(undefined, true);
    articles = local.map((a) => ({
      slug: a.slug,
      title: a.title,
      date: (a.date as unknown) instanceof Date ? (a.date as unknown as Date).toISOString().slice(0, 10) : String(a.date || ''),
      type: a.type,
      abstract: a.abstract || null,
      citation: a.citation || null,
      coverImage: a.coverImage || null,
    }));
    subscriberCount = getLocalSubscribers().length;
  }

  return (
    <ComposeClient
      articles={articles ?? []}
      subscriberCount={subscriberCount ?? 0}
      viewerName={session.name}
    />
  );
}
