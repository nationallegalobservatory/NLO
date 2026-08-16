import React from 'react';
import { notFound } from 'next/navigation';
import { formatPublicationDate, getArticleBySlug } from '../../../../lib/content';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import SecureReaderWrapper from '../../../../components/SecureReaderWrapper';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Explicitly NO index — this page must not appear in Google search index
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrivateArticleReader(props: PageProps) {
  const { slug } = await props.params;
  const article = await getArticleBySlug('research', slug);

  // Only serve articles explicitly marked private
  if (!article || !article.private) {
    return notFound();
  }

  const formattedDate = formatPublicationDate(article);

  return (
    <SecureReaderWrapper>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6">
        {/* Back link */}
        <div className="max-w-3xl mx-auto mb-8">
          <Link
            href="/bhoomija"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Bhoomija&apos;s Profile
          </Link>
        </div>

        {/* Reader card */}
        <article className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400 mb-4">
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-slate-800">Research</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-400 dark:text-slate-500 font-medium normal-case tracking-normal">{article.readingTime}</span>
              <span className="ml-auto px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] border border-amber-200 dark:border-amber-700/50">
                🔒 Private Document
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug mb-4">
              {article.title}
            </h1>

            {article.abstract && (
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-l-2 border-indigo-300 dark:border-indigo-700 pl-4 italic">
                {article.abstract}
              </p>
            )}

            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 font-medium">
              By{' '}
              <Link
                href="/bhoomija"
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition"
              >
                {article.authorDetails?.name || 'Bhoomija Khanna'}
              </Link>{' '}
              &mdash; {formattedDate}
            </p>
          </div>

          {/* Watermarked content area */}
          <div className="relative px-8 py-10 overflow-hidden">
            {/* Repeating diagonal watermark */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 select-none z-10 grid grid-cols-3 gap-y-24 gap-x-12 opacity-[0.06] dark:opacity-[0.04]"
              style={{
                transform: 'rotate(-25deg) scale(1.2)',
                transformOrigin: 'center',
              }}
            >
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="text-center text-xs sm:text-sm font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-widest whitespace-nowrap select-none"
                >
                  National Legal Observatory
                </div>
              ))}
            </div>

            {/* Article body */}
            <div
              className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none relative z-20
                prose-headings:font-serif prose-headings:font-bold
                prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-100 prose-h2:dark:border-slate-800 prose-h2:pb-2
                prose-h3:text-base prose-h3:mt-8 prose-h3:mb-3
                prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-indigo-400 prose-blockquote:italic prose-blockquote:text-slate-500
                prose-strong:text-slate-800 dark:prose-strong:text-slate-200
                [&_ol]:list-decimal [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* Footer — absolutely no download options or sharing links */}
          <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 relative z-20">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
              © {new Date().getFullYear()} National Legal Observatory · This document is encrypted and protected.
              All rights reserved. For citation permissions, contact{' '}
              <a href="mailto:bhoomija.k2810@gmail.com" className="text-indigo-500 hover:underline">
                bhoomija.k2810@gmail.com
            </a>
            </p>
          </div>
        </article>
      </div>
    </SecureReaderWrapper>
  );
}
