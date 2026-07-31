import { NextResponse } from 'next/server';

import { getArticles, getAuthors, getCategories } from '@/lib/content';
import type { OfflineBootstrapPayload } from '@/lib/local/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [articles, authors, categories] = await Promise.all([
    getArticles(),
    Promise.resolve(getAuthors()),
    Promise.resolve(getCategories()),
  ]);
  const generatedAt = new Date().toISOString();

  const payload: OfflineBootstrapPayload = {
    generatedAt,
    articles: articles.map((article) => ({
      slug: article.slug,
      type: article.type,
      format: article.format,
      title: article.title,
      author: article.author,
      authorName: article.authorDetails?.name || 'Observatory Scholar',
      date: article.date,
      categories: article.categories,
      tags: article.tags,
      content: article.content,
      rawContent: article.rawContent,
      readingTime: article.readingTime,
      abstract: article.abstract,
      caseSummary: article.caseSummary,
      policyOverview: article.policyOverview,
      references: article.references,
      coverImage: article.coverImage,
    })),
    authors: authors.map((author) => ({
      slug: author.slug,
      name: author.name,
      role: author.role,
      avatar: author.avatar,
      bio: author.bio,
      socialLinks: {
        linkedin: author.socialLinks?.linkedin,
        website: author.socialLinks?.website,
      },
      content: author.content,
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      color: category.color,
    })),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
