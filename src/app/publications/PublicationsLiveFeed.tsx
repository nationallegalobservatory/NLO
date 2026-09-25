'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ArticleCard from '@/components/ArticleCard';
import type { ArticleData } from '@/lib/markdown';

interface PublicationsLiveFeedProps {
  initialArticles: ArticleData[];
  searchTerm?: string;
  nextScheduledUnlock?: string | null; // ISO string e.g. "2026-09-26T18:00:00+05:30"
}

export default function PublicationsLiveFeed({
  initialArticles,
  searchTerm,
  nextScheduledUnlock,
}: PublicationsLiveFeedProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [articles, setArticles] = useState<ArticleData[]>(initialArticles);
  const [unlockedSlugs, setUnlockedSlugs] = useState<Set<string>>(new Set());

  // Keep articles in sync with server re-renders/filters
  useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  useEffect(() => {
    // If no scheduled unlock is in the future, check periodically every 15s
    const targetTime = nextScheduledUnlock ? new Date(nextScheduledUnlock).getTime() : null;

    const checkForUnlocks = async () => {
      try {
        const res = await fetch('/api/articles/scheduled');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.released)) {
          const currentSlugs = new Set(articles.map((a) => a.slug));
          const newReleases = data.released.filter(
            (a: ArticleData) => !currentSlugs.has(a.slug)
          );

          if (newReleases.length > 0) {
            // Track newly added slugs for wipe-down reveal animation
            setUnlockedSlugs(new Set(newReleases.map((a: ArticleData) => a.slug)));
            
            // Softly refresh page to update counters and server states
            startTransition(() => {
              router.refresh();
            });
          }
        }
      } catch (err) {
        // Silently continue
      }
    };

    let timer: NodeJS.Timeout | null = null;

    if (targetTime && targetTime > Date.now()) {
      const msUntilUnlock = Math.max(0, targetTime - Date.now());
      // Set exact countdown timer
      timer = setTimeout(() => {
        checkForUnlocks();
        // Also poll every 3 seconds for 30 seconds after target time to ensure sync
        const pollInterval = setInterval(checkForUnlocks, 3000);
        setTimeout(() => clearInterval(pollInterval), 30000);
      }, msUntilUnlock);
    } else {
      // Periodic check every 15 seconds
      timer = setInterval(checkForUnlocks, 15000);
    }

    return () => {
      if (timer) clearTimeout(timer as any);
    };
  }, [nextScheduledUnlock, articles, router]);

  return (
    <div className="space-y-5 sm:space-y-10">
      <AnimatePresence initial={false}>
        {articles.map((art) => {
          const isNewlyUnlocked = unlockedSlugs.has(art.slug);

          if (isNewlyUnlocked) {
            return (
              <motion.div
                key={art.slug}
                initial={{ opacity: 0, y: -24, clipPath: 'inset(0 0 100% 0)' }}
                animate={{
                  opacity: 1,
                  y: 0,
                  clipPath: 'inset(0 0 0% 0)',
                  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                }}
              >
                <ArticleCard article={art} searchTerm={searchTerm} />
              </motion.div>
            );
          }

          return (
            <div key={art.slug}>
              <ArticleCard article={art} searchTerm={searchTerm} />
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
