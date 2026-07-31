export type EntityType =
  | 'article'
  | 'author'
  | 'category'
  | 'draft'
  | 'profile'
  | 'preference'
  | 'page_view'
  | 'search_query'
  | 'newsletter_subscription'
  | 'reminder'
  | 'contact_submission'
  | 'file';

export type SyncOperationType =
  | 'article.upsert'
  | 'draft.upsert'
  | 'profile.update'
  | 'preference.upsert'
  | 'view.increment'
  | 'search.track'
  | 'newsletter.subscribe'
  | 'reminder.create'
  | 'contact.submit'
  | 'file.upload';

export type SyncOperationStatus = 'pending' | 'syncing' | 'failed' | 'conflict' | 'synced';

export interface LocalAuthor {
  slug: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  socialLinks?: {
    linkedin?: string;
    website?: string;
  };
  content?: string;
  updatedAt: string;
  cachedAt: string;
}

export interface LocalCategory {
  slug: string;
  name: string;
  description: string;
  color: string;
  updatedAt: string;
  cachedAt: string;
}

export interface LocalArticle {
  slug: string;
  type: 'judgment' | 'policy' | 'research' | 'opinion';
  format?: 'monthly-report' | 'post' | 'blog';
  title: string;
  author: string;
  authorName?: string;
  date: string;
  categories: string[];
  tags: string[];
  content: string;
  rawContent: string;
  readingTime: string;
  abstract?: string;
  caseSummary?: string;
  policyOverview?: string;
  references?: string[];
  coverImage?: string;
  updatedAt: string;
  cachedAt: string;
}

export interface LocalDraft {
  id: string;
  slug?: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  status: 'draft' | 'submitted' | 'archived';
  updatedAt: string;
  syncedAt?: string;
  remoteUpdatedAt?: string;
}

export interface LocalFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  status: 'staged' | 'uploading' | 'uploaded' | 'failed';
  tempUrl: string;
  cloudUrl?: string;
  storagePath?: string;
  linkedEntityType?: EntityType;
  linkedEntityId?: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface SearchIndexEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  body: string;
  url?: string;
  tokens: string[];
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: EntityType;
  entityId: string;
  payload: Record<string, unknown>;
  status: SyncOperationStatus;
  attempts: number;
  nextAttemptAt: number;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  expectedRemoteUpdatedAt?: string;
  lastError?: string;
}

export interface SyncConflict {
  id: string;
  operationId: string;
  entityType: EntityType;
  entityId: string;
  localSnapshot: Record<string, unknown>;
  remoteSnapshot: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: 'keep_local' | 'use_remote';
}

export interface LocalPreference {
  key: string;
  value: unknown;
  updatedAt: string;
  dirty: boolean;
}

export interface LocalAuthSnapshot {
  id: 'current';
  userId?: string;
  email?: string;
  expiresAt?: number;
  appMetadata?: Record<string, unknown>;
  updatedAt: string;
}

export interface LocalProfile {
  userId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  permissions: string[];
  updatedAt: string;
  cachedAt: string;
}

export interface LocalPageView {
  slug: string;
  views: number;
  updatedAt: string;
}

export interface LocalSearchQuery {
  query: string;
  count: number;
  updatedAt: string;
}

export interface LocalNewsletterSubscription {
  email: string;
  status: 'pending' | 'synced';
  subscribedAt: string;
  updatedAt: string;
}

export interface LocalReminder {
  id: string;
  email: string;
  articleSlug: string;
  status: 'pending' | 'synced';
  createdAt: string;
  updatedAt: string;
}

export interface LocalContactSubmission {
  id: string;
  category: string;
  name: string;
  email: string;
  subject?: string;
  message?: string;
  payload: Record<string, unknown>;
  fileIds: string[];
  status: 'pending' | 'synced';
  createdAt: string;
  updatedAt: string;
}

export interface SyncStateRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface OfflineBootstrapPayload {
  generatedAt: string;
  articles: Omit<LocalArticle, 'updatedAt' | 'cachedAt'>[];
  authors: Omit<LocalAuthor, 'updatedAt' | 'cachedAt'>[];
  categories: Omit<LocalCategory, 'updatedAt' | 'cachedAt'>[];
}

export interface OfflineSearchResult {
  slug: string;
  type: string;
  format?: 'monthly-report' | 'post' | 'blog';
  title: string;
  date: string;
  authorName: string;
  category: string;
  excerpt?: string;
  url?: string;
  score: number;
}
