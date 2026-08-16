import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatPublicationDate, getArticleBySlug, getRelatedArticles } from '../../../../lib/content';
import TableOfContents from '../../../../components/TableOfContents';
import ArticleCard from '../../../../components/ArticleCard';
import HighlightMention from '../../../../components/HighlightMention';
import ReadingProgressBar from '../../../../components/ReadingProgressBar';
import AuthorLink from '../../../../components/AuthorLink';
import Link from 'next/link';
import Avatar from '../../../../components/Avatar';
import { Calendar, Clock, User, ArrowLeft, FileText } from 'lucide-react';
import CiteSection from './CiteSection';
import CopyLinkButton from '../../../../components/CopyLinkButton';
import OfflineArticleReader from '@/components/OfflineArticleReader';
interface RouteParams {
  category: string;
  slug: string;
}

interface PageProps {
  params: Promise<RouteParams>;
}

// Generate Dynamic SEO Metadata
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const resolvedParams = await props.params;
  const folderMapping: Record<string, 'judgments' | 'policies' | 'research' | 'opinions'> = {
    judgments: 'judgments',
    policies: 'policies',
    research: 'research',
    opinions: 'opinions',
  };

  const folder = folderMapping[resolvedParams.category];
  if (!folder) return {};

  const article = await getArticleBySlug(folder, resolvedParams.slug);
  if (!article) return {};

  const descriptionText = article.abstract || article.caseSummary || article.policyOverview || '';

  return {
    title: article.title,
    description: descriptionText.slice(0, 160),
    openGraph: {
      title: article.title,
      description: descriptionText.slice(0, 160),
      type: 'article',
      publishedTime: article.date,
      authors: [article.authorDetails?.name || 'Observatory Scholar'],
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: descriptionText.slice(0, 160),
    },
  };
}

import { redirect } from 'next/navigation';

export default async function ArticlePage(props: PageProps) {
  const resolvedParams = await props.params;
  const folderMapping: Record<string, 'judgments' | 'policies' | 'research' | 'opinions'> = {
    judgments: 'judgments',
    policies: 'policies',
    research: 'research',
    opinions: 'opinions',
  };

  const folder = folderMapping[resolvedParams.category];
  if (!folder) {
    return notFound();
  }

  const article = await getArticleBySlug(folder, resolvedParams.slug);
  if (!article) {
    return notFound();
  }

  // Private articles are only accessible from Bhoomija's profile reader
  if (article.private) {
    redirect('/bhoomija');
  }

  const related = await getRelatedArticles(article, 3);
  const formattedDate = formatPublicationDate(article);

  return (
    <div className="space-y-10 py-4">
      <OfflineArticleReader slug={resolvedParams.slug} category={resolvedParams.category} />
      {/* Reading Progress Indicator */}
      <ReadingProgressBar />
      {/* Ctrl+F style highlight — activated by ?highlight= URL param from search */}
      <Suspense fallback={null}>
        <HighlightMention />
      </Suspense>

      {/* Breadcrumb / Back button */}
      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
        <Link
          href="/publications"
          className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Archive
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/publications?type=${
            resolvedParams.category === 'judgments' ? 'judgment' :
            resolvedParams.category === 'policies' ? 'policy' :
            resolvedParams.category === 'opinions' ? 'opinion' :
            'research'
          }`}
          className="capitalize hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          {resolvedParams.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="truncate max-w-[200px] text-slate-800 dark:text-slate-300 font-medium">{article.title}</span>
      </div>

      {/* Article Header block */}
      <header className="space-y-4 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[9px]">
            {article.type}
          </span>
          {article.categories.map((cat) => (
            <span
              key={cat}
              className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider"
            >
              #{cat.replace('-', ' ')}
            </span>
          ))}
        </div>

        <h1 
          className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-slate-900 dark:text-white"
          style={{ viewTransitionName: `article-title-${article.slug}` } as React.CSSProperties}
        >
          {article.title}
        </h1>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 dark:text-slate-400 pt-2 border-b border-slate-200/50 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{article.readingTime}</span>
          </div>
        </div>
      </header>

      {/* Main split grid: Article content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left/Center Column: Publications Details */}
        <div className="lg:col-span-3 space-y-10">
          
          {(article.abstract || article.caseSummary || article.policyOverview) && (
            <div className="p-6 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white mb-2 font-serif">
                {article.type === 'judgment'
                  ? 'Case Summary'
                  : article.type === 'policy'
                  ? 'Policy Overview'
                  : 'Abstract'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                {article.abstract || article.caseSummary || article.policyOverview}
              </p>
            </div>
          )}

          {/* Judgment Review Metadata Panel */}
          {article.type === 'judgment' && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-4 text-xs">
              <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                Legal Research Briefing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {article.legalPrinciples && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Legal Principles Involved
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 leading-normal">
                      {article.legalPrinciples.map((principle) => (
                        <li key={principle}>{principle}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {article.statutesReferenced && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Statutes Referenced
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 leading-normal">
                      {article.statutesReferenced.map((statute) => (
                        <li key={statute}>{statute}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {article.keyTakeaways && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Key Case Takeaways
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 leading-normal">
                    {article.keyTakeaways.map((takeaway) => (
                      <li key={takeaway}>{takeaway}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Policy Review Metadata Panel */}
          {article.type === 'policy' && article.policyObjectives && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-4 text-xs">
              <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                Policy Framework Scope
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Policy Objectives
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 leading-normal">
                    {article.policyObjectives.map((obj) => (
                      <li key={obj}>{obj}</li>
                    ))}
                  </ul>
                </div>
                {article.legalImplications && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Legal Implications
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 leading-normal">
                      {article.legalImplications.map((imp) => (
                        <li key={imp}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rendered HTML content from markdown (using Tailwind CSS prose classes) */}
          <article className="prose max-w-none dark:prose-invert prose-headings:font-serif prose-h2:text-xl prose-h2:font-extrabold prose-h2:mt-8 prose-h2:pb-1 prose-h2:border-b prose-h2:border-slate-200/50 dark:prose-h2:border-slate-800/50 prose-h3:text-lg prose-h3:font-bold prose-h3:mt-6 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:font-semibold prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-850 prose-blockquote:pl-4 prose-blockquote:italic prose-p:leading-relaxed prose-li:leading-relaxed prose-table:text-xs sm:text-justify">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </article>

          {/* Reference List Section (for academic styling) */}
          {article.references && article.references.length > 0 && (
            <section className="pt-8 border-t border-slate-200 dark:border-slate-900 space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                References
              </h3>
              <ol className="list-decimal pl-5 text-xs text-slate-500 dark:text-slate-400 space-y-2 leading-relaxed font-mono">
                {article.references.map((ref) => (
                  <li key={ref} className="select-all">{ref}</li>
                ))}
              </ol>
            </section>
          )}

        </div>        {/* Right Column: Floating Sidebar */}
        <aside className="lg:col-span-1 space-y-8 lg:sticky lg:top-24">
          
          {/* Download Original Document Widget (If available) - NOW AT THE TOP */}
          {article.slug === 'manufacturing-consent' && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Original Document
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Download the complete academic draft in DOCX format, including full annotations and citations.
              </p>
              <a
                href="/NLO_Manufacturing_Consent.docx"
                download
                className="w-full flex items-center justify-center px-4 py-2 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 transition"
              >
                <FileText className="w-4 h-4 mr-2" /> Download Draft (DOCX)
              </a>
            </div>
          )}
          {article.slug === 'propaganda-patriarchy-democracy' && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Original Draft Document
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Download the complete academic draft in DOCX format, including full annotations and citations.
              </p>
              <a
                href="/Gender_Propaganda_Patriarchal_Power_Research_Paper.docx"
                download
                className="w-full flex items-center justify-center px-4 py-2 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 transition"
              >
                <FileText className="w-4 h-4 mr-2" /> Download Draft (DOCX)
              </a>
            </div>
          )}
          {article.slug === 'founding-editorial' && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Original Document
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Download the complete founding editorial draft in DOCX format.
              </p>
              <a
                href="/NLO_Founding_Editorial.docx"
                download
                className="w-full flex items-center justify-center px-4 py-2 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 transition"
              >
                <FileText className="w-4 h-4 mr-2" /> Download Document (DOCX)
              </a>
            </div>
          )}

          {/* A. Dynamic Table of Contents Widget */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl">
            <TableOfContents />
          </div>

          {/* B. Author Details Widget */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-850 pb-2">
              <User className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Publication Author
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <Avatar
                src={article.authorDetails?.avatar}
                alt={article.authorDetails?.name || 'Author'}
                authorSlug={article.author}
                className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-slate-800"
              />
              <div className="space-y-1">
                <AuthorLink
                  slug={article.author}
                  className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  {article.authorDetails?.name || 'Observatory Editor'}
                </AuthorLink>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                  {article.authorDetails?.role}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
              {article.authorDetails?.bio}
            </p>
          </div>

          {/* C. Citation Clipboard Widget (Client-side interactive modal) */}
          <CiteSection article={article} />

          {/* D. Share Widget */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-3 share-buttons">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-850 pb-2">
              Share
            </h4>
            <div className="flex space-x-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://nationallegalobservatory.org/publications/${resolvedParams.category}/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 flex justify-center items-center rounded-md bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors"
                title="Share on Twitter/X"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`https://nationallegalobservatory.org/publications/${resolvedParams.category}/${article.slug}`)}&title=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 flex justify-center items-center rounded-md bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
                title="Share on LinkedIn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`Check out this publication from the National Legal Observatory: https://nationallegalobservatory.org/publications/${resolvedParams.category}/${article.slug}`)}`}
                className="flex-1 py-1.5 flex justify-center items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                title="Share via Email"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </a>
              <CopyLinkButton url={`https://nationallegalobservatory.org/publications/${resolvedParams.category}/${article.slug}`} />
            </div>
          </div>

        </aside>
      </div>

      {/* Related Publications Grid */}
      {related.length > 0 && (
        <section className="pt-12 border-t border-slate-200 dark:border-slate-900 space-y-6">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Related Observatory Publications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((art) => (
              <ArticleCard key={art.slug} article={art} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
