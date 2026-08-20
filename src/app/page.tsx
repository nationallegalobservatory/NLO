import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Clock, Laptop, Landmark, Mail, Scale, Users, Calendar, Sparkles } from 'lucide-react';
import { getArticles } from '../lib/content';
import type { ArticleData } from '../lib/markdown';
import Avatar from '../components/Avatar';
import AuthorLink from '../components/AuthorLink';

function getPublicationPath(article: Pick<ArticleData, 'type' | 'slug'>) {
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

function getBadgeLabel(article: ArticleData) {
  if (article.format === 'monthly-report') return 'REPORT';
  if (article.type === 'opinion') return 'OPINION';
  if (article.type === 'policy') return 'POLICY';
  if (article.type === 'judgment') return 'JUDGMENT';
  return 'RESEARCH';
}

function getExcerpt(article: ArticleData) {
  return (
    article.abstract ||
    article.caseSummary ||
    article.policyOverview ||
    'Primary-source legal analysis from the National Legal Observatory.'
  );
}

function HomeAvatar({
  article,
  className,
}: {
  article: ArticleData;
  className: string;
}) {
  return (
    <Avatar
      src={article.authorDetails?.avatar}
      alt={article.authorDetails?.name || 'Author'}
      authorSlug={article.author}
      className={className}
    />
  );
}

function HeroSection() {
  const actionClass =
    'inline-flex items-center gap-2 border border-outline-variant/60 bg-surface-container-lowest/80 backdrop-blur-sm px-4 py-2.5 font-technical-ui text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-all hover:border-oxblood hover:text-oxblood hover:shadow-md dark:border-primary/25 dark:bg-surface-container-low/90 dark:text-on-background/80 dark:hover:border-primary dark:hover:text-primary';

  return (
    <section className="relative overflow-hidden border-b border-outline-variant/40 bg-transparent px-4 py-12 text-center dark:border-primary/15 sm:px-8 sm:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-oxblood/20 bg-oxblood/5 px-3.5 py-1 font-technical-ui text-[11px] font-bold uppercase tracking-[0.28em] text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Independent Legal Research
        </span>

        <h1 className="mt-6 font-serif text-4xl font-bold leading-tight text-on-background dark:text-on-background sm:text-6xl lg:text-[64px] tracking-tight">
          National Legal Observatory
        </h1>

        <div className="mt-8 h-1 w-20 rounded-full bg-gradient-to-r from-transparent via-[#D3AC2B] to-transparent" />

        <p className="mt-8 max-w-3xl font-serif text-lg italic leading-relaxed text-on-surface-variant dark:text-on-background/80 sm:text-2xl">
          {"“The National Legal Observatory is an attempt to address an observation gap.”"}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/publications" className={actionClass}>
            <BookOpen className="h-4 w-4" />
            Browse Papers
          </Link>
          <Link href="/publications?category=constitutional-law" className={actionClass}>
            <Scale className="h-4 w-4" />
            Constitutional Law
          </Link>
          <Link href="/publications?category=technology-law" className={actionClass}>
            <Laptop className="h-4 w-4" />
            Tech &amp; Policy
          </Link>
          <Link href="/authors" className={actionClass}>
            <Users className="h-4 w-4" />
            Authors
          </Link>
          <Link href="/contact" className={actionClass}>
            <Mail className="h-4 w-4" />
            Submit Research
          </Link>
        </div>
      </div>
    </section>
  );
}

function EditorialDirective() {
  return (
    <section className="mx-auto max-w-5xl rounded-xl border border-oxblood/30 bg-surface-container-lowest/70 p-6 text-center shadow-sm backdrop-blur dark:border-primary/30 dark:bg-surface-container/80 sm:p-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-oxblood/25 bg-oxblood/10 text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
          <Landmark className="h-6 w-6" />
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-on-background dark:text-on-background sm:text-4xl">
            Our Editorial Directive
          </h2>
          <p className="font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/75 sm:text-base sm:leading-8">
            Constitutional law, civil litigation, criminal justice, commercial and contract law, environmental law, labour law, family law, technology and policy; these are all territories this platform covers, with the same rigour and the same commitment to primary sources.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="h-px w-12 bg-oxblood/40 dark:bg-primary/40" />
            <span className="font-technical-ui text-[11px] font-bold uppercase tracking-[0.28em] text-oxblood dark:text-primary">
              Est. 2026
            </span>
            <span className="h-px w-12 bg-oxblood/40 dark:bg-primary/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedPublicationCard({ article }: { article: ArticleData }) {
  const href = getPublicationPath(article);
  const coverImage = article.coverImage || '/images/weaponization/cover.png';

  return (
    <article className="group relative h-full w-full overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm transition-all hover:shadow-md dark:border-primary/20 dark:bg-surface-container">
      <div className="grid grid-cols-1 items-stretch md:grid-cols-12">
        <div className="flex flex-col justify-between p-6 sm:p-8 md:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-3 dark:border-primary/15">
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-oxblood px-2.5 py-0.5 font-technical-ui text-[10px] font-bold uppercase tracking-[0.18em] text-white dark:bg-primary dark:text-background">
                Featured Case
              </span>
              <div className="flex items-center gap-3 font-technical-ui text-[11px] text-on-surface-variant dark:text-on-background/50">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-oxblood dark:text-primary" />
                  {article.readingTime}
                </span>
              </div>
            </div>

            <h3 className="mt-4 font-serif text-2xl font-bold leading-snug text-on-background transition-colors group-hover:text-oxblood dark:text-on-background dark:group-hover:text-primary sm:text-3xl lg:text-3xl xl:text-4xl">
              <Link href={href} className="focus:outline-none">
                {article.title}
              </Link>
            </h3>

            <p className="mt-4 font-body-md text-sm leading-relaxed text-on-surface-variant line-clamp-3 dark:text-on-background/70 sm:text-base">
              {getExcerpt(article)}
            </p>

            {article.categories && article.categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {article.categories.map((cat) => (
                  <span
                    key={cat}
                    className="border border-outline-variant/50 px-2 py-0.5 font-technical-ui text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant dark:border-primary/20 dark:text-on-background/55"
                  >
                    #{cat.replace('-', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-outline-variant/30 pt-4 dark:border-primary/15 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <HomeAvatar
                article={article}
                className="h-9 w-9 rounded-full border border-outline-variant object-cover grayscale dark:border-primary/25"
              />
              <div className="min-w-0">
                <AuthorLink
                  slug={article.author}
                  className="font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-on-background hover:text-oxblood dark:text-on-background dark:hover:text-primary transition-colors block"
                >
                  {article.authorDetails?.name || 'Observatory Scholar'}
                </AuthorLink>
                <p className="font-technical-ui text-[11px] text-on-surface-variant dark:text-on-background/50">
                  {article.date}
                </p>
              </div>
            </div>

            <Link
              href={href}
              className="inline-flex items-center gap-2 border-b border-oxblood pb-0.5 font-technical-ui text-[11px] font-bold uppercase tracking-[0.2em] text-oxblood transition-all hover:gap-3 dark:border-primary dark:text-primary"
            >
              Read Article
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[220px] border-t border-outline-variant/30 bg-surface-container-high dark:border-primary/15 dark:bg-surface-container-low md:col-span-5 md:border-l md:border-t-0">
          <div
            className="h-full min-h-[220px] bg-cover bg-center grayscale contrast-125 opacity-90 transition-opacity hover:opacity-100 dark:opacity-50 dark:hover:opacity-75"
            style={{ backgroundImage: `url(${coverImage})` }}
            aria-label={article.title}
            role="img"
          />
        </div>
      </div>
    </article>
  );
}

function SubmissionCard({ article }: { article: ArticleData }) {
  const href = getPublicationPath(article);

  return (
    <article className="group flex flex-col justify-between rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-all hover:border-oxblood/50 hover:shadow-sm dark:border-primary/15 dark:bg-surface-container-low dark:hover:border-primary/50">
      <div>
        <div className="flex items-center justify-between gap-3 font-technical-ui text-[10px] font-semibold uppercase tracking-[0.18em] text-oxblood dark:text-primary">
          <span className="rounded-xs bg-oxblood/10 px-2 py-0.5 dark:bg-primary/10">
            {getBadgeLabel(article)}
          </span>
          <span className="flex items-center gap-1 text-on-surface-variant dark:text-on-background/50">
            <Clock className="h-3 w-3" />
            {article.readingTime}
          </span>
        </div>

        <h4 className="mt-3 font-serif text-lg font-bold leading-snug text-on-background transition-colors group-hover:text-oxblood dark:text-on-background dark:group-hover:text-primary sm:text-xl">
          <Link href={href} className="focus:outline-none">
            {article.title}
          </Link>
        </h4>
      </div>

      <div className="mt-4 border-t border-outline-variant/30 pt-3 dark:border-primary/15">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <HomeAvatar
              article={article}
              className="h-6 w-6 rounded-full border border-outline-variant object-cover grayscale dark:border-primary/25"
            />
            <AuthorLink
              slug={article.author}
              className="truncate font-technical-ui text-[11px] font-medium text-on-surface-variant hover:text-oxblood dark:text-on-background/60 dark:hover:text-primary transition-colors"
            >
              {article.authorDetails?.name || 'Observatory Scholar'}
            </AuthorLink>
          </div>

          <Link
            href={href}
            className="inline-flex items-center gap-1 font-technical-ui text-[10px] font-bold uppercase tracking-[0.16em] text-oxblood transition hover:gap-1.5 dark:text-primary"
          >
            Read
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ResearchDeskCard({ article }: { article: ArticleData }) {
  const href = getPublicationPath(article);

  return (
    <article className="group relative overflow-hidden rounded-xl border border-oxblood/30 bg-surface-container-lowest p-6 shadow-sm dark:border-primary/25 dark:bg-surface-container sm:p-10">
      <div className="relative flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 border-b border-outline-variant/30 pb-3 dark:border-primary/15">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-600/30 bg-emerald-700/10 px-3 py-1 font-technical-ui text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-300">
              Published Research
            </span>
            <span className="font-technical-ui text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant dark:text-on-background/50">
              Research Article
            </span>
            <span className="ml-auto flex items-center gap-1 font-technical-ui text-[11px] text-on-surface-variant dark:text-on-background/50">
              <Clock className="h-3.5 w-3.5 text-oxblood dark:text-primary" />
              {article.readingTime}
            </span>
          </div>

          <div className="mt-6 max-w-4xl space-y-3">
            <h3 className="font-serif text-2xl font-bold leading-tight text-on-background transition-colors group-hover:text-oxblood dark:text-on-background dark:group-hover:text-primary sm:text-3xl lg:text-4xl">
              <Link href={href} className="focus:outline-none">
                {article.title}
              </Link>
            </h3>
            <p className="max-w-3xl font-body-md text-sm leading-relaxed text-on-surface-variant dark:text-on-background/75 sm:text-base">
              {getExcerpt(article)}
            </p>
          </div>

          {article.categories && article.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {article.categories.map((cat) => (
                <span
                  key={cat}
                  className="border border-oxblood/20 bg-oxblood/5 px-2.5 py-0.5 font-technical-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-oxblood dark:border-primary/20 dark:bg-primary/10 dark:text-primary"
                >
                  #{cat.replace('-', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-outline-variant/30 pt-4 dark:border-primary/15 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <HomeAvatar
              article={article}
              className="h-9 w-9 rounded-full border border-outline-variant object-cover grayscale dark:border-primary/25"
            />
            <div>
              <AuthorLink
                slug={article.author}
                className="font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-on-background hover:text-oxblood dark:text-on-background dark:hover:text-primary transition-colors block"
              >
                {article.authorDetails?.name || 'Observatory Scholar'}
              </AuthorLink>
              <p className="font-technical-ui text-[10px] uppercase tracking-[0.2em] text-on-surface-variant dark:text-on-background/50">
                National Legal Observatory Research Desk
              </p>
            </div>
          </div>

          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-md border border-oxblood bg-oxblood px-5 py-2.5 font-technical-ui text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed"
          >
            Read Article
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function Homepage() {
  const articles = await getArticles();
  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));

  const deepfakesArticle = articleBySlug.get('nlo-deepfakes-it-rules-2026') ?? null;
  const weaponizationArticle = articleBySlug.get('the-weaponization-of-human-rights') ?? null;
  const featuredArticle =
    deepfakesArticle ?? weaponizationArticle ?? articles[0] ?? null;
  const tukaramArticle = articleBySlug.get('tukaram-v-maharashtra-nlo-judgment-review') ?? null;
  const julyReviewArticle = articleBySlug.get('monthly-legal-review-july-2026') ?? null;
  const juneReviewArticle = articleBySlug.get('monthly-legal-review-june-2026') ?? null;
  const manufacturingConsentArticle = articleBySlug.get('manufacturing-consent') ?? null;
  const foundingEditorialArticle = articleBySlug.get('founding-editorial') ?? null;
  const researchDeskArticle =
    tukaramArticle ?? manufacturingConsentArticle ?? articles.find((article) => article.type === 'research') ?? featuredArticle;

  const recentArticles = [
    julyReviewArticle,
    weaponizationArticle,
    juneReviewArticle,
  ].filter(Boolean) as ArticleData[];

  return (
    <div className="mx-auto max-w-[1120px] space-y-16 py-2 sm:py-6">
      <HeroSection />
      <EditorialDirective />

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-outline-variant/50 pb-3 dark:border-primary/20">
          <h1 className="font-serif text-2xl font-bold text-on-background dark:text-on-background sm:text-3xl lg:text-4xl">
            Current Publications
          </h1>
          <Link
            href="/publications"
            className="inline-flex items-center gap-2 font-technical-ui text-xs font-bold uppercase tracking-[0.18em] text-oxblood transition hover:text-on-background dark:text-primary dark:hover:text-on-background"
          >
            All Papers
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,0.9fr)] items-stretch">
          <div className="flex flex-col h-full space-y-3">
            <p className="font-technical-ui text-xs font-bold uppercase tracking-[0.28em] text-on-surface-variant dark:text-on-background/45">
              Featured Analysis
            </p>
            <div className="flex-1 flex">
              {featuredArticle && <FeaturedPublicationCard article={featuredArticle} />}
            </div>
          </div>

          <div className="flex flex-col h-full space-y-3">
            <p className="font-technical-ui text-xs font-bold uppercase tracking-[0.28em] text-on-surface-variant dark:text-on-background/45">
              Recent Submissions
            </p>
            <div className="flex-1 flex flex-col justify-between gap-3">
              {recentArticles.map((article) => (
                <SubmissionCard key={article.slug} article={article} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-outline-variant/50 pb-3 dark:border-primary/20">
          <h2 className="font-serif text-2xl font-bold text-on-background dark:text-on-background sm:text-3xl lg:text-4xl">
            Research Desk
          </h2>
          <Link
            href="/publications?type=research"
            className="inline-flex items-center gap-2 font-technical-ui text-xs font-bold uppercase tracking-[0.18em] text-oxblood transition hover:text-on-background dark:text-primary dark:hover:text-on-background"
          >
            All Research
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {researchDeskArticle && <ResearchDeskCard article={researchDeskArticle} />}
      </section>
    </div>
  );
}
