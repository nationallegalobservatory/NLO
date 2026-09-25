'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, ArrowRight, ArrowUpRight, CheckCircle2, ShieldAlert, Mail, Check, Loader2 } from 'lucide-react';
import type { ArticleData } from '../lib/markdown';
import Avatar from './Avatar';
import AuthorLink from './AuthorLink';

interface DynamicReleaseCountdownProps {
  article: ArticleData;
  targetDate?: string; // ISO string e.g. "2026-09-26T18:00:00+05:30"
  demoDurationSeconds?: number;
}

export default function DynamicReleaseCountdown({
  article,
  targetDate,
  demoDurationSeconds = 0,
}: DynamicReleaseCountdownProps) {
  const effectiveTargetDate = targetDate || article.publishAt || '2026-09-26T18:00:00+05:30';
  const targetTime = new Date(effectiveTargetDate).getTime();
  const [mounted, setMounted] = useState(false);
  
  // Calculate initial time left synchronously so SSR renders the countdown mode directly
  const [isLive, setIsLive] = useState(() => {
    return Date.now() >= targetTime;
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const distance = Math.max(0, targetTime - Date.now());
    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
      totalSeconds: Math.floor(distance / 1000),
    };
  });
  const href = `/publications/research/${article.slug}`;

  // Early access newsletter registration states
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleRegisterNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setRegisterStatus('error');
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    setRegisterStatus('loading');
    setStatusMessage('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRegisterStatus('success');
        setStatusMessage('Registered! You are now subscribed to the NLO newsletter dispatch.');
        setEmailInput('');
      } else {
        setRegisterStatus('error');
        setStatusMessage(data.message || 'Unable to register at this moment. Please try again.');
      }
    } catch {
      setRegisterStatus('error');
      setStatusMessage('Network error. Please try again.');
    }
  };

  // Extract issue/volume display if available
  const issueMatch = article.title.match(/Issue\s*(\d+)/i);
  const issueNumber = issueMatch ? issueMatch[1] : '4';
  const volMatch = article.title.match(/Vol\.?\s*(\d+)/i);
  const volNumber = volMatch ? volMatch[1] : '1';

  // Format month and year from publishAt or date
  const targetObj = new Date(effectiveTargetDate);
  const formattedTargetDate = !isNaN(targetObj.getTime())
    ? targetObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '26 September 2026';
  const formattedMonthYear = !isNaN(targetObj.getTime())
    ? targetObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'September 2026';

  useEffect(() => {
    setMounted(true);
    let target: number;

    if (demoDurationSeconds > 0) {
      target = Date.now() + demoDurationSeconds * 1000;
    } else {
      target = new Date(effectiveTargetDate).getTime();
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance <= 0) {
        setIsLive(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
      } else {
        setIsLive(false);
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          totalSeconds: Math.max(0, Math.floor(distance / 1000)),
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [effectiveTargetDate, demoDurationSeconds]);

  return (
    <section id="monthly-review" className="space-y-6 scroll-mt-24">
      {/* Header bar with Live/Upcoming indicator */}
      <div className="flex items-end justify-between gap-4 border-b border-outline-variant/50 pb-3 dark:border-primary/20">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLive ? 'bg-emerald-500 animate-ping' : 'bg-oxblood dark:bg-primary animate-pulse'
              }`}
            />
            <p className="font-technical-ui text-xs font-bold uppercase tracking-[0.28em] text-oxblood dark:text-primary">
              {isLive
                ? `Live Dispatch · ${formattedMonthYear}`
                : `Upcoming Release · ${formattedTargetDate}, 6:00 PM IST`}
            </p>
          </div>
          <h2 className="font-serif text-2xl font-bold text-on-background dark:text-on-background sm:text-3xl lg:text-4xl">
            Monthly Legal Review
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/publications?type=research"
            className="inline-flex items-center gap-2 font-technical-ui text-xs font-bold uppercase tracking-[0.18em] text-oxblood transition hover:text-on-background dark:text-primary dark:hover:text-on-background"
          >
            All Reviews
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="relative overflow-hidden rounded-xl border border-oxblood/30 bg-surface-container-lowest p-6 shadow-sm dark:border-primary/25 dark:bg-surface-container sm:p-10">
        <AnimatePresence mode="wait">
          {!isLive ? (
            /* ─────────────────────────────────────────────────────────────
               SEALED EMBARGOED COUNTDOWN MODE (Runs till 26 Sept 2026, 6:00 PM IST)
               ───────────────────────────────────────────────────────────── */
            <motion.div
              key="countdown-mode"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: 40,
                clipPath: 'inset(100% 0 0 0)',
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
              }}
              className="flex flex-col items-center justify-center text-center space-y-8 py-4 sm:py-8"
            >
              {/* Embargo Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-oxblood/30 bg-oxblood/5 px-4 py-1.5 font-technical-ui text-xs font-bold uppercase tracking-[0.24em] text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
                <Lock className="h-3.5 w-3.5" />
                <span>Editorial Embargo · Release 26 September 2026 at 6:00 PM IST</span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3 max-w-2xl">
                <h3 className="font-serif text-3xl font-bold leading-tight text-on-background sm:text-4xl lg:text-5xl">
                  Monthly Legal Review — Vol. {volNumber} | Issue {issueNumber}
                </h3>
                <p className="font-body-md text-sm leading-relaxed text-on-surface-variant dark:text-on-background/75 sm:text-base">
                  Primary-source analysis, constitutional dispatches, and legislative tracker under active editorial embargo. Contents will unlock automatically at 6:00 PM IST without requiring a page refresh.
                </p>
              </div>

              {/* Real-Time Countdown Numbers */}
              <div className="w-full max-w-xl rounded-xl border border-oxblood/20 bg-surface-container/60 p-6 sm:p-8 dark:border-primary/20 dark:bg-surface-container-low/80 shadow-xs">
                <p className="font-technical-ui text-[11px] font-bold uppercase tracking-[0.28em] text-oxblood dark:text-primary mb-6">
                  Unlocking In
                </p>

                <div className="grid grid-cols-4 gap-3 sm:gap-6 text-center">
                  {/* Days */}
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 dark:bg-surface-container dark:border-primary/20">
                    <span className="font-technical-ui text-3xl sm:text-5xl font-extrabold text-oxblood dark:text-primary">
                      {timeLeft.days.toString().padStart(2, '0')}
                    </span>
                    <span className="font-technical-ui text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mt-2">
                      Days
                    </span>
                  </div>

                  {/* Hours */}
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 dark:bg-surface-container dark:border-primary/20">
                    <span className="font-technical-ui text-3xl sm:text-5xl font-extrabold text-oxblood dark:text-primary">
                      {timeLeft.hours.toString().padStart(2, '0')}
                    </span>
                    <span className="font-technical-ui text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mt-2">
                      Hours
                    </span>
                  </div>

                  {/* Minutes */}
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 dark:bg-surface-container dark:border-primary/20">
                    <span className="font-technical-ui text-3xl sm:text-5xl font-extrabold text-oxblood dark:text-primary">
                      {timeLeft.minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="font-technical-ui text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mt-2">
                      Mins
                    </span>
                  </div>

                  {/* Seconds */}
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 dark:bg-surface-container dark:border-primary/20">
                    <span className="font-technical-ui text-3xl sm:text-5xl font-extrabold text-oxblood dark:text-primary animate-pulse">
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </span>
                    <span className="font-technical-ui text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mt-2">
                      Secs
                    </span>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    REGISTER FOR EARLY ACCESS SPOT
                    Allows readers to click and submit email for newsletter updates
                    ───────────────────────────────────────────────────────────── */}
                <div className="mt-6 pt-5 border-t border-outline-variant/30 dark:border-primary/15">
                  {!showRegisterForm ? (
                    <button
                      type="button"
                      onClick={() => setShowRegisterForm(true)}
                      className="inline-flex items-center gap-2 rounded-md border border-oxblood/40 bg-oxblood/10 px-4 py-2 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-oxblood transition hover:bg-oxblood hover:text-white dark:border-primary/40 dark:bg-primary/15 dark:text-primary dark:hover:bg-primary dark:hover:text-background cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Register for Early Access
                    </button>
                  ) : (
                    <form onSubmit={handleRegisterNewsletter} className="w-full max-w-md mx-auto space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Enter email for newsletter..."
                            disabled={registerStatus === 'loading' || registerStatus === 'success'}
                            className="w-full rounded-md border border-outline-variant/60 bg-surface-container-lowest px-3.5 py-2 font-technical-ui text-xs text-on-background placeholder:text-on-surface-variant/60 focus:border-oxblood focus:outline-hidden dark:border-primary/30 dark:bg-surface-container dark:text-on-background dark:focus:border-primary"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={registerStatus === 'loading' || registerStatus === 'success'}
                          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-oxblood px-4 py-2 font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-on-background disabled:opacity-50 dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed cursor-pointer"
                        >
                          {registerStatus === 'loading' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : registerStatus === 'success' ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            'Subscribe'
                          )}
                        </button>
                      </div>

                      {statusMessage && (
                        <p
                          className={`font-technical-ui text-[11px] leading-tight ${
                            registerStatus === 'success'
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {statusMessage}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              </div>

              {/* Status footer */}
              <div className="flex items-center gap-2 font-technical-ui text-[11px] font-semibold tracking-wider text-on-surface-variant dark:text-on-background/60">
                <ShieldAlert className="h-4 w-4 text-oxblood dark:text-primary" />
                <span>Live synchronizer active · Auto-unveils 26 September 2026 at 6:00 PM IST without refresh</span>
              </div>
            </motion.div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               LIVE UNLOCKED MODE (Dynamically wipes down and reveals without reload)
               ───────────────────────────────────────────────────────────── */
            <motion.div
              key="live-mode"
              initial={{ opacity: 0, y: -30, clipPath: 'inset(0 0 100% 0)' }}
              animate={{
                opacity: 1,
                y: 0,
                clipPath: 'inset(0 0 0% 0)',
                transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
              }}
              className="space-y-6"
            >
              <div className="grid gap-8 lg:grid-cols-12 items-start">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-700 px-2.5 py-0.5 font-technical-ui text-[10px] font-bold uppercase tracking-[0.18em] text-white dark:bg-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Live Issue
                    </span>
                    <span className="rounded-sm bg-oxblood/10 px-2.5 py-0.5 font-technical-ui text-[10px] font-bold uppercase tracking-[0.18em] text-oxblood dark:bg-primary/15 dark:text-primary">
                      Vol. {volNumber} · Issue {issueNumber}
                    </span>
                    <span className="font-technical-ui text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant dark:text-on-background/50">
                      {formattedMonthYear}
                    </span>
                    <span className="flex items-center gap-1 font-technical-ui text-[11px] text-on-surface-variant dark:text-on-background/50 ml-auto sm:ml-0">
                      <Clock className="h-3.5 w-3.5 text-oxblood dark:text-primary" />
                      {article.readingTime}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl font-bold leading-snug text-on-background transition-colors hover:text-oxblood dark:text-on-background dark:hover:text-primary sm:text-3xl lg:text-4xl">
                    <Link href={href}>
                      {article.title}
                    </Link>
                  </h3>

                  <p className="font-body-md text-sm leading-relaxed text-on-surface-variant dark:text-on-background/75 sm:text-base">
                    {article.abstract ||
                      'The September 2026 Monthly Legal Review from the National Legal Observatory covers the Supreme Court’s landmark proportionality ruling in Balaji Formalin (2026 INSC 1009), POCSO presumption, and seven-judge cess reference.'}
                  </p>

                  {/* 4 Topic Highlights */}
                  <div className="grid gap-2.5 sm:grid-cols-2 pt-2 text-xs font-serif text-on-surface-variant dark:text-on-background/70 border-t border-outline-variant/30 pt-3 dark:border-primary/15">
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">01</span>
                      <span><strong>Judgment of the Month:</strong> Balaji Formalin (2026 INSC 1009)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">02</span>
                      <span><strong>Constitutional Watch:</strong> POCSO Presumption &amp; Cess Reference</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">03</span>
                      <span><strong>Legislative Tracker:</strong> Supreme Court Strength at 38</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">05</span>
                      <span><strong>Editor&apos;s Note:</strong> Proportionality&apos;s Quiet Takeover</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-between h-full space-y-6 lg:border-l lg:border-outline-variant/30 lg:pl-8 dark:lg:border-primary/15">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={article.authorDetails?.avatar}
                      alt={article.authorDetails?.name || 'Bhoomija Khanna'}
                      authorSlug={article.author}
                      className="h-11 w-11 rounded-full border border-outline-variant object-cover grayscale dark:border-primary/25"
                    />
                    <div>
                      <AuthorLink
                        slug={article.author}
                        className="font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-on-background hover:text-oxblood dark:text-on-background dark:hover:text-primary transition-colors block"
                      >
                        {article.authorDetails?.name || 'Bhoomija Khanna'}
                      </AuthorLink>
                      <p className="font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant dark:text-on-background/50">
                        Research Director
                      </p>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <Link
                      href={href}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-oxblood bg-oxblood px-6 py-3.5 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed shadow-xs"
                    >
                      Read Full Issue {issueNumber}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
