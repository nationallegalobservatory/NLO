'use client';

import {
  createLocalId,
  localContentRepository,
  offlineActionRepository,
} from '@/lib/local/repositories';
import { syncEngine } from '@/lib/sync/engine';

export async function bootstrapLocalContentCache() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch('/api/offline/bootstrap', {
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return;
    }

    await localContentRepository.refreshBootstrap(await response.json());
  } catch {
    // The existing IndexedDB cache remains the source of truth while offline.
  }
}

export async function searchLocalFirst(query: string) {
  const localResults = await localContentRepository.search(query);

  if (localResults.length > 0 || typeof navigator !== 'undefined' && !navigator.onLine) {
    return localResults;
  }

  return [];
}

export async function recordPageViewLocalFirst(slug: string) {
  const views = await offlineActionRepository.incrementPageView(slug);
  void syncEngine.syncNow();
  return views;
}

export async function trackSearchQueryLocalFirst(query: string) {
  await offlineActionRepository.trackSearchQuery(query);
  void syncEngine.syncNow();
}

export async function subscribeNewsletterLocalFirst(email: string) {
  const result = await offlineActionRepository.subscribeNewsletter(email);
  void syncEngine.syncNow();
  return result;
}

export async function createReminderLocalFirst(email: string, articleSlug: string) {
  const result = await offlineActionRepository.createReminder(email, articleSlug);
  void syncEngine.syncNow();
  return result;
}

export async function saveContactSubmissionLocalFirst(
  form: {
    name: string;
    email: string;
    category: string;
    subject?: string;
    message?: string;
    [key: string]: unknown;
  },
  files: File[]
) {
  const result = await offlineActionRepository.saveContactSubmission(
    {
      id: createLocalId('submission'),
      category: form.category,
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
      payload: form,
      fileIds: [],
    },
    files
  );
  void syncEngine.syncNow();
  return result;
}
