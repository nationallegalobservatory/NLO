'use client';

import Dexie, { type Table } from 'dexie';
import type {
  LocalArticle,
  LocalAuthor,
  LocalAuthSnapshot,
  LocalCategory,
  LocalContactSubmission,
  LocalDraft,
  LocalFileRecord,
  LocalNewsletterSubscription,
  LocalPageView,
  LocalPreference,
  LocalProfile,
  LocalReminder,
  LocalSearchQuery,
  SearchIndexEntry,
  SyncConflict,
  SyncOperation,
  SyncStateRecord,
} from './types';

export class NloLocalDatabase extends Dexie {
  articles!: Table<LocalArticle, string>;
  authors!: Table<LocalAuthor, string>;
  categories!: Table<LocalCategory, string>;
  drafts!: Table<LocalDraft, string>;
  files!: Table<LocalFileRecord, string>;
  searchIndex!: Table<SearchIndexEntry, string>;
  operations!: Table<SyncOperation, string>;
  conflicts!: Table<SyncConflict, string>;
  preferences!: Table<LocalPreference, string>;
  authSnapshots!: Table<LocalAuthSnapshot, string>;
  profiles!: Table<LocalProfile, string>;
  pageViews!: Table<LocalPageView, string>;
  searchQueries!: Table<LocalSearchQuery, string>;
  newsletterSubscriptions!: Table<LocalNewsletterSubscription, string>;
  reminders!: Table<LocalReminder, string>;
  contactSubmissions!: Table<LocalContactSubmission, string>;
  syncState!: Table<SyncStateRecord, string>;

  constructor() {
    super('nlo-local-first');

    this.version(1).stores({
      articles: 'slug, type, date, author, *categories, *tags, updatedAt, cachedAt',
      authors: 'slug, name, updatedAt, cachedAt',
      categories: 'slug, name, updatedAt, cachedAt',
      drafts: 'id, slug, status, updatedAt, syncedAt, remoteUpdatedAt, *tags',
      files:
        'id, status, tempUrl, cloudUrl, storagePath, linkedEntityType, linkedEntityId, createdAt, updatedAt',
      searchIndex: 'id, [entityType+entityId], entityType, entityId, *tokens, updatedAt',
      operations:
        'id, status, type, entityType, entityId, nextAttemptAt, createdAt, updatedAt, clientId',
      conflicts: 'id, operationId, entityType, entityId, detectedAt, resolvedAt',
      preferences: 'key, updatedAt, dirty',
      authSnapshots: 'id, userId, expiresAt, updatedAt',
      profiles: 'userId, email, updatedAt, cachedAt',
      pageViews: 'slug, updatedAt',
      searchQueries: 'query, updatedAt',
      newsletterSubscriptions: 'email, status, updatedAt',
      reminders: 'id, [email+articleSlug], articleSlug, status, updatedAt',
      contactSubmissions: 'id, category, status, updatedAt',
      syncState: 'key, updatedAt',
    });
  }
}

export const localDb = new NloLocalDatabase();
