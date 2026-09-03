import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client that bypasses RLS.
 * Use for CMS operations: user creation, file uploads, send log, refactor queue.
 * Never expose this to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}

export function isCmsBackendConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.CMS_SESSION_SECRET;

  if (!url || !key || !secret) return false;
  if (url.includes('YOUR_PROJECT') || url.includes('your-supabase-url')) return false;
  if (key.startsWith('ey...') || key === 'your-supabase-service-role-key') return false;
  return true;
}
