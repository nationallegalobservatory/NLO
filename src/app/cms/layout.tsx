import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { CmsShell } from '@/components/cms/CmsShell';

export const dynamic = 'force-dynamic';

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }
  return <CmsShell session={session}>{children}</CmsShell>;
}
