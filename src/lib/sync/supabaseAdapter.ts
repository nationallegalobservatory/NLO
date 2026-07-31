'use client';

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { localDb } from '@/lib/local/db';
import { fileRepository } from '@/lib/local/repositories';
import type { LocalContactSubmission, SyncOperation } from '@/lib/local/types';

type SupabaseSyncError = {
  code?: string;
  message: string;
};

type MutationResult = Promise<{
  data?: unknown;
  error: SupabaseSyncError | null;
}>;

type SelectSingleResult = Promise<{
  data: Record<string, unknown> | null;
  error: SupabaseSyncError | null;
}>;

type SelectFilterBuilder = {
  eq: (column: string, value: string) => {
    maybeSingle: () => SelectSingleResult;
  };
};

type SupabaseTableClient = {
  select: (columns?: string) => SelectFilterBuilder;
  insert: (row: Record<string, unknown>) => MutationResult;
  upsert: (row: Record<string, unknown>, options?: { onConflict?: string }) => MutationResult;
};

type SupabaseStorageBucket = {
  upload: (
    path: string,
    body: Blob,
    options?: { contentType?: string; upsert?: boolean }
  ) => MutationResult;
  getPublicUrl: (path: string) => {
    data: {
      publicUrl: string;
    };
  };
};

type SupabaseSyncClient = {
  auth: {
    getSession: () => Promise<{
      data: {
        session: {
          user: {
            id: string;
          };
        } | null;
      };
    }>;
  };
  from: (table: string) => SupabaseTableClient;
  rpc: (fn: string, params: Record<string, unknown>) => MutationResult;
  storage: {
    from: (bucket: string) => SupabaseStorageBucket;
  };
};

export class SyncConflictError extends Error {
  remoteSnapshot: Record<string, unknown>;
  localSnapshot: Record<string, unknown>;

  constructor(
    message: string,
    remoteSnapshot: Record<string, unknown>,
    localSnapshot: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SyncConflictError';
    this.remoteSnapshot = remoteSnapshot;
    this.localSnapshot = localSnapshot;
  }
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Pending changes remain queued locally.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is unavailable. Pending changes remain queued locally.');
  }

  return supabase as unknown as SupabaseSyncClient;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

async function getCurrentUserId() {
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
}

async function assertNoRemoteConflict(
  table: string,
  idColumn: string,
  entityId: string,
  operation: SyncOperation,
  localSnapshot: Record<string, unknown>
) {
  if (!operation.expectedRemoteUpdatedAt || operation.payload.forceWrite) {
    return;
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(idColumn, entityId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const remote = data as Record<string, unknown> | null;
  if (
    remote?.updated_at &&
    String(remote.updated_at) !== String(operation.expectedRemoteUpdatedAt)
  ) {
    throw new SyncConflictError('Remote record changed before local sync.', remote, localSnapshot);
  }
}

export async function pushOperationToSupabase(operation: SyncOperation) {
  const supabase = requireSupabase();

  switch (operation.type) {
    case 'view.increment': {
      const slug = asString(operation.payload.slug, operation.entityId);
      const { error } = await supabase.rpc('increment_page_view', { article_slug: slug });
      if (error) throw error;
      return;
    }

    case 'search.track': {
      const query = asString(operation.payload.query, operation.entityId);
      const { error } = await supabase.rpc('increment_search_query', { query_text: query });
      if (error) throw error;
      return;
    }

    case 'newsletter.subscribe': {
      const email = asString(operation.payload.email, operation.entityId).toLowerCase();
      const subscribedAt = asString(operation.payload.subscribedAt, new Date().toISOString());
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email, subscribed_at: subscribedAt });
      if (error && error.code !== '23505') throw error;
      await localDb.newsletterSubscriptions.update(email, { status: 'synced' });
      return;
    }

    case 'reminder.create': {
      const email = asString(operation.payload.email).toLowerCase();
      const articleSlug = asString(operation.payload.articleSlug, 'manufacturing-consent');
      const createdAt = asString(operation.payload.createdAt, new Date().toISOString());
      const { error } = await supabase.from('article_reminders').insert(
        {
          email,
          article_slug: articleSlug,
          created_at: createdAt,
          sent: false,
        }
      );
      if (error && error.code !== '23505') throw error;
      await localDb.reminders.update(operation.entityId, { status: 'synced' });
      return;
    }

    case 'contact.submit': {
      const payload = operation.payload as unknown as LocalContactSubmission;
      const fileRecords = await localDb.files.bulkGet(payload.fileIds || []);
      const waitingForUploads = fileRecords.some(
        (file) => file && file.status !== 'uploaded' && !file.cloudUrl
      );

      if (waitingForUploads) {
        throw new Error('Waiting for staged files to upload before syncing submission metadata.');
      }

      const fileRefs = fileRecords
        .filter(Boolean)
        .map((file) => ({
          id: file!.id,
          name: file!.name,
          type: file!.type,
          size: file!.size,
          tempUrl: file!.tempUrl,
          cloudUrl: file!.cloudUrl,
          storagePath: file!.storagePath,
          status: file!.status,
        }));
      const table =
        payload.category === 'general' ? 'contact_submissions' : 'editorial_submissions';
      const { error } = await supabase.from(table).insert(
        {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          category: payload.category,
          subject: payload.subject,
          message: payload.message,
          payload: payload.payload,
          file_refs: fileRefs,
          created_at: payload.createdAt,
          synced_at: new Date().toISOString(),
        }
      );
      if (error && error.code !== '23505') throw error;
      await localDb.contactSubmissions.update(payload.id, { status: 'synced' });
      return;
    }

    case 'file.upload': {
      const fileId = asString(operation.payload.fileId, operation.entityId);
      const file = await localDb.files.get(fileId);
      if (!file) {
        return;
      }

      const bucket = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET || 'nlo-submissions';
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
      const userId = (await getCurrentUserId()) || operation.clientId;
      const storagePath =
        file.storagePath ||
        `${userId}/${new Date(file.createdAt).toISOString().slice(0, 10)}/${file.id}-${safeName}`;

      await localDb.files.update(file.id, { status: 'uploading', updatedAt: new Date().toISOString() });
      const { error } = await supabase.storage.from(bucket).upload(storagePath, file.blob, {
        contentType: file.type,
        upsert: false,
      });

      if (error && !/already exists/i.test(error.message)) {
        await fileRepository.markFailed(file.id, error.message);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      await fileRepository.markUploaded(file.id, publicUrl || storagePath, storagePath);
      return;
    }

    case 'draft.upsert': {
      const draft = operation.payload.draft as Record<string, unknown> | undefined;
      if (!draft) return;
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Sign in is required before drafts can sync.');
      }
      await assertNoRemoteConflict('drafts', 'id', operation.entityId, operation, draft);

      const remoteUpdatedAt = asString(draft.updatedAt, new Date().toISOString());
      const { error } = await supabase
        .from('drafts')
        .upsert(
          {
            id: operation.entityId,
            user_id: userId,
            slug: draft.slug,
            title: draft.title,
            content: draft.content,
            metadata: draft.metadata || {},
            tags: draft.tags || [],
            status: draft.status || 'draft',
            updated_at: remoteUpdatedAt,
          },
          { onConflict: 'id' }
        );

      if (error) throw error;
      await localDb.drafts.update(operation.entityId, {
        syncedAt: new Date().toISOString(),
        remoteUpdatedAt,
      });
      return;
    }

    case 'preference.upsert': {
      const userId = await getCurrentUserId();
      const clientId = operation.clientId;
      const key = asString(operation.payload.key, operation.entityId);
      const value = operation.payload.value;
      await assertNoRemoteConflict('user_preferences', 'id', `${clientId}:${key}`, operation, {
        key,
        value,
      });
      const { error } = await supabase.from('user_preferences').upsert(
        {
          id: `${clientId}:${key}`,
          user_id: userId || null,
          client_id: clientId,
          key,
          value,
          updated_at: asString(operation.payload.updatedAt, new Date().toISOString()),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      await localDb.preferences.update(key, { dirty: false });
      return;
    }

    case 'profile.update': {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Sign in is required before profile changes can sync.');
      }
      const { error } = await supabase.from('user_profiles').upsert(
        {
          id: userId,
          email: operation.payload.email,
          display_name: operation.payload.displayName,
          avatar_url: operation.payload.avatarUrl,
          permissions: operation.payload.permissions || [],
          updated_at: operation.payload.updatedAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      return;
    }

    case 'article.upsert': {
      const article = operation.payload.article as Record<string, unknown> | undefined;
      if (!article) return;
      await assertNoRemoteConflict('articles', 'slug', operation.entityId, operation, article);
      const { error } = await supabase.from('articles').upsert(article, { onConflict: 'slug' });
      if (error) throw error;
      return;
    }
  }
}
