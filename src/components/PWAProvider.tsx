'use client';

import { useEffect } from 'react';

import { bootstrapLocalContentCache } from '@/lib/api/offlineActions';
import { authRepository } from '@/lib/local/repositories';
import { registerServiceWorker } from '@/lib/pwa/register';
import { getSupabaseClient } from '@/lib/supabase';
import { syncEngine } from '@/lib/sync/engine';

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    syncEngine.start();
    void bootstrapLocalContentCache();

    if ('storage' in navigator && 'persist' in navigator.storage) {
      void navigator.storage.persist().catch(() => false);
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return () => syncEngine.stop();
    }

    void supabase.auth.getSession().then(({ data }) => {
      void authRepository.saveSessionSnapshot(data.session);
    });

    if (navigator.onLine) {
      void supabase.auth.refreshSession().then(({ data }) => {
        void authRepository.saveSessionSnapshot(data.session);
      });
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void authRepository.saveSessionSnapshot(session);
      if (navigator.onLine) {
        void syncEngine.syncNow();
      }
    });

    return () => {
      data.subscription.unsubscribe();
      syncEngine.stop();
    };
  }, []);

  return children;
}
