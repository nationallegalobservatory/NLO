'use client';

import { useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ExtendedDocument extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface ExtendedHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export default function FullscreenController() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const checkFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as ExtendedDocument;
    return Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }, []);

  const requestFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const elem = document.documentElement as ExtendedHTMLElement;

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch {
      // Browser user-gesture restrictions may silently reject auto-fullscreen
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const doc = document as ExtendedDocument;

    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
  }, []);

  const toggleFullscreen = async () => {
    if (checkFullscreen()) {
      await exitFullscreen();
    } else {
      await requestFullscreen();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Check capability
    const elem = document.documentElement as ExtendedHTMLElement;
    const supported = Boolean(
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullscreen
    );
    setIsSupported(supported);

    const onFullscreenChange = () => {
      setIsFullscreen(checkFullscreen());
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    // Initial check
    setIsFullscreen(checkFullscreen());

    // Auto-enter fullscreen attempt on initial page load / first user touch or click
    // Modern browsers require a user gesture (first tap, touch, or click) to enter fullscreen
    const attemptInitialFullscreen = async () => {
      if (!checkFullscreen()) {
        await requestFullscreen();
      }
      // Clean up after first interaction attempts
      window.removeEventListener('click', attemptInitialFullscreen);
      window.removeEventListener('touchstart', attemptInitialFullscreen);
      window.removeEventListener('keydown', attemptInitialFullscreen);
    };

    // Try immediately (in case browser allows or in PWA mode)
    void requestFullscreen();

    // Also attach to the very first user interaction anywhere on screen
    window.addEventListener('click', attemptInitialFullscreen, { once: true, passive: true });
    window.addEventListener('touchstart', attemptInitialFullscreen, { once: true, passive: true });
    window.addEventListener('keydown', attemptInitialFullscreen, { once: true, passive: true });

    // Explicitly handle Esc key to exit fullscreen across all browsers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (checkFullscreen()) {
          void exitFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
      window.removeEventListener('click', attemptInitialFullscreen);
      window.removeEventListener('touchstart', attemptInitialFullscreen);
      window.removeEventListener('keydown', attemptInitialFullscreen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [checkFullscreen, requestFullscreen, exitFullscreen]);

  if (!isSupported) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-40 print:hidden transition-transform duration-300 hover:scale-105 active:scale-95"
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'}
        className="group flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-outline-variant/80 bg-surface-container-lowest/90 text-on-background shadow-xl backdrop-blur-md transition-all hover:border-oxblood hover:bg-oxblood hover:text-white dark:border-primary/40 dark:bg-surface-container/90 dark:text-on-background dark:hover:border-primary dark:hover:bg-primary dark:hover:text-background focus:outline-none focus:ring-2 focus:ring-oxblood dark:focus:ring-primary"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
        ) : (
          <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
        )}
      </button>
    </div>
  );
}
