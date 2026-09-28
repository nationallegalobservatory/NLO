'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, Search, X, Check, SlidersHorizontal } from 'lucide-react';

interface FilterBarProps {
  categories: { slug: string; name: string }[];
  authors: [string, string][];
  years: string[];
  totalItems: number;
}

export default function FilterBar({ categories, authors, years, totalItems }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active values from URL
  const query = searchParams.get('q') || '';
  const activeCategory = searchParams.get('category') || '';
  const activeType = searchParams.get('type') || '';
  const activeAuthor = searchParams.get('author') || '';
  const activeYear = searchParams.get('year') || '';
  const activeReadTime = searchParams.get('readTime') || '';
  const activeSort = searchParams.get('sort') || 'date';

  // Local state for search query input
  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll arrows state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories, authors, years]);

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 200);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { slug: 'shortest', name: 'Shortest' },
  ];

  // Helper to build URL
  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Reset page on filter changes
    params.set('page', '1');

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    router.push(`/publications?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchInput });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    router.push('/publications');
  };

  const activeFiltersCount = [
    query,
    activeCategory,
    activeType,
    activeAuthor,
    activeYear,
    activeReadTime,
  ].filter(Boolean).length;

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Label helpers
  const getCategoryLabel = () => {
    if (!activeCategory) return 'Categories';
    const found = categories.find((c) => c.slug === activeCategory);
    return found ? found.name : 'Category';
  };

  const getFormatLabel = () => {
    if (!activeType) return 'Format';
    const found = formatFilters.find((f) => f.slug === activeType);
    return found ? found.name : 'Format';
  };

  const getReadTimeLabel = () => {
    if (!activeReadTime) return 'Read Time';
    const found = readTimeFilters.find((r) => r.slug === activeReadTime);
    return found ? found.name : 'Read Time';
  };

  const getAuthorLabel = () => {
    if (!activeAuthor) return 'Authors';
    const found = authors.find(([slug]) => slug === activeAuthor);
    return found ? found[1] : 'Author';
  };

  const getYearLabel = () => {
    return activeYear ? `Year: ${activeYear}` : 'Year';
  };

  const getSortLabel = () => {
    const found = sortOptions.find((s) => s.slug === activeSort);
    return found ? `Sort: ${found.name}` : 'Sort';
  };

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* Search & Sort Panel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search keywords, authors, tags..."
            className="w-full border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-10 font-technical-ui text-sm text-on-background placeholder:text-on-surface-variant focus:border-oxblood focus:outline-none dark:border-primary/25 dark:bg-surface-container-low dark:text-on-background dark:placeholder:text-on-background/35 dark:focus:border-primary"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-on-surface-variant dark:text-on-background/40" />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                updateUrl({ q: null });
              }}
              className="absolute right-3 top-3 text-on-surface-variant/75 hover:text-oxblood dark:text-on-background/40 dark:hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex items-center justify-between gap-4 font-technical-ui text-xs sm:justify-end">
          <span className="text-on-surface-variant dark:text-on-background/50">
            Found <span className="font-bold text-on-background dark:text-on-background">{totalItems}</span> publications
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 font-bold uppercase tracking-[0.16em] text-oxblood hover:text-on-background dark:text-primary dark:hover:text-on-background"
            >
              Clear Filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Dropdown Bar with Left/Right Buttons & Scrollable Menus */}
      <div className="relative border-y border-outline-variant/45 py-2.5 dark:border-primary/15">
        {/* Horizontal Navigation Controls */}
        <div className="relative flex items-center">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollHorizontally('left')}
            className={`hidden md:flex absolute left-0 z-20 h-7 w-7 items-center justify-center border border-outline-variant/70 bg-surface shadow-sm transition-opacity hover:border-oxblood hover:text-oxblood dark:border-primary/25 dark:bg-surface-container-low dark:text-primary dark:hover:border-primary ${
              canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll filters left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Left Fade Gradient Mask */}
          {canScrollLeft && (
            <div className="hidden md:block pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory scroll-smooth w-full px-1"
          >
            {/* Filter Label / Icon */}
            <div className="flex items-center gap-1.5 shrink-0 px-2 font-technical-ui text-[10px] font-bold uppercase tracking-[0.15em] text-oxblood dark:text-primary border-r border-outline-variant/45 dark:border-primary/15 mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
            </div>

            {/* 1. Format Dropdown */}
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => toggleDropdown('format')}
                className={`flex items-center gap-1 border px-3.5 py-1.5 rounded-xs font-technical-ui text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeType
                    ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                    : 'border-outline-variant/70 bg-surface hover:border-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70 dark:hover:border-primary'
                }`}
              >
                <span>{getFormatLabel()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'format' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'format' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 min-w-[210px] max-h-[260px] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-1 shadow-xl dark:border-primary/25 dark:bg-surface-container rounded-xs">
                  <button
                    type="button"
                    onClick={() => {
                      updateUrl({ type: null });
                      setOpenDropdown(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                  >
                    <span className={!activeType ? 'font-bold text-oxblood dark:text-primary' : ''}>All Formats</span>
                    {!activeType && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                  </button>
                  {formatFilters.map((fmt) => (
                    <button
                      key={fmt.slug}
                      type="button"
                      onClick={() => {
                        updateUrl({ type: fmt.slug });
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <span className={activeType === fmt.slug ? 'font-bold text-oxblood dark:text-primary' : ''}>{fmt.name}</span>
                      {activeType === fmt.slug && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Category Dropdown */}
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => toggleDropdown('category')}
                className={`flex items-center gap-1 border px-3.5 py-1.5 rounded-xs font-technical-ui text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeCategory
                    ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                    : 'border-outline-variant/70 bg-surface hover:border-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70 dark:hover:border-primary'
                }`}
              >
                <span>{getCategoryLabel()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'category' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 min-w-[240px] max-h-[260px] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-1 shadow-xl dark:border-primary/25 dark:bg-surface-container rounded-xs">
                  <button
                    type="button"
                    onClick={() => {
                      updateUrl({ category: null });
                      setOpenDropdown(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                  >
                    <span className={!activeCategory ? 'font-bold text-oxblood dark:text-primary' : ''}>All Categories</span>
                    {!activeCategory && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => {
                        updateUrl({ category: cat.slug });
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <span className={activeCategory === cat.slug ? 'font-bold text-oxblood dark:text-primary' : ''}>{cat.name}</span>
                      {activeCategory === cat.slug && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Author Dropdown */}
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => toggleDropdown('author')}
                className={`flex items-center gap-1 border px-3.5 py-1.5 rounded-xs font-technical-ui text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeAuthor
                    ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                    : 'border-outline-variant/70 bg-surface hover:border-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70 dark:hover:border-primary'
                }`}
              >
                <span>{getAuthorLabel()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'author' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'author' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 min-w-[220px] max-h-[260px] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-1 shadow-xl dark:border-primary/25 dark:bg-surface-container rounded-xs">
                  <button
                    type="button"
                    onClick={() => {
                      updateUrl({ author: null });
                      setOpenDropdown(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                  >
                    <span className={!activeAuthor ? 'font-bold text-oxblood dark:text-primary' : ''}>All Authors</span>
                    {!activeAuthor && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                  </button>
                  {authors.map(([slug, name]) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => {
                        updateUrl({ author: slug });
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <span className={activeAuthor === slug ? 'font-bold text-oxblood dark:text-primary' : ''}>{name}</span>
                      {activeAuthor === slug && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Year Dropdown */}
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => toggleDropdown('year')}
                className={`flex items-center gap-1 border px-3.5 py-1.5 rounded-xs font-technical-ui text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeYear
                    ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                    : 'border-outline-variant/70 bg-surface hover:border-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70 dark:hover:border-primary'
                }`}
              >
                <span>{getYearLabel()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'year' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'year' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 min-w-[140px] max-h-[260px] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-1 shadow-xl dark:border-primary/25 dark:bg-surface-container rounded-xs">
                  <button
                    type="button"
                    onClick={() => {
                      updateUrl({ year: null });
                      setOpenDropdown(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                  >
                    <span className={!activeYear ? 'font-bold text-oxblood dark:text-primary' : ''}>All Years</span>
                    {!activeYear && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                  </button>
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        updateUrl({ year: y });
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <span className={activeYear === y ? 'font-bold text-oxblood dark:text-primary' : ''}>{y}</span>
                      {activeYear === y && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Read Time Dropdown */}
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => toggleDropdown('readTime')}
                className={`flex items-center gap-1 border px-3.5 py-1.5 rounded-xs font-technical-ui text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeReadTime
                    ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                    : 'border-outline-variant/70 bg-surface hover:border-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70 dark:hover:border-primary'
                }`}
              >
                <span>{getReadTimeLabel()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'readTime' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'readTime' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 min-w-[190px] max-h-[260px] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-1 shadow-xl dark:border-primary/25 dark:bg-surface-container rounded-xs">
                  <button
                    type="button"
                    onClick={() => {
                      updateUrl({ readTime: null });
                      setOpenDropdown(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                  >
                    <span className={!activeReadTime ? 'font-bold text-oxblood dark:text-primary' : ''}>Any Length</span>
                    {!activeReadTime && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                  </button>
                  {readTimeFilters.map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        updateUrl({ readTime: item.slug });
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <span className={activeReadTime === item.slug ? 'font-bold text-oxblood dark:text-primary' : ''}>{item.name}</span>
                      {activeReadTime === item.slug && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Sort Dropdown */}
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => toggleDropdown('sort')}
                className={`flex items-center gap-1 border px-3.5 py-1.5 rounded-xs font-technical-ui text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                  activeSort !== 'date'
                    ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                    : 'border-outline-variant/70 bg-surface hover:border-oxblood dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70 dark:hover:border-primary'
                }`}
              >
                <span>{getSortLabel()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'sort' && (
                <div className="absolute right-0 top-full mt-1.5 z-40 min-w-[160px] max-h-[260px] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-1 shadow-xl dark:border-primary/25 dark:bg-surface-container rounded-xs">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => {
                        updateUrl({ sort: opt.slug });
                        setOpenDropdown(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-technical-ui text-xs hover:bg-oxblood/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <span className={activeSort === opt.slug ? 'font-bold text-oxblood dark:text-primary' : ''}>{opt.name}</span>
                      {activeSort === opt.slug && <Check className="h-3.5 w-3.5 text-oxblood dark:text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Fade Gradient Mask */}
          {canScrollRight && (
            <div className="hidden md:block pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
          )}

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollHorizontally('right')}
            className={`hidden md:flex absolute right-0 z-20 h-7 w-7 items-center justify-center border border-outline-variant/70 bg-surface shadow-sm transition-opacity hover:border-oxblood hover:text-oxblood dark:border-primary/25 dark:bg-surface-container-low dark:text-primary dark:hover:border-primary ${
              canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll filters right"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
