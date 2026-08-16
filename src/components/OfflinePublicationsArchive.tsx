'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CloudOff, Search } from 'lucide-react';

import { localContentRepository } from '@/lib/local/repositories';
import type { LocalArticle, LocalCategory } from '@/lib/local/types';

type SearchParams = {
  q?: string;
  category?: string;
  type?: string;
  tag?: string;
  author?: string;
  year?: string;
  readTime?: string;
  sort?: string;
  page?: string;
};

function getPublicationPath(article: Pick<LocalArticle, 'type' | 'slug'>) {
  const folder =
    article.type === 'judgment'
      ? 'judgments'
      : article.type === 'policy'
        ? 'policies'
        : article.type === 'research'
          ? 'research'
          : 'opinions';
  return `/publications/${folder}/${article.slug}`;
}

export default function OfflinePublicationsArchive({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [offline, setOffline] = useState(false);
  const [articles, setArticles] = useState<LocalArticle[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);

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
    void Promise.all([localContentRepository.getArticles(), localContentRepository.search('')])
      .then(async ([rows]) => {
        setArticles(rows as LocalArticle[]);
        const cats = await (await import('@/lib/local/db')).localDb.categories.toArray();
        setCategories(cats);
      })
      .catch(() => {
        setArticles([]);
      });
  }, [offline]);

  const filtered = useMemo(() => {
    let next = [...articles];
    const q = (searchParams.q || '').trim().toLowerCase();
    if (q) {
      next = next.filter((article) =>
        [
          article.title,
          article.rawContent,
          article.authorName,
          article.tags.join(' '),
          article.categories.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    if (searchParams.category) {
      next = next.filter((article) => article.categories.includes(searchParams.category!));
    }
    if (searchParams.type) {
      next = next.filter((article) => article.type === searchParams.type || article.format === searchParams.type);
    }
    return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [articles, searchParams]);

  if (!offline) {
    return null;
  }

  return (
    <section className="mb-8 border border-outline-variant bg-surface-container-lowest p-5 dark:border-primary/25 dark:bg-surface-container">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oxblood dark:text-primary">
        <CloudOff className="h-4 w-4" />
        Offline archive
      </div>
      <h2 className="mt-3 font-serif text-3xl font-bold text-on-background dark:text-on-background">
        Cached publications
      </h2>
      <p className="mt-2 max-w-2xl font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/65">
        These results come from IndexedDB, so you can keep reading even without a connection.
      </p>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.slice(0, 8).map((cat) => (
            <span
              key={cat.slug}
              className="border border-outline-variant px-2 py-1 font-technical-ui text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant dark:border-primary/20 dark:text-on-background/60"
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 border border-outline-variant bg-surface px-3 py-2 dark:border-primary/20 dark:bg-surface-container-low">
        <Search className="h-4 w-4 text-oxblood dark:text-primary" />
        <span className="font-technical-ui text-xs uppercase tracking-[0.14em] text-on-surface-variant dark:text-on-background/55">
          {filtered.length} cached publication{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-6 grid gap-4">
        {filtered.map((article) => (
          <article
            key={article.slug}
            className="border border-outline-variant/45 bg-surface-container-low p-4 dark:border-primary/20 dark:bg-surface-container-low"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-oxblood/25 bg-oxblood/10 px-2 py-1 font-technical-ui text-[10px] font-bold uppercase tracking-[0.14em] text-oxblood dark:border-primary/25 dark:bg-primary/10 dark:text-primary">
                {article.type}
              </span>
              <span className="font-technical-ui text-[10px] uppercase tracking-[0.16em] text-on-surface-variant dark:text-on-background/45">
                {article.readingTime}
              </span>
            </div>
            <h3 className="mt-3 font-serif text-2xl font-bold text-on-background dark:text-on-background">
              <Link href={getPublicationPath(article)}>{article.title}</Link>
            </h3>
            <p className="mt-2 font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/65">
              {article.abstract || article.caseSummary || article.policyOverview || 'Cached publication'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="bg-surface px-2 py-1 font-technical-ui text-[10px] uppercase tracking-[0.12em] text-on-surface-variant dark:bg-surface-container dark:text-on-background/55"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-sm text-on-surface-variant dark:text-on-background/60">
            No cached publications yet. Open the archive once while online to seed it.
          </p>
        )}
      </div>
    </section>
  );
}
