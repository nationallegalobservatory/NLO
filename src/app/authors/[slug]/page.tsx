import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getAuthorBySlug, getArticles } from '../../../lib/content';
import ArticleCard from '../../../components/ArticleCard';
import Link from 'next/link';
import { ArrowLeft, Globe, BookOpen } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import AuthorInteractions from '../../../components/AuthorInteractions';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const resolvedParams = await props.params;
  const author = await getAuthorBySlug(resolvedParams.slug);
  if (!author) return {};

  const canonicalUrl = `https://legal-observatory.vercel.app/authors/${author.slug}`;

  return {
    title: `${author.name} · Contributor Profile · National Legal Observatory`,
    description: author.bio,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${author.name} · National Legal Observatory`,
      description: author.bio,
      url: canonicalUrl,
      type: 'profile',
      images: [
        {
          url: author.avatar || '/icon.png',
          alt: author.name,
        },
      ],
    },
  };
}

export default async function AuthorProfilePage(props: PageProps) {
  const resolvedParams = await props.params;
  if (resolvedParams.slug === 'bhoomija-khanna') {
    redirect('/bhoomija');
  }
  const author = await getAuthorBySlug(resolvedParams.slug);
  if (!author) {
    return notFound();
  }

  // Get all articles written by this author
  const allArticles = await getArticles();
  const authorArticles = allArticles.filter((art) => art.author === resolvedParams.slug);

  return (
    <div className="space-y-8 py-4 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="text-xs text-slate-400 dark:text-slate-500">
        <Link
          href="/"
          className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Home
        </Link>
      </div>

      {/* Author Info Panel */}
      <AuthorInteractions>
        <section className="p-8 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
          <Avatar
            src={author.avatar}
            alt={author.name}
            className="w-24 h-24 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-inner shrink-0"
          />
          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {author.name}
              </h1>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                {author.role}
              </p>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {author.bio}
            </p>

            {/* Social Links */}
            {author.socialLinks && (
              <div className="pt-2 flex justify-center sm:justify-start gap-4 text-xs text-slate-400 dark:text-slate-500 relative z-10">
                {author.socialLinks.linkedin && (
                  <a
                    href={author.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition space-x-1"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                )}
                {author.socialLinks.website && (
                  <a
                    href={author.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <Globe className="w-4 h-4 mr-1" /> Portfolio
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      </AuthorInteractions>

      {/* Publications by Author */}
      <section className="space-y-6">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-900 pb-2 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-indigo-500" /> Publications by this Contributor ({authorArticles.length})
        </h2>

        {authorArticles.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
            This contributor has not published any papers yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {authorArticles.map((art) => (
              <ArticleCard key={art.slug} article={art} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
