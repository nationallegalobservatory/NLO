'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { CmsSession } from '@/lib/cms/session';

const NAV = [
  { href: '/cms/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/cms/upload', label: 'Upload', icon: '↑' },
  { href: '/cms/articles', label: 'Articles', icon: '☰' },
  { href: '/cms/newsletter', label: 'Newsletter', icon: '✉' },
  { href: '/cms/settings', label: 'Settings', icon: '⚙' },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open (mobile)
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [drawerOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onLogout = async () => {
    setBusy(true);
    await fetch('/api/cms/auth/logout', { method: 'POST' });
    router.push('/cms/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* === TOP BAR (mobile + tablet + desktop) === */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-foreground hover:bg-surface-container-low"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <Link href="/cms/dashboard" className="flex-1 text-center">
            <p className="font-technical-ui text-[9px] uppercase tracking-[0.28em] text-on-surface-variant leading-tight">
              NLO
            </p>
            <p className="text-sm font-semibold leading-tight">Editorial CMS</p>
          </Link>
          <div className="w-11" /> {/* spacer for centering */}
        </div>
      </header>

      {/* === DESKTOP SIDEBAR (lg+) === */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-60 lg:flex-col lg:border-r lg:border-outline-variant lg:bg-background">
        <div className="px-5 py-5 border-b border-outline-variant">
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
            NLO
          </p>
          <p className="text-sm font-semibold mt-0.5">Editorial CMS</p>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
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

      {/* === MOBILE/TABLET DRAWER (slides from left) === */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background border-r border-outline-variant shadow-xl animate-in slide-in-from-left duration-200 flex flex-col"
            role="dialog"
            aria-label="Main menu"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <div>
                <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
                  NLO
                </p>
                <p className="text-sm font-semibold mt-0.5">Editorial CMS</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-on-surface-variant hover:text-foreground hover:bg-surface-container-low"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      'flex items-center gap-3 px-5 py-3 min-h-[44px] text-sm font-technical-ui uppercase tracking-[0.16em] ' +
                      (active
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-background border-l-2 border-transparent')
                    }
                  >
                    <span aria-hidden className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-outline-variant px-5 py-4 text-xs">
              <p className="font-medium truncate">{session.name}</p>
              <p className="text-on-surface-variant truncate text-[11px]">{session.email}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                {session.role}
              </p>
              <button
                onClick={onLogout}
                disabled={busy}
                className="mt-3 w-full min-h-[44px] border border-outline-variant bg-transparent text-[10px] font-technical-ui uppercase tracking-[0.18em] hover:border-oxblood hover:text-oxblood transition-colors disabled:opacity-50"
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* === MAIN CONTENT (with proper sidebar offset on desktop) === */}
      <main className="lg:pl-60 min-w-0 pb-20 lg:pb-0">
        {children}
      </main>

      {/* === MOBILE BOTTOM NAV (md-) === */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-container-lowest border-t border-outline-variant">
        <div className="grid grid-cols-5 h-16">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'flex flex-col items-center justify-center min-h-[44px] min-w-[44px] text-[10px] font-technical-ui uppercase tracking-[0.1em] ' +
                  (active ? 'text-primary' : 'text-on-surface-variant hover:text-foreground')
                }
              >
                <span aria-hidden className="text-lg leading-none mb-0.5">{item.icon}</span>
                <span className="leading-none">{item.label.slice(0, 6)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
