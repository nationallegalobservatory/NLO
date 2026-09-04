import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { SettingsClient } from '@/components/cms/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function CmsSettingsPage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  let users: any[] = [];
  if (isCmsBackendConfigured()) {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data } = await admin
        .from('cms_users')
        .select('id, email, name, role, last_login_at, created_at')
        .order('created_at');
      users = data ?? [];
    }
  } else {
    // Local / Offline development fallback
    users = [
      {
        id: 'local-owner-1',
        email: session.email,
        name: session.name || 'Bhoomija Khanna',
        role: session.role || 'owner',
        last_login_at: new Date().toISOString(),
        created_at: new Date('2026-08-01').toISOString(),
      },
    ];
  }

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
