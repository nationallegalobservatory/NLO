import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/content';

/**
 * Public scheduled articles endpoint.
 * Returns newly unlocked articles once their publishAt timestamp has passed,
 * or scheduled metadata for client-side auto-unlock timers without leaking full content.
 */
export async function GET() {
  const allArticles = await getArticles(undefined, true);
  const now = Date.now();

  const released = allArticles
    .filter((a) => !a.publishAt || new Date(a.publishAt).getTime() <= now)
    .map((a) => ({
      slug: a.slug,
      type: a.type,
      format: a.format,
      title: a.title,
      author: a.author,
      authorDetails: a.authorDetails,
      date: a.date,
      publishAt: a.publishAt,
      categories: a.categories,
      tags: a.tags,
      abstract: a.abstract || a.caseSummary || a.policyOverview || '',
      readingTime: a.readingTime,
      coverImage: a.coverImage,
    }));

  // Also send scheduled article unlock timers (metadata only, no text)
  const scheduled = allArticles
    .filter((a) => a.publishAt && new Date(a.publishAt).getTime() > now)
    .map((a) => ({
      slug: a.slug,
      type: a.type,
      format: a.format,
      title: a.title,
      publishAt: a.publishAt,
    }));

  return NextResponse.json({
    now: new Date().toISOString(),
    released,
    scheduled,
  });
}
