import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { ComposeClient } from '@/components/cms/ComposeClient';

export const dynamic = 'force-dynamic';

export default async function CmsComposePage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  if (!isCmsBackendConfigured()) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Compose</h1>
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          CMS not configured.
        </div>
      </div>
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: articles } = await admin
    .from('articles')
    .select('slug, title, date, type, abstract, citation, coverImage')
    .in('cms_status', ['published', 'scheduled'])
    .order('date', { ascending: false })
    .limit(30);

  const { count: subscriberCount } = await admin
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  return (
    <ComposeClient
      articles={articles ?? []}
      subscriberCount={subscriberCount ?? 0}
      viewerName={session.name}
    />
  );
}
