import Link from 'next/link';
import { CloudOff, Home, Search } from 'lucide-react';

export const metadata = {
  title: 'Offline',
  description: 'National Legal Observatory offline workspace.',
};

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-3xl py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center border border-outline-variant bg-surface-container-low text-oxblood dark:border-primary/25 dark:bg-surface-container dark:text-primary">
        <CloudOff className="h-7 w-7" />
      </div>
      <h1 className="mt-6 font-serif text-4xl font-bold text-on-background dark:text-on-background">
        Offline Workspace
      </h1>
      <p className="mx-auto mt-4 max-w-xl font-body-md text-base leading-8 text-on-surface-variant dark:text-on-background/65">
        The installed NLO app can continue with cached publications, local search, saved
        preferences, drafts, staged uploads, and queued submissions until the network returns.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-oxblood bg-oxblood px-4 py-3 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/publications"
          className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-4 py-3 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-on-background transition hover:border-oxblood hover:text-oxblood dark:border-primary/25 dark:bg-surface-container-low dark:text-on-background"
        >
          <Search className="h-4 w-4" />
          Archive
        </Link>
      </div>
    </div>
  );
}
