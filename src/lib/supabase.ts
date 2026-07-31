
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return typeof window !== 'undefined'
    ? !!(window as Window & { __SUPABASE_CONFIGURED__?: boolean }).__SUPABASE_CONFIGURED__ ||
        (!!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'your-supabase-url')
    : !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'your-supabase-url';
};

// Singleton instance
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const isBrowser = typeof window !== 'undefined';
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
        flowType: 'pkce',
        storageKey: 'nlo-supabase-session',
      },
    });
  }

  return supabaseClient;
};

// Server-side admin client (requires service role key, which is NEVER exposed to client)
export const getSupabaseAdminClient = () => {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !adminKey || supabaseUrl === 'your-supabase-url' || adminKey === 'your-supabase-service-role-key') {
    return null;
  }
  return createClient(supabaseUrl, adminKey, {
    auth: {
      persistSession: false,
    },
  });
};
