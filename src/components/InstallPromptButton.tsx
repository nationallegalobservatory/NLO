'use client';

import { useEffect, useState, useRef } from 'react';
import { Download, Smartphone, Apple, Share, PlusSquare, MoreVertical, X, Check, Laptop, Mail, Bell, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeNewsletterLocalFirst } from '@/lib/api/offlineActions';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

type OS = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other';
type BrowserName = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';

interface ClientEnvironment {
  os: OS;
  osLabel: string;
  browser: BrowserName;
  browserLabel: string;
  summary: string;
}

function detectEnvironment(): ClientEnvironment {
  if (typeof window === 'undefined' || !window.navigator) {
    return {
      os: 'other',
      osLabel: 'Device',
      browser: 'other',
      browserLabel: 'Browser',
      summary: 'Your Browser',
    };
  }

  const ua = window.navigator.userAgent || '';
  const vendor = window.navigator.vendor || '';

  // 1. Detect OS
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let os: OS = 'other';
  let osLabel = 'Device';
  if (isIOS) {
    os = 'ios';
    osLabel = 'Apple iOS';
  } else if (isAndroid) {
    os = 'android';
    osLabel = 'Android';
  } else if (isMac) {
    os = 'macos';
    osLabel = 'macOS';
  } else if (isWindows) {
    os = 'windows';
    osLabel = 'Windows';
  } else if (isLinux) {
    os = 'linux';
    osLabel = 'Linux';
  }

  // 2. Detect Browser
  let browser: BrowserName = 'other';
  let browserLabel = 'Browser';

  if (/SamsungBrowser/i.test(ua)) {
    browser = 'samsung';
    browserLabel = 'Samsung Internet';
  } else if (/Edg([A-Z]|iOS)?\//i.test(ua)) {
    browser = 'edge';
    browserLabel = 'Microsoft Edge';
  } else if (/FxiOS|Firefox/i.test(ua)) {
    browser = 'firefox';
    browserLabel = 'Mozilla Firefox';
  } else if (/CriOS|Chrome/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua)) {
    browser = 'chrome';
    browserLabel = 'Google Chrome';
  } else if (
    (/Safari/i.test(ua) && /Apple Computer/i.test(vendor)) ||
    (isIOS && !/CriOS|FxiOS|EdgiOS/i.test(ua))
  ) {
    browser = 'safari';
    browserLabel = 'Apple Safari';
  }

  return {
    os,
    osLabel,
    browser,
    browserLabel,
    summary: `${browserLabel} on ${osLabel}`,
  };
}

type TabKey = 'ios-safari' | 'ios-chrome' | 'android-chrome' | 'samsung-browser' | 'desktop-safari' | 'desktop-chrome';

function getRecommendedTab(env: ClientEnvironment): TabKey {
  if (env.os === 'ios') {
    return env.browser === 'chrome' ? 'ios-chrome' : 'ios-safari';
  }
  if (env.os === 'android') {
    return env.browser === 'samsung' ? 'samsung-browser' : 'android-chrome';
  }
  if (env.os === 'macos' && env.browser === 'safari') {
    return 'desktop-safari';
  }
  return 'desktop-chrome';
}

export default function InstallPromptButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => isStandaloneDisplay());
  const [showModal, setShowModal] = useState(false);
  const [env, setEnv] = useState<ClientEnvironment>({
    os: 'other',
    osLabel: 'Device',
    browser: 'other',
    browserLabel: 'Browser',
    summary: 'Your Browser',
  });
  const [selectedTab, setSelectedTab] = useState<TabKey>('ios-safari');

  // Desktop/Tablet corner hover & dwell states for ALL 4 corners
  type CornerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [activeCorner, setActiveCorner] = useState<CornerPosition>('bottom-right');
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleCornerMouseEnter = (corner: CornerPosition) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    // Dwell for 300ms in ANY of the 4 corner zones to trigger popup from that specific corner
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setActiveCorner(corner);
      setIsRevealed(true);
      hoverTimerRef.current = null;
    }, 300);
  };

  const handleCornerMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Auto-tuck after leaving the corner zone
    if (!isHovered) {
      hideTimerRef.current = setTimeout(() => {
        setIsRevealed(false);
      }, 1200);
    }
  };

  useEffect(() => {
    const detected = detectEnvironment();
    setEnv(detected);
    setSelectedTab(getRecommendedTab(detected));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setStandalone(true);
      setPromptEvent(null);
      setShowModal(false);
    };

    const handleOpenInstallModal = () => {
      setShowModal(true);
    };

    const handleOpenNewsletterModal = () => {
      setShowMobileBottomPopup(true);
      setMobileDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('nlo:open-install-modal', handleOpenInstallModal);
    window.addEventListener('nlo:open-newsletter-modal', handleOpenNewsletterModal);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('nlo:open-install-modal', handleOpenInstallModal);
      window.removeEventListener('nlo:open-newsletter-modal', handleOpenNewsletterModal);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isHovered]);

  if (standalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setPromptEvent(null);
          return;
        }
      } catch (err) {
        console.error('Error invoking native install prompt:', err);
      }
    }
    // If native prompt not directly supported (e.g. iOS Safari, Firefox, or already dismissed), open comprehensive instructions
    setShowModal(true);
  };

  // Mobile Bottom Scroll Pop-up States
  const [showMobileBottomPopup, setShowMobileBottomPopup] = useState(false);
  const [mobileDismissed, setMobileDismissed] = useState(false);
  const [mobileEmail, setMobileEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  // Exit Intent / Tab Close Detection:
  // 1. Detect mouse moving towards browser chrome / tab bar to close the tab (desktop)
  // 2. Add beforeunload listener to give browser prompt if user attempts hard tab exit
  useEffect(() => {
    if (standalone) return;

    let hasShownExitIntent = false;

    const handleMouseLeave = (e: MouseEvent) => {
      // If mouse leaves through top edge (towards tab close buttons / URL bar)
      if (e.clientY <= 10 && !hasShownExitIntent && !mobileDismissed) {
        hasShownExitIntent = true;
        setShowMobileBottomPopup(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Trigger the prompt on tab exit if not dismissed
      if (!hasShownExitIntent && !mobileDismissed) {
        setShowMobileBottomPopup(true);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [mobileDismissed, standalone]);

  // Detect scroll to bottom on mobile devices
  useEffect(() => {
    if (isLargeScreen || mobileDismissed || standalone) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const fullHeight = document.documentElement.scrollHeight;
        
        // Check if user reached near bottom (within 150px) or reached the footer
        const isNearBottom = scrollTop + windowHeight >= fullHeight - 150;
        const footerElem = document.getElementById('site-footer');
        let isFooterInView = false;
        if (footerElem) {
          const rect = footerElem.getBoundingClientRect();
          isFooterInView = rect.top <= windowHeight;
        }

        if ((isNearBottom || isFooterInView) && !mobileDismissed) {
          setShowMobileBottomPopup(true);
        }
        ticking = false;
      });
      ticking = true;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLargeScreen, mobileDismissed, standalone]);

  // Freeze background scrolling when any pop-up is active
  useEffect(() => {
    if (showMobileBottomPopup || showModal) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [showMobileBottomPopup, showModal]);

  const handleMobileNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileEmail || !mobileEmail.includes('@')) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter a valid email.');
      return;
    }
    setNewsletterStatus('loading');
    try {
      const res = await subscribeNewsletterLocalFirst(mobileEmail);
      if (res.success) {
        setNewsletterStatus('success');
        setNewsletterMessage('Subscribed successfully!');
        setMobileEmail('');
      } else {
        setNewsletterStatus('error');
        setNewsletterMessage(res.message || 'Subscription failed.');
      }
    } catch {
      setNewsletterStatus('error');
      setNewsletterMessage('Error saving subscription.');
    }
  };

  const closeMobilePopup = () => {
    setShowMobileBottomPopup(false);
    setMobileDismissed(true);
  };

  return (
    <>
      {/* ─── DESKTOP & LAPTOP: 4-Corner Dwell Hotspots & Floating Pop-up ─── */}
      {isLargeScreen && (
        <>
          {/* Corner 1: Bottom-Right Hotspot */}
          <div
            onMouseEnter={() => handleCornerMouseEnter('bottom-right')}
            onMouseLeave={handleCornerMouseLeave}
            className="fixed bottom-0 right-0 z-40 h-20 w-24 pointer-events-auto"
            title="Hover to reveal WebApp installation"
          />

          {/* Corner 2: Bottom-Left Hotspot */}
          <div
            onMouseEnter={() => handleCornerMouseEnter('bottom-left')}
            onMouseLeave={handleCornerMouseLeave}
            className="fixed bottom-0 left-0 z-40 h-20 w-24 pointer-events-auto"
            title="Hover to reveal WebApp installation"
          />

          {/* Corner 3: Top-Right Hotspot */}
          <div
            onMouseEnter={() => handleCornerMouseEnter('top-right')}
            onMouseLeave={handleCornerMouseLeave}
            className="fixed top-0 right-0 z-40 h-20 w-24 pointer-events-auto"
            title="Hover to reveal WebApp installation"
          />

          {/* Corner 4: Top-Left Hotspot */}
          <div
            onMouseEnter={() => handleCornerMouseEnter('top-left')}
            onMouseLeave={handleCornerMouseLeave}
            className="fixed top-0 left-0 z-40 h-20 w-24 pointer-events-auto"
            title="Hover to reveal WebApp installation"
          />

          {/* The Install Button - Pops up dynamically at whichever of the 4 corners was hovered */}
          <div
            onMouseEnter={() => {
              setIsHovered(true);
              setIsRevealed(true);
              if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            }}
            onMouseLeave={() => {
              setIsHovered(false);
              hideTimerRef.current = setTimeout(() => {
                setIsRevealed(false);
              }, 1200);
            }}
            className={`fixed z-40 p-4 transition-all duration-300 ease-out ${
              activeCorner === 'bottom-right'
                ? 'bottom-0 right-0 origin-bottom-right'
                : activeCorner === 'bottom-left'
                ? 'bottom-0 left-0 origin-bottom-left'
                : activeCorner === 'top-right'
                ? 'top-0 right-0 origin-top-right'
                : 'top-0 left-0 origin-top-left'
            } ${
              isRevealed
                ? 'translate-y-0 translate-x-0 opacity-100 scale-100 pointer-events-auto'
                : activeCorner.startsWith('bottom')
                ? 'translate-y-8 opacity-0 scale-95 pointer-events-none'
                : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              title="Install Offline WebApp"
              onClick={() => void handleInstallClick()}
              className="h-9 px-3.5 gap-2 shadow-2xl border border-outline-variant/80 bg-surface-container-lowest/95 backdrop-blur font-technical-ui text-[11px] font-bold uppercase tracking-[0.16em] text-on-background hover:border-oxblood hover:text-oxblood dark:border-primary/30 dark:bg-surface-container/95 dark:text-on-background dark:hover:border-primary dark:hover:text-primary transition-all rounded-xs"
            >
              <Download className="h-4 w-4 text-oxblood dark:text-primary" />
              <span>Install Offline WebApp</span>
            </Button>
          </div>
        </>
      )}

      {/* ─── NEWSLETTER / BOTTOM MODAL with Scroll Freeze & Dual Actions ─── */}
      {showMobileBottomPopup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div className="relative w-full max-w-md border-t sm:border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-2xl dark:border-primary/30 dark:bg-surface-container rounded-t-xl sm:rounded-xs overflow-hidden max-h-[92vh] overflow-y-auto">
            
            {/* Highly Prominent Close Button */}
            <button
              type="button"
              onClick={closeMobilePopup}
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/70 bg-surface-container-low text-on-background hover:bg-oxblood hover:text-white dark:border-primary/30 dark:bg-surface-container-high dark:text-on-background dark:hover:bg-primary dark:hover:text-background shadow-md transition-colors"
              aria-label="Close pop-up"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>

            {/* Header / Brand Badge */}
            <div className="pr-10">
              <span className="font-technical-ui text-[10px] font-bold uppercase tracking-[0.22em] text-oxblood dark:text-primary">
                National Legal Observatory
              </span>
              <h2 className="mt-1 font-serif 2xl font-bold text-on-background dark:text-on-background">
                Before You Go — Stay Connected &amp; Read Offline
              </h2>
              <p className="mt-1 font-body-md text-xs leading-relaxed text-on-surface-variant dark:text-on-background/70">
                Subscribe to receive upcoming embargo dispatches or install our offline PWA to read without WiFi:
              </p>
            </div>

            {/* Dual Options Grid */}
            <div className="mt-6 space-y-4">
              
              {/* Option 1: Subscribe to Newsletter */}
              <div className="border border-outline-variant/50 bg-surface-container-low p-4 dark:border-primary/20 dark:bg-surface-container-high rounded-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-oxblood/10 text-oxblood dark:bg-primary/10 dark:text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-on-background dark:text-on-background">
                      1. Subscribe to Newsletter
                    </h3>
                    <p className="font-technical-ui text-[10px] text-on-surface-variant dark:text-on-background/60">
                      Bi-weekly dispatches &amp; early access embargo links
                    </p>
                  </div>
                </div>

                <form onSubmit={handleMobileNewsletterSubmit} className="mt-3 space-y-2">
                  <div className="flex rounded-xs border border-outline-variant/70 dark:border-primary/25 overflow-hidden bg-surface-container-lowest">
                    <input
                      type="email"
                      value={mobileEmail}
                      onChange={(e) => setMobileEmail(e.target.value)}
                      placeholder="name@university.edu"
                      disabled={newsletterStatus === 'loading'}
                      className="w-full px-3 py-2 text-xs font-technical-ui text-on-background placeholder:text-on-surface-variant/50 focus:outline-none bg-transparent"
                      required
                    />
                    <button
                      type="submit"
                      disabled={newsletterStatus === 'loading'}
                      className="bg-oxblood px-3.5 py-2 text-xs font-technical-ui font-bold uppercase tracking-wider text-white hover:bg-on-background dark:bg-primary dark:text-background dark:hover:bg-primary/90 transition-colors flex items-center shrink-0"
                    >
                      {newsletterStatus === 'loading' ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {newsletterStatus === 'success' && (
                    <p className="text-[11px] font-technical-ui font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ {newsletterMessage}
                    </p>
                  )}
                  {newsletterStatus === 'error' && (
                    <p className="text-[11px] font-technical-ui font-semibold text-rose-600 dark:text-rose-400">
                      {newsletterMessage}
                    </p>
                  )}
                </form>
              </div>

              {/* Option 2: Install PWA WebApp */}
              <div className="border border-outline-variant/50 bg-surface-container-low p-4 dark:border-primary/20 dark:bg-surface-container-high rounded-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-oxblood/10 text-oxblood dark:bg-primary/10 dark:text-primary">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-on-background dark:text-on-background">
                      2. Install Offline WebApp
                    </h3>
                    <p className="font-technical-ui text-[10px] text-on-surface-variant dark:text-on-background/60">
                      Read without WiFi, launch like a native mobile app
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      closeMobilePopup();
                      void handleInstallClick();
                    }}
                    className="w-full h-10 gap-2 border border-oxblood bg-oxblood text-white font-technical-ui text-xs font-bold uppercase tracking-[0.14em] hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-primary/90 transition-all rounded-xs shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install PWA WebApp</span>
                  </Button>
                </div>
              </div>

            </div>

            {/* Bottom Dismiss Option */}
            <div className="mt-4 pt-3 border-t border-outline-variant/30 text-center">
              <button
                type="button"
                onClick={closeMobilePopup}
                className="font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant/70 hover:text-on-background dark:text-on-background/60 dark:hover:text-primary"
              >
                Continue Browsing
              </button>
            </div>

          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl dark:border-primary/25 dark:bg-surface-container rounded-xs max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-4 dark:border-primary/20">
              <div>
                <span className="font-technical-ui text-[10px] font-bold uppercase tracking-[0.24em] text-oxblood dark:text-primary">
                  Progressive Web Application
                </span>
                <h2 className="mt-1 font-serif text-2xl font-bold text-on-background dark:text-on-background">
                  Install NLO Offline WebApp
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant dark:text-on-background/70 font-sans">
                  Access primary constitutional research, legal dispatches, and archives completely offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-on-surface-variant hover:text-on-background dark:text-on-background/60 dark:hover:text-on-background"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* If direct native trigger is available on this browser */}
            {promptEvent && (
              <div className="my-4 p-3 bg-surface-container-low border border-oxblood/20 dark:border-primary/25 rounded-xs flex items-center justify-between gap-3">
                <span className="font-technical-ui text-xs text-on-background font-semibold">
                  1-Click Direct Installation Ready
                </span>
                <Button
                  size="sm"
                  onClick={async () => {
                    await promptEvent.prompt();
                    await promptEvent.userChoice;
                    setPromptEvent(null);
                    setShowModal(false);
                  }}
                  className="bg-oxblood text-white dark:bg-primary dark:text-background h-8 text-[11px]"
                >
                  Install Now
                </Button>
              </div>
            )}

            {/* Detected Browser & OS Banner */}
            <div className="mt-4 p-3 bg-surface-container-low border border-outline-variant/50 dark:border-primary/20 rounded-xs flex items-center justify-between gap-3">
              <div>
                <span className="block font-technical-ui text-[10px] uppercase tracking-[0.16em] text-on-surface-variant dark:text-on-background/60">
                  Detected Browser &amp; OS
                </span>
                <span className="font-serif text-sm font-semibold text-on-background dark:text-on-background">
                  {env.summary}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSelectedTab(getRecommendedTab(env))}
                className="h-7 text-[10px] font-technical-ui uppercase tracking-wider border-oxblood/40 text-oxblood hover:bg-oxblood hover:text-white dark:border-primary/40 dark:text-primary dark:hover:bg-primary dark:hover:text-background"
              >
                View My Steps
              </Button>
            </div>

            {/* Device tabs */}
            <div className="mt-5">
              <p className="font-technical-ui text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant dark:text-on-background/50 mb-2.5">
                Browser-Specific Installation Guides
              </p>
              <div className="flex flex-wrap gap-1.5 border-b border-outline-variant/30 pb-3 dark:border-primary/15">
                <button
                  type="button"
                  onClick={() => setSelectedTab('ios-safari')}
                  className={`px-2.5 py-1.5 font-technical-ui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] rounded-xs border transition-all ${
                    selectedTab === 'ios-safari'
                      ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70'
                  }`}
                >
                  iOS Safari {getRecommendedTab(env) === 'ios-safari' ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('ios-chrome')}
                  className={`px-2.5 py-1.5 font-technical-ui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] rounded-xs border transition-all ${
                    selectedTab === 'ios-chrome'
                      ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70'
                  }`}
                >
                  iOS Chrome {getRecommendedTab(env) === 'ios-chrome' ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('android-chrome')}
                  className={`px-2.5 py-1.5 font-technical-ui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] rounded-xs border transition-all ${
                    selectedTab === 'android-chrome'
                      ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70'
                  }`}
                >
                  Android Chrome {getRecommendedTab(env) === 'android-chrome' ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('samsung-browser')}
                  className={`px-2.5 py-1.5 font-technical-ui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] rounded-xs border transition-all ${
                    selectedTab === 'samsung-browser'
                      ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70'
                  }`}
                >
                  Samsung Internet {getRecommendedTab(env) === 'samsung-browser' ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('desktop-safari')}
                  className={`px-2.5 py-1.5 font-technical-ui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] rounded-xs border transition-all ${
                    selectedTab === 'desktop-safari'
                      ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70'
                  }`}
                >
                  Mac Safari {getRecommendedTab(env) === 'desktop-safari' ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('desktop-chrome')}
                  className={`px-2.5 py-1.5 font-technical-ui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] rounded-xs border transition-all ${
                    selectedTab === 'desktop-chrome'
                      ? 'border-oxblood bg-oxblood text-white dark:border-primary dark:bg-primary dark:text-background'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant dark:border-primary/20 dark:bg-surface-container-low dark:text-on-background/70'
                  }`}
                >
                  Desktop Chrome / Edge {getRecommendedTab(env) === 'desktop-chrome' ? '✓' : ''}
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="mt-5 space-y-4 font-sans text-sm text-on-surface-variant dark:text-on-background/80">
              {/* iOS Safari */}
              {selectedTab === 'ios-safari' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-technical-ui text-xs font-bold text-on-background dark:text-on-background uppercase tracking-wider">
                    <Apple className="h-4 w-4 text-oxblood dark:text-primary" />
                    Apple iPhone / iPad (Safari Browser)
                  </div>
                  <ol className="space-y-2.5 text-xs sm:text-sm pl-4 list-decimal">
                    <li>
                      Open this website in <strong>Safari</strong> on your iPhone or iPad.
                    </li>
                    <li className="flex items-start gap-2">
                      <span>Tap the <strong>Share</strong> button (the square with an arrow pointing up <Share className="inline h-3.5 w-3.5 mx-1" />) located in the Safari toolbar at the bottom of the screen (or top toolbar on iPad).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>Scroll down the action sheet and select <strong>Add to Home Screen</strong> (<PlusSquare className="inline h-3.5 w-3.5 mx-1" />).</span>
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner. The NLO Observatory app icon will appear directly on your Home Screen and run full-screen without Safari browser address bars.
                    </li>
                  </ol>
                </div>
              )}

              {/* iOS Chrome */}
              {selectedTab === 'ios-chrome' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-technical-ui text-xs font-bold text-on-background dark:text-on-background uppercase tracking-wider">
                    <Smartphone className="h-4 w-4 text-oxblood dark:text-primary" />
                    Google Chrome on iPhone / iPad (iOS 16.4+)
                  </div>
                  <ol className="space-y-2.5 text-xs sm:text-sm pl-4 list-decimal">
                    <li className="flex items-start gap-2">
                      <span>In Chrome on iOS, tap the <strong>Share</strong> button (<Share className="inline h-3.5 w-3.5 mx-1" />) in the address bar (or tap the <strong>three dots menu</strong> <MoreVertical className="inline h-3.5 w-3.5 mx-1" /> at the bottom right).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>Scroll through the sharing options and tap <strong>Add to Home Screen</strong> (<PlusSquare className="inline h-3.5 w-3.5 mx-1" />).</span>
                    </li>
                    <li>
                      Tap <strong>Add</strong> to place the NLO standalone icon on your device home screen.
                    </li>
                    <li className="text-[11px] text-on-surface-variant/80 dark:text-on-background/60 italic">
                      Note: On older iOS versions where Chrome does not support native PWA installation, switch to <strong>Safari</strong> and tap <em>Share &rarr; Add to Home Screen</em>.
                    </li>
                  </ol>
                </div>
              )}

              {/* Android Chrome */}
              {selectedTab === 'android-chrome' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-technical-ui text-xs font-bold text-on-background dark:text-on-background uppercase tracking-wider">
                    <Smartphone className="h-4 w-4 text-oxblood dark:text-primary" />
                    Android (Chrome / Chromium Browsers)
                  </div>
                  <ol className="space-y-2.5 text-xs sm:text-sm pl-4 list-decimal">
                    <li className="flex items-start gap-2">
                      <span>Tap the <strong>three vertical dots menu</strong> (<MoreVertical className="inline h-3.5 w-3.5 mx-1" />) in the top-right corner of Chrome.</span>
                    </li>
                    <li>
                      Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                    </li>
                    <li>
                      Confirm by tapping <strong>Install</strong>. The app will be placed into your app drawer and home screen.
                    </li>
                  </ol>
                </div>
              )}

              {/* Samsung Galaxy */}
              {selectedTab === 'samsung-browser' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-technical-ui text-xs font-bold text-on-background dark:text-on-background uppercase tracking-wider">
                    <Smartphone className="h-4 w-4 text-oxblood dark:text-primary" />
                    Samsung Galaxy (Samsung Internet Browser)
                  </div>
                  <ol className="space-y-2.5 text-xs sm:text-sm pl-4 list-decimal">
                    <li>
                      Look for the <strong>down-arrow install badge</strong> in the Samsung Internet URL bar, or tap the <strong>hamburger menu (☰)</strong> in the bottom right corner.
                    </li>
                    <li>
                      Select <strong>Add page to &rarr; App screen</strong> (or <strong>Home screen</strong>).
                    </li>
                    <li>
                      Tap <strong>Install</strong> to add the standalone application.
                    </li>
                  </ol>
                </div>
              )}

              {/* macOS Safari */}
              {selectedTab === 'desktop-safari' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-technical-ui text-xs font-bold text-on-background dark:text-on-background uppercase tracking-wider">
                    <Apple className="h-4 w-4 text-oxblood dark:text-primary" />
                    macOS Safari (Mac Sonoma 14+)
                  </div>
                  <ol className="space-y-2.5 text-xs sm:text-sm pl-4 list-decimal">
                    <li>
                      In Safari on your Mac, click <strong>File</strong> in the top Apple system menu bar.
                    </li>
                    <li>
                      Select <strong>Add to Dock...</strong>
                    </li>
                    <li>
                      Confirm the name and click <strong>Add</strong>.
                    </li>
                    <li>
                      NLO will now appear in your Mac Dock and launch as an isolated macOS desktop app with offline data support.
                    </li>
                  </ol>
                </div>
              )}

              {/* Desktop Chrome / Edge */}
              {selectedTab === 'desktop-chrome' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-technical-ui text-xs font-bold text-on-background dark:text-on-background uppercase tracking-wider">
                    <Laptop className="h-4 w-4 text-oxblood dark:text-primary" />
                    Desktop: Chrome, Edge, Brave (macOS &amp; Windows)
                  </div>
                  <ol className="space-y-2.5 text-xs sm:text-sm pl-4 list-decimal">
                    <li className="flex items-start gap-2">
                      <span>Click the <strong>Install</strong> computer icon (<Download className="inline h-3.5 w-3.5 mx-1" />) located in the browser&apos;s address/URL bar.</span>
                    </li>
                    <li>
                      Alternatively, click the browser menu (<strong>⋮</strong> in Chrome, <strong>…</strong> in Edge) and choose <strong>Cast, save, and share &rarr; Install National Legal Observatory</strong> (or <em>Apps &rarr; Install this site as an app</em>).
                    </li>
                    <li>
                      Click <strong>Install</strong> to run National Legal Observatory as an independent desktop window with offline storage.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-between dark:border-primary/15">
              <span className="font-technical-ui text-[11px] text-on-surface-variant dark:text-on-background/50">
                PWA Engine v1.0 · Fast Cached Reading
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="font-technical-ui text-[11px] font-bold uppercase tracking-wider"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
