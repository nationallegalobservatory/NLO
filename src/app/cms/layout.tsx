import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { CmsShell } from '@/components/cms/CmsShell';

export const dynamic = 'force-dynamic';

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  // The /cms/login route bypasses this layout — see its parent group.
  // For everything else, require an active session.
  const session = await readSession();
  if (!session) {
    redirect('/cms/login');
  }
  return <CmsShell session={session}>{children}</CmsShell>;
}
