import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/cms/LoginForm';
import { isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

const errorCopy: Record<string, string> = {
  missing_token: 'The sign-in link is missing a token. Request a new one.',
  invalid_token: 'That sign-in link is no longer valid.',
  expired_token: 'That sign-in link has expired. Request a new one.',
  not_configured:
    'The CMS is not fully configured yet. Check the README at /cms/README.md for the env vars you need.',
};

export default async function CmsLoginPage({ searchParams }: PageProps) {
  const session = await readSession();
  if (session) {
    redirect('/cms/dashboard');
  }
  const params = await searchParams;
  const errorMessage = params.error ? errorCopy[params.error] || 'Sign-in failed.' : null;
  const configured = isCmsBackendConfigured();

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.32em] text-on-surface-variant mb-2">
            NLO Editorial CMS
          </p>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            We&apos;ll email you a one-time sign-in link. No password to remember.
          </p>
        </header>

        {!configured && (
          <div className="mb-6 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <strong className="block mb-1">CMS is not configured yet.</strong>
            Set <code className="font-mono text-xs">CMS_SESSION_SECRET</code>,{' '}
            <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>, and{' '}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> in{' '}
            <code className="font-mono text-xs">.env.local</code> and run the SQL migration at{' '}
            <code className="font-mono text-xs">supabase/cms/001_cms_users.sql</code>.
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {errorMessage}
          </div>
        )}

        <LoginForm callbackUrl={params.next} />
      </div>
    </main>
  );
}
