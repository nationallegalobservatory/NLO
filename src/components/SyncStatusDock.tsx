'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Cloud, CloudOff, RefreshCcw, X } from 'lucide-react';

import InstallPromptButton from '@/components/InstallPromptButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { syncRepository } from '@/lib/local/repositories';
import type { SyncConflict } from '@/lib/local/types';
import { syncEngine } from '@/lib/sync/engine';

type SyncSummary = Awaited<ReturnType<typeof syncRepository.getSummary>>;

export default function SyncStatusDock() {
  const [online, setOnline] = useState(true);
  const [summary, setSummary] = useState<SyncSummary>({
    pending: 0,
    failed: 0,
    conflicts: 0,
    stagedFiles: 0,
    lastBootstrapAt: undefined,
  });
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }

    const [nextSummary, nextConflicts] = await Promise.all([
      syncRepository.getSummary(),
      syncRepository.listOpenConflicts(),
    ]);
    setSummary(nextSummary);
    setConflicts(nextConflicts);
  }, []);

  useEffect(() => {
    const refreshSoon = () => {
      window.setTimeout(() => void refresh(), 0);
    };

    refreshSoon();

    const onConnectivity = () => refreshSoon();
    const onLocalState = () => refreshSoon();
    const onEngineState = (event: Event) => {
      const detail = (event as CustomEvent<{ syncing?: boolean }>).detail;
      setSyncing(Boolean(detail?.syncing));
      refreshSoon();
    };

    window.addEventListener('online', onConnectivity);
    window.addEventListener('offline', onConnectivity);
    window.addEventListener('nlo:local-state-changed', onLocalState);
    window.addEventListener('nlo:sync-engine-state', onEngineState);

    return () => {
      window.removeEventListener('online', onConnectivity);
      window.removeEventListener('offline', onConnectivity);
      window.removeEventListener('nlo:local-state-changed', onLocalState);
      window.removeEventListener('nlo:sync-engine-state', onEngineState);
    };
  }, [refresh]);

  const hasWork = summary.pending > 0 || summary.failed > 0 || summary.conflicts > 0 || !online;

  return (
    <>
      <div className="fixed bottom-20 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 border border-outline-variant/70 bg-surface-container-lowest/95 px-2.5 py-2 shadow-lg backdrop-blur dark:border-primary/25 dark:bg-surface-container/95 md:bottom-4 md:right-4">
        <Badge variant={online ? 'success' : 'warning'} className="gap-1.5">
          {online ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
          {online ? 'Online' : 'Offline'}
        </Badge>

        {hasWork ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 font-technical-ui text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant transition hover:text-oxblood dark:text-on-background/60 dark:hover:text-primary"
          >
            {summary.conflicts > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
            )}
            {summary.pending + summary.failed} queued
            {summary.conflicts > 0 ? ` / ${summary.conflicts} conflict` : ''}
          </button>
        ) : (
          <span className="hidden font-technical-ui text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant dark:text-on-background/55 sm:inline">
            Local ready
          </span>
        )}

        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Sync now"
          disabled={!online || syncing}
          onClick={() => void syncEngine.syncNow()}
          className="h-7 w-7"
        >
          <RefreshCcw className={syncing ? 'animate-spin' : ''} />
        </Button>

        <InstallPromptButton />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:items-center">
          <section className="max-h-[80vh] w-full max-w-2xl overflow-y-auto border border-outline-variant bg-surface-container-lowest p-4 shadow-2xl dark:border-primary/25 dark:bg-surface-container">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/40 pb-3 dark:border-primary/20">
              <div>
                <h2 className="font-serif text-2xl font-bold text-on-background dark:text-on-background">
                  Sync Queue
                </h2>
                <p className="mt-1 font-technical-ui text-[11px] uppercase tracking-[0.16em] text-on-surface-variant dark:text-on-background/45">
                  {summary.pending} pending · {summary.failed} retrying · {summary.stagedFiles} file
                  {summary.stagedFiles === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Close"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>

            {conflicts.length === 0 ? (
              <div className="py-8 text-sm text-on-surface-variant dark:text-on-background/60">
                No unresolved conflicts.
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {conflicts.map((conflict) => (
                  <article
                    key={conflict.id}
                    className="border border-amber-700/25 bg-amber-700/10 p-4 dark:text-on-background"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Badge variant="warning" className="mb-2">
                          Conflict
                        </Badge>
                        <h3 className="font-serif text-lg font-bold">
                          {conflict.entityType}: {conflict.entityId}
                        </h3>
                        <p className="mt-1 text-xs text-on-surface-variant dark:text-on-background/55">
                          Remote data changed before this local operation reached Supabase.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            await syncRepository.resolveConflict(conflict, 'keep_local');
                            void syncEngine.syncNow();
                            await refresh();
                          }}
                        >
                          Keep Local
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await syncRepository.resolveConflict(conflict, 'use_remote');
                            await refresh();
                          }}
                        >
                          Use Remote
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
