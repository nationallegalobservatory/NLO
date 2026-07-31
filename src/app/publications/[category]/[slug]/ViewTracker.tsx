'use client';

import { useEffect } from 'react';
import { recordPageViewLocalFirst } from '@/lib/api/offlineActions';

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const trackView = async () => {
      try {
        const views = await recordPageViewLocalFirst(slug);
        const viewDisplay = document.getElementById('view-count-display');
        if (viewDisplay && views) {
          const span = viewDisplay.querySelector('span');
          if (span) {
            span.textContent = `${views} local views`;
          }
        }
      } catch (err) {
        console.warn('View tracking failure:', err);
      }
    };
    
    // Defer a bit so it doesn't block critical page load cycles
    const delay = setTimeout(trackView, 1200);
    return () => clearTimeout(delay);
  }, [slug]);

  return null;
}
