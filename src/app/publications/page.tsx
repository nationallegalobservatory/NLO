import React from 'react';
import { getArticles, getCategories, getPageViewCount } from '../../lib/content';
import ArticleCard from '../../components/ArticleCard';
import Link from 'next/link';
import { AlertCircle, ArrowUpDown, FileText, Landmark, Search, Tag } from 'lucide-react';
import FilterBar from '../../components/FilterBar';
import OfflinePublicationsArchive from '@/components/OfflinePublicationsArchive';

interface SearchParams {
  q?: string;
  category?: string;
  type?: string;
  tag?: string;
  author?: string;
  year?: string;
  readTime?: string;
  sort?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export const metadata = {
  title: 'Publications Archive',
  description: 'Search, filter, and read our entire repository of independent legal research papers.',
};

export default async function PublicationsPage(props: PageProps) {
  const params = await props.searchParams;
  const query = params.q || '';
  const category = params.category || '';
  const activeType = params.type || '';
  const activeTag = params.tag || '';
  const author = params.author || '';
  const year = params.year || '';
  const readTime = params.readTime || '';
  const sort = params.sort || 'date';
  const pageNum = parseInt(params.page || '1', 10);
  const itemsPerPage = 10;

  const rawArticles = await getArticles();
  const categories = await getCategories();

  let filteredArticles = [...rawArticles];

  if (query.trim()) {
    const cleanQuery = query.toLowerCase().trim();
    filteredArticles = filteredArticles.filter((art) => {
      const titleMatch = art.title.toLowerCase().includes(cleanQuery);
      const contentMatch = art.rawContent?.toLowerCase().includes(cleanQuery);
      const tagMatch = art.tags.some((t) => t.toLowerCase().includes(cleanQuery));
      const authorMatch = art.authorDetails?.name.toLowerCase().includes(cleanQuery);
      return titleMatch || contentMatch || tagMatch || authorMatch;
    });
  }

  if (category) {
    filteredArticles = filteredArticles.filter((art) => art.categories.includes(category));
  }

  if (activeType) {
    filteredArticles = filteredArticles.filter((art) => art.type === activeType || art.format === activeType);
  }

  if (activeTag) {
    filteredArticles = filteredArticles.filter((art) =>
      art.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())
    );
  }

  if (author) {
    filteredArticles = filteredArticles.filter((art) => art.authorDetails?.slug === author || art.author === author);
  }

  if (year) {
    filteredArticles = filteredArticles.filter((art) => new Date(art.date).getFullYear().toString() === year);
  }

  if (readTime) {
    filteredArticles = filteredArticles.filter((art) => {
      const minutes = parseInt(art.readingTime?.replace(/\D/g, '') || '0', 10);
      if (readTime === 'short') return minutes <= 5;
      if (readTime === 'medium') return minutes > 5 && minutes <= 15;
      if (readTime === 'long') return minutes > 15;
      return true;
    });
  }

  if (sort === 'popularity') {
    const articlesWithViews = await Promise.all(
      filteredArticles.map(async (art) => {
        const views = await getPageViewCount(art.slug);
        return { art, views };
      })
    );
    articlesWithViews.sort((a, b) => b.views - a.views);
    filteredArticles = articlesWithViews.map((item) => item.art);
  } else if (sort === 'longest') {
    filteredArticles.sort((a, b) => parseInt(b.readingTime?.replace(/\D/g, '') || '0', 10) - parseInt(a.readingTime?.replace(/\D/g, '') || '0', 10));
  } else if (sort === 'shortest') {
    filteredArticles.sort((a, b) => parseInt(a.readingTime?.replace(/\D/g, '') || '0', 10) - parseInt(b.readingTime?.replace(/\D/g, '') || '0', 10));
  } else if (sort === 'relevance' && query.trim()) {
    const cleanQuery = query.toLowerCase().trim();
    filteredArticles.sort((a, b) => {
      const scoreA = (a.title.toLowerCase().match(new RegExp(cleanQuery, 'g'))?.length || 0) * 3 + (a.rawContent?.toLowerCase().match(new RegExp(cleanQuery, 'g'))?.length || 0);
      const scoreB = (b.title.toLowerCase().match(new RegExp(cleanQuery, 'g'))?.length || 0) * 3 + (b.rawContent?.toLowerCase().match(new RegExp(cleanQuery, 'g'))?.length || 0);
      return scoreB - scoreA;
    });
  } else {
    filteredArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const totalItems = filteredArticles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (pageNum - 1) * itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + itemsPerPage);

  const allTags = Array.from(new Set(rawArticles.flatMap((art) => art.tags))).slice(0, 8);
  const allYears = Array.from(
    new Set(rawArticles.map((art) => new Date(art.date).getFullYear().toString()))
  ).sort((a, b) => parseInt(b) - parseInt(a));
  
  const allAuthors = Array.from(
    new Map(rawArticles.map((art) => [art.authorDetails?.slug || art.author, art.authorDetails?.name || art.author])).entries()
  ) as [string, string][];

  const getHref = (updates: Partial<SearchParams>, isReset: boolean = false) => {
    const newParams = isReset ? {} : { q: query, category, type: activeType, tag: activeTag, author, year, readTime, sort, page: pageNum.toString() };
    const merged = { ...newParams, ...updates };

    Object.keys(merged).forEach((key) => {
      const val = merged[key as keyof typeof merged];
      if (!val || (val === '1' && key === 'page') || (val === 'date' && key === 'sort')) {
        delete merged[key as keyof typeof merged];
      }
    });

    const queryString = new URLSearchParams(merged).toString();
    return `/publications${queryString ? `?${queryString}` : ''}`;
  };

  const formatFilters = [
    { slug: 'monthly-report', name: 'Monthly Reviews' },
    { slug: 'research', name: 'Research Articles' },
    { slug: 'judgment', name: 'Judgment Reviews' },
    { slug: 'policy', name: 'Policy Briefs' },
    { slug: 'opinion', name: 'Essays & Opinions' },
    { slug: 'blog', name: 'Blog Posts' },
  ];
  const readTimeFilters = [
    { slug: 'short', name: 'Short (< 5 min)' },
    { slug: 'medium', name: 'Medium (5-15 min)' },
    { slug: 'long', name: 'Long (> 15 min)' },
  ];
  const sortOptions = [
    { slug: 'date', name: 'Latest' },
    ...(query ? [{ slug: 'relevance', name: 'Relevance' }] : []),
    { slug: 'popularity', name: 'Popularity' },
    { slug: 'longest', name: 'Longest' },
  ];
  const activeFilterCount = [query, category, activeType, activeTag, author, year, readTime].filter(Boolean).length;

  const sideLinkClass = (isActive: boolean) =>
    `block py-2 text-sm transition-colors ${
      isActive
        ? 'border-l-2 border-oxblood bg-oxblood/10 pl-3 font-semibold text-oxblood dark:border-primary dark:bg-primary/10 dark:text-primary'
        : 'pl-3 text-on-surface-variant hover:text-oxblood dark:text-on-background/60 dark:hover:text-primary'
    }`;

  const chipClass = (isActive: boolean) =>
    `border px-3 py-1.5 font-technical-ui text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
      isActive
        ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
        : 'border-outline-variant bg-surface text-on-surface-variant hover:border-oxblood hover:text-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/55 dark:hover:border-primary dark:hover:text-primary'
    }`;

  return (
    <div className="mx-auto max-w-screen-2xl py-4 sm:py-10">
      <OfflinePublicationsArchive
        searchParams={{ q: query, category, type: activeType, tag: activeTag, author, year, readTime, sort, page: params.page }}
      />
      <header className="border-b border-outline-variant/45 pb-8 dark:border-primary/20">
        <span className="font-technical-ui text-xs font-bold uppercase tracking-[0.28em] text-oxblood dark:text-primary">
          Archive Catalogue
        </span>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <h1 className="font-serif text-3xl font-bold leading-tight text-on-background dark:text-on-background sm:text-5xl lg:text-6xl">
              Publications Archive
            </h1>
            <p className="mt-3 max-w-3xl font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/70 sm:text-lg sm:leading-8">
              Search, filter, and read the observatory repository of independent legal research papers.
            </p>
          </div>
          <div className="hidden border border-outline-variant/45 bg-surface-container-low p-5 dark:border-primary/20 dark:bg-surface-container lg:block">
            <p className="font-technical-ui text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant dark:text-on-background/45">
              Records Matched
            </p>
            <p className="mt-2 font-serif text-5xl font-semibold text-oxblood dark:text-primary">
              {totalItems}
            </p>
            <p className="mt-1 font-technical-ui text-xs text-on-surface-variant dark:text-on-background/50">
              {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}` : 'Unfiltered archive'}
            </p>
          </div>
        </div>

        {/* Chips only for PC view */}
        <div className="hidden lg:flex mt-8 flex-wrap items-center gap-3 border-t border-outline-variant/30 pt-5 font-technical-ui text-xs dark:border-primary/15">
          <span className="font-bold uppercase tracking-[0.18em] text-on-background dark:text-on-background">
            Filters:
          </span>
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={cat.slug}
              href={getHref({ category: category === cat.slug ? undefined : cat.slug, page: '1' })}
              className={chipClass(category === cat.slug)}
            >
              {cat.name}
            </Link>
          ))}
          {(query || category || activeType || activeTag || author || year || readTime) && (
            <Link href={getHref({}, true)} className="ml-auto font-bold uppercase tracking-[0.18em] text-oxblood hover:text-on-background dark:text-primary dark:hover:text-on-background">
              Clear Filters
            </Link>
          )}
        </div>
      </header>

      {/* Modern Horizontal Scrolling Dropdown Filter Bar — Mobile/Portrait Only */}
      <div className="lg:hidden mt-6">
        <FilterBar
          categories={categories}
          authors={allAuthors}
          years={allYears}
          totalItems={totalItems}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-12 sm:gap-12 lg:grid-cols-12">
        <section className="lg:col-span-8">
          {/* Mobile indicator showing matches, but sort bar stays for desktop */}
          <div className="mb-10 flex flex-col gap-4 border-b border-outline-variant/35 pb-5 dark:border-primary/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-technical-ui text-xs uppercase tracking-[0.18em] text-on-surface-variant dark:text-on-background/50">
              Showing <span className="font-bold text-on-background dark:text-on-background">{filteredArticles.length}</span> publications
            </div>

            {/* Desktop Sort Chips */}
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 font-technical-ui text-xs uppercase tracking-[0.14em] text-on-surface-variant dark:text-on-background/50">
                <ArrowUpDown className="h-3.5 w-3.5 text-oxblood dark:text-primary" />
                Sort
              </div>
              {sortOptions.map((option) => (
                <Link
                  key={option.slug}
                  href={getHref({ sort: option.slug, page: '1' })}
                  className={chipClass(sort === option.slug)}
                >
                  {option.name}
                </Link>
              ))}
            </div>
          </div>

          {paginatedArticles.length === 0 ? (
            <div className="border border-outline-variant/45 bg-surface-container-lowest px-6 py-16 text-center dark:border-primary/20 dark:bg-surface-container">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-outline dark:text-primary/50" />
              <h3 className="font-serif text-2xl font-semibold text-on-background dark:text-on-background">
                {query ? (
                  <React.Fragment>No results for &ldquo;<span className="text-oxblood dark:text-primary">{query}</span>&rdquo;</React.Fragment>
                ) : (
                  'No publications found'
                )}
              </h3>
              <p className="mx-auto mt-3 max-w-sm font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/60">
                Try adjusting your keywords or clearing the active filters.
              </p>
              <Link
                href={getHref({}, true)}
                className="mt-6 inline-flex border border-oxblood bg-oxblood px-5 py-3 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed"
              >
                Reset All Filters
              </Link>
            </div>
          ) : (
            <div className="space-y-5 sm:space-y-10">
              {paginatedArticles.map((art) => (
                <div key={art.slug}>
                  <ArticleCard article={art} searchTerm={query || activeTag || undefined} />
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 font-technical-ui text-xs">
              {pageNum > 1 ? (
                <Link href={getHref({ page: (pageNum - 1).toString() })} className={chipClass(false)}>
                  Previous
                </Link>
              ) : (
                <span className="border border-outline-variant/45 px-3 py-1.5 text-outline dark:border-primary/15 dark:text-on-background/25">
                  Previous
                </span>
              )}

              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <Link key={p} href={getHref({ page: p.toString() })} className={chipClass(p === pageNum)}>
                    {p}
                  </Link>
                );
              })}

              {pageNum < totalPages ? (
                <Link href={getHref({ page: (pageNum + 1).toString() })} className={chipClass(false)}>
                  Next
                </Link>
              ) : (
                <span className="border border-outline-variant/45 px-3 py-1.5 text-outline dark:border-primary/15 dark:text-on-background/25">
                  Next
                </span>
              )}
            </div>
          )}
        </section>

        {/* Sidebar section — Desktop Only */}
        <aside className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-28 space-y-8 border border-outline-variant/40 bg-surface-container-low p-6 dark:border-primary/20 dark:bg-surface-container">
            <section>
              <h2 className="mb-4 flex items-center border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                <Search className="mr-2 h-4 w-4 text-oxblood dark:text-primary" />
                Search Filter
              </h2>
              <form method="GET" action="/publications" className="relative">
                {category && <input type="hidden" name="category" value={category} />}
                {activeType && <input type="hidden" name="type" value={activeType} />}
                {activeTag && <input type="hidden" name="tag" value={activeTag} />}
                {author && <input type="hidden" name="author" value={author} />}
                {year && <input type="hidden" name="year" value={year} />}
                {readTime && <input type="hidden" name="readTime" value={readTime} />}
                {sort && <input type="hidden" name="sort" value={sort} />}
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Keywords..."
                  className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 font-technical-ui text-sm text-on-background placeholder:text-on-surface-variant focus:border-oxblood focus:outline-none dark:border-primary/25 dark:text-on-background dark:placeholder:text-on-background/35 dark:focus:border-primary"
                />
                <button type="submit" className="absolute right-0 top-3 text-oxblood hover:text-on-background dark:text-primary dark:hover:text-on-background" aria-label="Search publications">
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </section>

            <section>
              <h2 className="mb-3 flex items-center border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                <FileText className="mr-2 h-4 w-4 text-oxblood dark:text-primary" />
                Formats
              </h2>
              <div className="space-y-1 font-technical-ui">
                <Link href={getHref({ type: undefined, page: '1' })} className={sideLinkClass(!activeType)}>
                  All Formats
                </Link>
                {formatFilters.map((fmt) => (
                  <Link key={fmt.slug} href={getHref({ type: fmt.slug, page: '1' })} className={sideLinkClass(activeType === fmt.slug)}>
                    {fmt.name}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 flex items-center border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                <Tag className="mr-2 h-4 w-4 text-oxblood dark:text-primary" />
                Hot Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isTagActive = activeTag.toLowerCase() === tag.toLowerCase();
                  return (
                    <Link key={tag} href={getHref({ tag: isTagActive ? undefined : tag, page: '1' })} className={chipClass(isTagActive)}>
                      {tag}
                    </Link>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 flex items-center border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                <Landmark className="mr-2 h-4 w-4 text-oxblood dark:text-primary" />
                Categories
              </h2>
              <div className="space-y-1 font-technical-ui">
                <Link href={getHref({ category: undefined, page: '1' })} className={sideLinkClass(!category)}>
                  All Categories
                </Link>
                {categories.map((cat) => (
                  <Link key={cat.slug} href={getHref({ category: cat.slug, page: '1' })} className={sideLinkClass(category === cat.slug)}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                Authors
              </h2>
              <div className="space-y-1 font-technical-ui">
                <Link href={getHref({ author: undefined, page: '1' })} className={sideLinkClass(!author)}>
                  All Authors
                </Link>
                {allAuthors.map(([slug, name]) => (
                  <Link key={slug} href={getHref({ author: slug, page: '1' })} className={sideLinkClass(author === slug)}>
                    {name}
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <h2 className="mb-3 border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                  Year
                </h2>
                <div className="flex flex-wrap gap-2">
                  {allYears.map((y) => (
                    <Link key={y} href={getHref({ year: year === y ? undefined : y, page: '1' })} className={chipClass(year === y)}>
                      {y}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 border-b border-outline-variant/50 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
                  Read Time
                </h2>
                <div className="space-y-1 font-technical-ui">
                  <Link href={getHref({ readTime: undefined, page: '1' })} className={sideLinkClass(!readTime)}>
                    Any Length
                  </Link>
                  {readTimeFilters.map((item) => (
                    <Link key={item.slug} href={getHref({ readTime: item.slug, page: '1' })} className={sideLinkClass(readTime === item.slug)}>
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
