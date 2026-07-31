'use client';

import type { Session } from '@supabase/supabase-js';
import { localDb } from './db';
import { indexDraft, rebuildContentSearchIndex, searchOfflineIndex } from './search';
import type {
  EntityType,
  LocalArticle,
  LocalAuthSnapshot,
  LocalContactSubmission,
  LocalDraft,
  LocalFileRecord,
  LocalProfile,
  OfflineBootstrapPayload,
  SyncConflict,
  SyncOperation,
  SyncOperationType,
} from './types';

const CLIENT_ID_KEY = 'nlo-client-id';

function nowIso() {
  return new Date().toISOString();
}

export function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function getLocalClientId() {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = createLocalId('client');
  window.localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

export function notifyLocalStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nlo:local-state-changed'));
  }
}

export async function enqueueOperation(input: {
  type: SyncOperationType;
  entityType: EntityType;
  entityId: string;
  payload: Record<string, unknown>;
  expectedRemoteUpdatedAt?: string;
}) {
  const timestamp = nowIso();
  const operation: SyncOperation = {
    id: createLocalId('op'),
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: timestamp,
    updatedAt: timestamp,
    clientId: getLocalClientId(),
    expectedRemoteUpdatedAt: input.expectedRemoteUpdatedAt,
  };

  await localDb.operations.put(operation);
  notifyLocalStateChanged();
  return operation;
}

export const localContentRepository = {
  async refreshBootstrap(payload: OfflineBootstrapPayload) {
    const cachedAt = nowIso();
    const articles: LocalArticle[] = payload.articles.map((article) => ({
      ...article,
      authorName: article.authorName || 'Observatory Scholar',
      updatedAt: payload.generatedAt,
      cachedAt,
    }));

    await localDb.transaction(
      'rw',
      localDb.articles,
      localDb.authors,
      localDb.categories,
      localDb.syncState,
      async () => {
        await localDb.articles.bulkPut(articles);
        await localDb.authors.bulkPut(
          payload.authors.map((author) => ({
            ...author,
            updatedAt: payload.generatedAt,
            cachedAt,
          }))
        );
        await localDb.categories.bulkPut(
          payload.categories.map((category) => ({
            ...category,
            updatedAt: payload.generatedAt,
            cachedAt,
          }))
        );
        await localDb.syncState.put({
          key: 'lastBootstrapAt',
          value: payload.generatedAt,
          updatedAt: cachedAt,
        });
      }
    );

    await rebuildContentSearchIndex();
    notifyLocalStateChanged();
  },

  getArticles() {
    return localDb.articles.orderBy('date').reverse().toArray();
  },

  getArticle(slug: string) {
    return localDb.articles.get(slug);
  },

  search(query: string) {
    return searchOfflineIndex(query);
  },
};

export const preferenceRepository = {
  async savePreference(key: string, value: unknown, queueRemote = true) {
    const updatedAt = nowIso();
    await localDb.preferences.put({ key, value, updatedAt, dirty: queueRemote });

    if (queueRemote) {
      await enqueueOperation({
        type: 'preference.upsert',
        entityType: 'preference',
        entityId: key,
        payload: { key, value, updatedAt },
      });
    }

    notifyLocalStateChanged();
  },

  async getPreference<T>(key: string) {
    const preference = await localDb.preferences.get(key);
    return preference?.value as T | undefined;
  },
};

export const offlineActionRepository = {
  async incrementPageView(slug: string) {
    const updatedAt = nowIso();
    const existing = await localDb.pageViews.get(slug);
    const views = (existing?.views || 0) + 1;

    await localDb.pageViews.put({ slug, views, updatedAt });
    await enqueueOperation({
      type: 'view.increment',
      entityType: 'page_view',
      entityId: slug,
      payload: { slug, viewedAt: updatedAt },
    });

    return views;
  },

  async trackSearchQuery(query: string) {
    const cleanQuery = query.toLowerCase().trim();
    const updatedAt = nowIso();
    const existing = await localDb.searchQueries.get(cleanQuery);
    const count = (existing?.count || 0) + 1;

    await localDb.searchQueries.put({ query: cleanQuery, count, updatedAt });
    await enqueueOperation({
      type: 'search.track',
      entityType: 'search_query',
      entityId: cleanQuery,
      payload: { query: cleanQuery, searchedAt: updatedAt },
    });
  },

  async subscribeNewsletter(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const subscribedAt = nowIso();

    await localDb.newsletterSubscriptions.put({
      email: cleanEmail,
      status: 'pending',
      subscribedAt,
      updatedAt: subscribedAt,
    });
    await enqueueOperation({
      type: 'newsletter.subscribe',
      entityType: 'newsletter_subscription',
      entityId: cleanEmail,
      payload: { email: cleanEmail, subscribedAt },
    });

    return {
      success: true,
      message: navigator.onLine
        ? 'Subscription saved. Syncing with the observatory now.'
        : 'Subscription saved offline. It will sync automatically.',
    };
  },

  async createReminder(email: string, articleSlug: string) {
    const cleanEmail = email.toLowerCase().trim();
    const createdAt = nowIso();
    const id = `${cleanEmail}:${articleSlug}`;

    await localDb.reminders.put({
      id,
      email: cleanEmail,
      articleSlug,
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    });
    await enqueueOperation({
      type: 'reminder.create',
      entityType: 'reminder',
      entityId: id,
      payload: { email: cleanEmail, articleSlug, createdAt },
    });

    return {
      success: true,
      message: navigator.onLine
        ? 'Reminder saved. Syncing with the observatory now.'
        : 'Reminder saved offline. It will sync automatically.',
    };
  },

  async saveContactSubmission(
    payload: Omit<LocalContactSubmission, 'status' | 'createdAt' | 'updatedAt'>,
    files: File[] = []
  ) {
    const createdAt = nowIso();
    const stagedFiles: LocalFileRecord[] = [];

    for (const file of files) {
      stagedFiles.push(
        await fileRepository.stageFile(file, {
          linkedEntityType: 'contact_submission',
          linkedEntityId: payload.id,
        })
      );
    }

    const submission: LocalContactSubmission = {
      ...payload,
      fileIds: [...payload.fileIds, ...stagedFiles.map((file) => file.id)],
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    };

    await localDb.contactSubmissions.put(submission);
    await enqueueOperation({
      type: 'contact.submit',
      entityType: 'contact_submission',
      entityId: submission.id,
      payload: submission as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      id: submission.id,
      message: navigator.onLine
        ? 'Submission saved locally. Syncing with the editorial desk now.'
        : 'Submission saved offline. It will sync automatically.',
    };
  },
};

export const fileRepository = {
  async stageFile(
    file: File,
    metadata: Pick<LocalFileRecord, 'linkedEntityType' | 'linkedEntityId'> = {}
  ) {
    const timestamp = nowIso();
    const id = createLocalId('file');
    const localFile: LocalFileRecord = {
      id,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      blob: file,
      status: 'staged',
      tempUrl: `idb://nlo-file/${id}`,
      linkedEntityType: metadata.linkedEntityType,
      linkedEntityId: metadata.linkedEntityId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await localDb.files.put(localFile);
    await enqueueOperation({
      type: 'file.upload',
      entityType: 'file',
      entityId: id,
      payload: {
        fileId: id,
        name: file.name,
        type: localFile.type,
        size: file.size,
        linkedEntityType: metadata.linkedEntityType,
        linkedEntityId: metadata.linkedEntityId,
      },
    });

    return localFile;
  },

  async markUploaded(fileId: string, cloudUrl: string, storagePath: string) {
    const existing = await localDb.files.get(fileId);
    if (!existing) return;

    await localDb.files.put({
      ...existing,
      status: 'uploaded',
      cloudUrl,
      storagePath,
      updatedAt: nowIso(),
    });
    notifyLocalStateChanged();
  },

  async markFailed(fileId: string, error: string) {
    const existing = await localDb.files.get(fileId);
    if (!existing) return;

    await localDb.files.put({
      ...existing,
      status: 'failed',
      lastError: error,
      updatedAt: nowIso(),
    });
    notifyLocalStateChanged();
  },
};

export const draftRepository = {
  async saveDraft(draft: Omit<LocalDraft, 'updatedAt'>) {
    const updatedAt = nowIso();
    const nextDraft: LocalDraft = { ...draft, updatedAt };
    await localDb.drafts.put(nextDraft);
    await indexDraft(nextDraft);
    await enqueueOperation({
      type: 'draft.upsert',
      entityType: 'draft',
      entityId: draft.id,
      payload: { draft: nextDraft },
      expectedRemoteUpdatedAt: draft.remoteUpdatedAt,
    });

    return nextDraft;
  },
};

export const authRepository = {
  async saveSessionSnapshot(session: Session | null) {
    const timestamp = nowIso();

    if (!session) {
      await localDb.authSnapshots.put({ id: 'current', updatedAt: timestamp });
      notifyLocalStateChanged();
      return;
    }

    const snapshot: LocalAuthSnapshot = {
      id: 'current',
      userId: session.user.id,
      email: session.user.email,
      expiresAt: session.expires_at,
      appMetadata: session.user.app_metadata,
      updatedAt: timestamp,
    };
    const permissions = Array.isArray(session.user.app_metadata?.permissions)
      ? (session.user.app_metadata.permissions as string[])
      : Array.isArray(session.user.app_metadata?.roles)
        ? (session.user.app_metadata.roles as string[])
        : [];
    const profile: LocalProfile = {
      userId: session.user.id,
      email: session.user.email,
      displayName:
        typeof session.user.user_metadata?.full_name === 'string'
          ? session.user.user_metadata.full_name
          : session.user.email,
      avatarUrl:
        typeof session.user.user_metadata?.avatar_url === 'string'
          ? session.user.user_metadata.avatar_url
          : undefined,
      permissions,
      updatedAt: timestamp,
      cachedAt: timestamp,
    };

    await localDb.transaction('rw', localDb.authSnapshots, localDb.profiles, async () => {
      await localDb.authSnapshots.put(snapshot);
      await localDb.profiles.put(profile);
    });
    notifyLocalStateChanged();
  },
};

export const syncRepository = {
  async getSummary() {
    const [pending, failed, conflicts, stagedFiles, lastBootstrap] = await Promise.all([
      localDb.operations.where('status').anyOf(['pending', 'syncing']).count(),
      localDb.operations.where('status').equals('failed').count(),
      localDb.conflicts.filter((conflict) => !conflict.resolvedAt).count(),
      localDb.files.where('status').anyOf(['staged', 'failed']).count(),
      localDb.syncState.get('lastBootstrapAt'),
    ]);

    return {
      pending,
      failed,
      conflicts,
      stagedFiles,
      lastBootstrapAt: lastBootstrap?.value as string | undefined,
    };
  },

  listOpenConflicts() {
    return localDb.conflicts.filter((conflict) => !conflict.resolvedAt).toArray();
  },

  async resolveConflict(conflict: SyncConflict, resolution: 'keep_local' | 'use_remote') {
    const timestamp = nowIso();

    if (resolution === 'keep_local') {
      const operation = await localDb.operations.get(conflict.operationId);
      if (operation) {
        await localDb.operations.put({
          ...operation,
          status: 'pending',
          payload: {
            ...operation.payload,
            forceWrite: true,
          },
          nextAttemptAt: Date.now(),
          updatedAt: timestamp,
          lastError: undefined,
        });
      }
    } else {
      await applyRemoteSnapshot(conflict);
      const operation = await localDb.operations.get(conflict.operationId);
      if (operation) {
        await localDb.operations.put({
          ...operation,
          status: 'synced',
          updatedAt: timestamp,
          lastError: undefined,
        });
      }
    }

    await localDb.conflicts.put({
      ...conflict,
      resolution,
      resolvedAt: timestamp,
    });
    notifyLocalStateChanged();
  },
};

async function applyRemoteSnapshot(conflict: SyncConflict) {
  const remote = conflict.remoteSnapshot;
  const timestamp = nowIso();

  if (conflict.entityType === 'draft') {
    await localDb.drafts.put({
      id: conflict.entityId,
      title: String(remote.title || 'Untitled draft'),
      content: String(remote.content || ''),
      metadata:
        remote.metadata && typeof remote.metadata === 'object'
          ? (remote.metadata as Record<string, unknown>)
          : {},
      tags: Array.isArray(remote.tags) ? (remote.tags as string[]) : [],
      status: 'draft',
      updatedAt: String(remote.updated_at || timestamp),
      syncedAt: timestamp,
      remoteUpdatedAt: String(remote.updated_at || timestamp),
    });
  }

  if (conflict.entityType === 'preference' && typeof remote.key === 'string') {
    await localDb.preferences.put({
      key: remote.key,
      value: remote.value,
      updatedAt: String(remote.updated_at || timestamp),
      dirty: false,
    });
  }
}
