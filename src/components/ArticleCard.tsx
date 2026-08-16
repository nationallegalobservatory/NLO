import React from 'react';
import Link from 'next/link';
import { ArticleData } from '../lib/markdown';
import { formatPublicationDate } from '../lib/content';
import { Calendar, Clock, ArrowUpRight, Pin } from 'lucide-react';
import AuthorLink from './AuthorLink';
import Avatar from './Avatar';

export default function ArticleCard({ article, searchTerm }: { article: ArticleData; searchTerm?: string }) {
  // Map internal database folders to correct URL routes
  const typeMapping: Record<string, string> = {
    judgment: 'judgments',
    policy: 'policies',
    research: 'research',
    opinion: 'opinions',
  };

  const folder = typeMapping[article.type] || 'research';
  const articleUrl = `/publications/${folder}/${article.slug}`;
  const formattedDate = formatPublicationDate(article);
  const actionLabel = article.format === 'monthly-report' ? 'Open Issue' : 'Read Article';

  return (
    <article className="group border border-outline-variant/30 bg-surface-container-lowest p-5 transition-colors dark:border-primary/15 dark:bg-surface-container sm:p-8">
      <div>
        {/* Top Header Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3 font-technical-ui text-xs text-on-surface-variant dark:text-on-background/50">
          <span className="bg-oxblood/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-oxblood dark:bg-primary/10 dark:text-primary">
            {article.type}
          </span>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{article.readingTime}</span>
          </div>
        </div>

        {/* Title */}
        <h3 
          className="mt-1 font-serif text-2xl font-semibold leading-snug text-on-background transition-colors group-hover:text-oxblood dark:text-on-background dark:group-hover:text-primary sm:text-3xl lg:text-4xl"
          style={{ viewTransitionName: `article-title-${article.slug}` } as React.CSSProperties}
        >
          <Link href={articleUrl} className="focus:outline-none">
            {article.title}
          </Link>
        </h3>

        {/* Abstract / Summary */}
        <p className="mt-4 font-body-md text-sm leading-7 text-on-surface-variant line-clamp-3 dark:text-on-background/70 sm:text-base sm:leading-8">
          {article.abstract || article.caseSummary || article.policyOverview || 'Click to read full legal publication, including case summaries, legislative objectives, references, and citations.'}
        </p>

        {/* Categories / Tags badges */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {article.categories.map((cat) => (
            <span key={cat} className="border border-outline-variant/65 px-2 py-0.5 font-technical-ui text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant dark:border-primary/20 dark:text-on-background/45">
              #{cat.replace('-', ' ')}
            </span>
          ))}
        </div>
      </div>

        {/* Footer Info Row */}
      <div className="mt-6 space-y-3 border-t border-outline-variant/30 pt-4 dark:border-primary/15">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 font-technical-ui text-xs">
            <Avatar
              src={article.authorDetails?.avatar}
              alt={article.authorDetails?.name || 'Author'}
              authorSlug={article.author}
              className="h-7 w-7 rounded-full border border-outline-variant object-cover grayscale dark:border-primary/25"
            />
            <AuthorLink
              slug={article.author}
              className="font-semibold uppercase tracking-[0.12em] text-on-background hover:text-oxblood dark:text-on-background dark:hover:text-primary"
            >
              {article.authorDetails?.name || 'Observatory Editor'}
            </AuthorLink>
            <span className="inline-flex items-center gap-1 text-on-surface-variant dark:text-on-background/45">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
          </div>

          <Link
            href={articleUrl}
            className="flex items-center font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-oxblood transition hover:text-on-background group-hover:underline dark:text-primary dark:hover:text-on-background"
          >
            {actionLabel} <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Jump to mention button — only shows when search/tag filter is active */}
        {searchTerm && searchTerm.trim().length >= 2 && (
          <Link
            href={`${articleUrl}?highlight=${encodeURIComponent(searchTerm.trim())}`}
            className="inline-flex items-center gap-1.5 border border-oxblood/25 bg-oxblood/10 px-2.5 py-1 font-technical-ui text-[11px] font-semibold text-oxblood transition-all duration-150 hover:bg-oxblood/15 dark:border-primary/25 dark:bg-primary/10 dark:text-primary dark:hover:bg-primary/15 group/jump"
            title={`Jump to first mention of "${searchTerm}" in this article`}
          >
            <Pin className="w-3 h-3 group-hover/jump:scale-110 transition-transform" />
            Jump to &ldquo;{searchTerm.trim().length > 22 ? searchTerm.trim().slice(0, 22) + '…' : searchTerm.trim()}&rdquo; →
          </Link>
        )}
      </div>
    </article>
  );
}
