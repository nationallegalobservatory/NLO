import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { SettingsClient } from '@/components/cms/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function CmsSettingsPage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  if (!isCmsBackendConfigured()) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          CMS not configured.
        </div>
      </div>
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: users } = await admin
    .from('cms_users')
    .select('id, email, name, role, last_login_at, created_at')
    .order('created_at');

  return (
    <SettingsClient
      currentUser={{
        email: session.email,
        name: session.name,
        role: session.role,
      }}
      users={users ?? []}
    />
  );
}
