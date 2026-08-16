'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CloudOff, FileText } from 'lucide-react';

import { localContentRepository } from '@/lib/local/repositories';
import type { LocalArticle } from '@/lib/local/types';

export default function OfflineArticleReader({
  slug,
  category,
}: {
  slug: string;
  category: string;
}) {
  const [offline, setOffline] = useState(false);
  const [article, setArticle] = useState<LocalArticle | null>(null);

  useEffect(() => {
    const update = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!offline) return;
    void localContentRepository.getArticle(slug).then((row) => setArticle((row as LocalArticle) || null));
  }, [offline, slug]);

  if (!offline) {
    return null;
  }

  const folder =
    category === 'judgments'
      ? 'judgments'
      : category === 'policies'
        ? 'policies'
        : category === 'opinions'
          ? 'opinions'
          : 'research';

  if (!article) {
    return (
      <section className="mb-8 border border-outline-variant bg-surface-container-lowest p-5 dark:border-primary/25 dark:bg-surface-container">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oxblood dark:text-primary">
          <CloudOff className="h-4 w-4" />
          Offline article
        </div>
        <p className="mt-3 text-sm text-on-surface-variant dark:text-on-background/65">
          This article is not in the local cache yet. Open it once while online to make it
          available offline.
        </p>
        <Link
          href="/publications"
          className="mt-4 inline-flex items-center gap-2 border border-oxblood bg-oxblood px-4 py-3 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to archive
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-8 border border-outline-variant bg-surface-container-lowest p-5 dark:border-primary/25 dark:bg-surface-container">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oxblood dark:text-primary">
        <CloudOff className="h-4 w-4" />
        Offline article cache
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant dark:text-on-background/55">
        <FileText className="h-4 w-4" />
        {folder}
      </div>
      <h2 className="mt-3 font-serif text-3xl font-bold text-on-background dark:text-on-background">
        {article.title}
      </h2>
      <p className="mt-2 text-sm text-on-surface-variant dark:text-on-background/65">
        {article.authorName || 'Observatory Scholar'} · {article.readingTime}
      </p>
      <div
        className="prose mt-6 max-w-none dark:prose-invert prose-headings:font-serif prose-p:leading-8 prose-li:leading-8"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
      <Link
        href="/publications"
        className="mt-6 inline-flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-4 py-3 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-on-background"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to archive
      </Link>
    </section>
  );
}
