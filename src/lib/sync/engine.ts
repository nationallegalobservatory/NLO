'use client';

import { localDb } from '@/lib/local/db';
import { notifyLocalStateChanged } from '@/lib/local/repositories';
import type { SyncOperation } from '@/lib/local/types';
import { pushOperationToSupabase, SyncConflictError } from './supabaseAdapter';

const MAX_BACKOFF_MS = 5 * 60 * 1000;
const BASE_BACKOFF_MS = 1200;

type SyncRuntimeState = {
  running: boolean;
  syncing: boolean;
  lastSyncAt?: string;
  lastError?: string;
};

class SyncEngine {
  private started = false;
  private intervalId: number | undefined;
  private state: SyncRuntimeState = {
    running: false,
    syncing: false,
  };

  start() {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    this.state.running = true;
    window.addEventListener('online', this.syncNow);
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('nlo:local-state-changed', this.handleLocalStateChange);
    this.intervalId = window.setInterval(this.syncNow, 45_000);
    void this.syncNow();
  }

  stop() {
    if (!this.started || typeof window === 'undefined') {
      return;
    }

    this.started = false;
    this.state.running = false;
    window.removeEventListener('online', this.syncNow);
    window.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('nlo:local-state-changed', this.handleLocalStateChange);
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    this.intervalId = undefined;
  }

  getState() {
    return this.state;
  }

  syncNow = async () => {
    if (this.state.syncing || typeof navigator !== 'undefined' && !navigator.onLine) {
      this.emitState();
      return;
    }

    this.state.syncing = true;
    this.state.lastError = undefined;
    this.emitState();

    try {
      const operations = await localDb.operations
        .where('nextAttemptAt')
        .belowOrEqual(Date.now())
        .filter((operation) => operation.status === 'pending' || operation.status === 'failed')
        .sortBy('createdAt');

      for (const operation of operations.slice(0, 20)) {
        await this.processOperation(operation);
      }

      this.state.lastSyncAt = new Date().toISOString();
    } catch (error) {
      this.state.lastError =
        error instanceof Error ? error.message : 'Unexpected sync engine failure.';
    } finally {
      this.state.syncing = false;
      this.emitState();
      notifyLocalStateChanged();
    }
  };

  private processOperation = async (operation: SyncOperation) => {
    const startedAt = new Date().toISOString();
    await localDb.operations.put({
      ...operation,
      status: 'syncing',
      updatedAt: startedAt,
      lastError: undefined,
    });
    notifyLocalStateChanged();

    try {
      await pushOperationToSupabase(operation);
      await localDb.operations.put({
        ...operation,
        status: 'synced',
        updatedAt: new Date().toISOString(),
        lastError: undefined,
      });
    } catch (error) {
      if (error instanceof SyncConflictError) {
        const conflictId = `conflict:${operation.id}`;
        await localDb.conflicts.put({
          id: conflictId,
          operationId: operation.id,
          entityType: operation.entityType,
          entityId: operation.entityId,
          localSnapshot: error.localSnapshot,
          remoteSnapshot: error.remoteSnapshot,
          detectedAt: new Date().toISOString(),
        });
        await localDb.operations.put({
          ...operation,
          status: 'conflict',
          updatedAt: new Date().toISOString(),
          lastError: error.message,
        });
        return;
      }

      const attempts = operation.attempts + 1;
      const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempts);
      const jitter = Math.floor(Math.random() * 750);

      await localDb.operations.put({
        ...operation,
        status: 'failed',
        attempts,
        nextAttemptAt: Date.now() + backoff + jitter,
        updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Unknown sync error.',
      });
    } finally {
      notifyLocalStateChanged();
    }
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.syncNow();
    }
  };

  private handleLocalStateChange = () => {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      window.setTimeout(() => void this.syncNow(), 250);
    }
  };

  private emitState() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nlo:sync-engine-state', { detail: this.state }));
    }
  }
}

export const syncEngine = new SyncEngine();
