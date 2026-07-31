'use client';

import { localDb } from './db';
import type {
  LocalArticle,
  LocalAuthor,
  LocalDraft,
  OfflineSearchResult,
  SearchIndexEntry,
} from './types';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'into',
  'what',
  'where',
  'when',
  'about',
  'legal',
  'law',
]);

export function tokenize(value: string): string[] {
  const tokens = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerptAround(body: string, tokens: string[]) {
  if (!body) {
    return '';
  }

  const lowerBody = body.toLowerCase();
  const firstHit = tokens
    .map((token) => lowerBody.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstHit === undefined) {
    return body.slice(0, 220);
  }

  const start = Math.max(0, firstHit - 80);
  const end = Math.min(body.length, firstHit + 170);
  return body.slice(start, end).trim();
}

function publicationPath(article: Pick<LocalArticle, 'type' | 'slug'>) {
  const folder =
    article.type === 'judgment'
      ? 'judgments'
      : article.type === 'policy'
        ? 'policies'
        : article.type === 'opinion'
          ? 'opinions'
          : 'research';

  return `/publications/${folder}/${article.slug}`;
}

function articleToIndexEntry(article: LocalArticle): SearchIndexEntry {
  const body = [
    article.title,
    article.authorName,
    article.abstract,
    article.caseSummary,
    article.policyOverview,
    article.rawContent,
    stripHtml(article.content),
    article.categories.join(' '),
    article.tags.join(' '),
    article.references?.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `article:${article.slug}`,
    entityType: 'article',
    entityId: article.slug,
    title: article.title,
    subtitle: article.authorName,
    body,
    url: publicationPath(article),
    tokens: tokenize(body),
    metadata: {
      slug: article.slug,
      type: article.type,
      format: article.format,
      date: article.date,
      authorName: article.authorName,
      category: article.categories[0] || 'archive',
    },
    updatedAt: article.updatedAt,
  };
}

function authorToIndexEntry(author: LocalAuthor): SearchIndexEntry {
  const body = [author.name, author.role, author.bio, author.content].filter(Boolean).join(' ');

  return {
    id: `author:${author.slug}`,
    entityType: 'author',
    entityId: author.slug,
    title: author.name,
    subtitle: author.role,
    body,
    url: `/authors/${author.slug}`,
    tokens: tokenize(body),
    metadata: {
      slug: author.slug,
      type: 'author',
      date: author.updatedAt,
      authorName: author.name,
      category: 'author',
    },
    updatedAt: author.updatedAt,
  };
}

function draftToIndexEntry(draft: LocalDraft): SearchIndexEntry {
  const body = [
    draft.title,
    draft.content,
    draft.tags.join(' '),
    JSON.stringify(draft.metadata),
  ].join(' ');

  return {
    id: `draft:${draft.id}`,
    entityType: 'draft',
    entityId: draft.id,
    title: draft.title,
    subtitle: 'Local draft',
    body,
    url: '/contact',
    tokens: tokenize(body),
    metadata: {
      slug: draft.slug || draft.id,
      type: 'draft',
      date: draft.updatedAt,
      authorName: 'Local workspace',
      category: 'draft',
    },
    updatedAt: draft.updatedAt,
  };
}

export async function rebuildContentSearchIndex() {
  const [articles, authors, drafts] = await Promise.all([
    localDb.articles.toArray(),
    localDb.authors.toArray(),
    localDb.drafts.toArray(),
  ]);

  const nextEntries = [
    ...articles.map(articleToIndexEntry),
    ...authors.map(authorToIndexEntry),
    ...drafts.map(draftToIndexEntry),
  ];

  await localDb.transaction('rw', localDb.searchIndex, async () => {
    await localDb.searchIndex.clear();
    if (nextEntries.length > 0) {
      await localDb.searchIndex.bulkPut(nextEntries);
    }
  });
}

export async function indexDraft(draft: LocalDraft) {
  await localDb.searchIndex.put(draftToIndexEntry(draft));
}

function scoreEntry(entry: SearchIndexEntry, query: string, tokens: string[]) {
  const title = entry.title.toLowerCase();
  const body = entry.body.toLowerCase();
  const exactTitle = title.includes(query) ? 12 : 0;
  const exactBody = body.includes(query) ? 4 : 0;
  const tokenScore = tokens.reduce((score, token) => {
    if (title.includes(token)) return score + 5;
    if (entry.tokens.includes(token)) return score + 2;
    return score;
  }, 0);

  return exactTitle + exactBody + tokenScore;
}

export async function searchOfflineIndex(query: string): Promise<OfflineSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  const queryTokens = tokenize(cleanQuery);

  if (queryTokens.length === 0) {
    return [];
  }

  const tokenMatches = await localDb.searchIndex
    .where('tokens')
    .anyOf(queryTokens)
    .distinct()
    .toArray();

  return tokenMatches
    .map((entry) => {
      const metadata = entry.metadata || {};
      const score = scoreEntry(entry, cleanQuery, queryTokens);

      return {
        slug: String(metadata.slug || entry.entityId),
        type: String(metadata.type || entry.entityType),
        format: metadata.format as OfflineSearchResult['format'],
        title: entry.title,
        date: String(metadata.date || entry.updatedAt),
        authorName: String(metadata.authorName || entry.subtitle || 'Observatory Archive'),
        category: String(metadata.category || 'archive'),
        excerpt: excerptAround(entry.body, queryTokens),
        url: entry.url,
        score,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 20);
}
