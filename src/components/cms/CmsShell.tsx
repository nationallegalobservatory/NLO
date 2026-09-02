'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CmsSession } from '@/lib/cms/session';

const NAV = [
  { href: '/cms/dashboard', label: 'Dashboard' },
  { href: '/cms/upload', label: 'Upload' },
  { href: '/cms/articles', label: 'Articles' },
  { href: '/cms/newsletter', label: 'Newsletter' },
  { href: '/cms/settings', label: 'Settings' },
] as const;

export function CmsShell({
  session,
  children,
}: {
  session: CmsSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    setBusy(true);
    await fetch('/api/cms/auth/logout', { method: 'POST' });
    router.push('/cms/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-outline-variant flex flex-col">
        <div className="px-5 py-5 border-b border-outline-variant">
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
            NLO
          </p>
          <p className="text-sm font-semibold mt-0.5">Editorial CMS</p>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'block px-5 py-2 text-xs font-technical-ui uppercase tracking-[0.16em] ' +
                  (active
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-background border-l-2 border-transparent')
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant px-5 py-3 text-xs">
          <p className="font-medium truncate">{session.name}</p>
          <p className="text-on-surface-variant truncate">{session.email}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            {session.role}
          </p>
          <button
            onClick={onLogout}
            disabled={busy}
            className="mt-3 w-full border border-outline-variant bg-transparent py-1.5 text-[10px] font-technical-ui uppercase tracking-[0.18em] hover:border-oxblood hover:text-oxblood transition-colors disabled:opacity-50"
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
