'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, Sparkles, ArrowRight, ArrowUpRight, Scale, ShieldCheck, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ArticleData } from '../lib/markdown';
import Avatar from './Avatar';
import AuthorLink from './AuthorLink';

interface DynamicReleaseCountdownProps {
  article: ArticleData;
  targetDate?: string; // ISO string e.g. "2026-08-27T00:00:00+05:30" or "5s-demo"
  demoDurationSeconds?: number;
}

export default function DynamicReleaseCountdown({
  article,
  targetDate = '2026-08-27T18:30:00+05:30',
  demoDurationSeconds = 0,
}: DynamicReleaseCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });

  const href = `/publications/research/${article.slug}`;

  useEffect(() => {
    setMounted(true);
    let target: number;

    if (demoDurationSeconds > 0) {
      target = Date.now() + demoDurationSeconds * 1000;
    } else {
      target = new Date(targetDate).getTime();
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
  }, [targetDate, demoDurationSeconds, countdownKey]);

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
              {isLive ? 'Live Dispatch · August 2026' : 'Upcoming Release · 27 August 2026, 6:30 PM'}
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
          {!isLive && mounted ? (
            /* ─────────────────────────────────────────────────────────────
               SEALED EMBARGOED COUNTDOWN MODE (Runs till 27 August 2026, 6:30 PM)
               ───────────────────────────────────────────────────────────── */
            <motion.div
              key="countdown-mode"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center text-center space-y-8 py-4 sm:py-8"
            >
              {/* Embargo Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-oxblood/30 bg-oxblood/5 px-4 py-1.5 font-technical-ui text-xs font-bold uppercase tracking-[0.24em] text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
                <Lock className="h-3.5 w-3.5" />
                <span>Editorial Embargo · Release 27 August 2026 at 6:30 PM IST</span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3 max-w-2xl">
                <h3 className="font-serif text-3xl font-bold leading-tight text-on-background sm:text-4xl lg:text-5xl">
                  Monthly Legal Review — Vol. 1 | Issue 3
                </h3>
                <p className="font-body-md text-sm leading-relaxed text-on-surface-variant dark:text-on-background/75 sm:text-base">
                  Primary-source analysis, constitutional dispatches, and legislative tracker under active editorial embargo. Contents will unlock automatically at 6:30 PM IST.
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
              </div>

              {/* Status footer */}
              <div className="flex items-center gap-2 font-technical-ui text-[11px] font-semibold tracking-wider text-on-surface-variant dark:text-on-background/60">
                <ShieldAlert className="h-4 w-4 text-oxblood dark:text-primary" />
                <span>Live synchronizer active · Auto-unveils 27 August 2026 at 6:30 PM IST without refresh</span>
              </div>
            </motion.div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               LIVE UNLOCKED MODE (Automatically appears once timer hits 0)
               ───────────────────────────────────────────────────────────── */
            <motion.div
              key="live-mode"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
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
                      Vol. 1 · Issue 3
                    </span>
                    <span className="font-technical-ui text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant dark:text-on-background/50">
                      August 2026
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
                      'The August 2026 Monthly Legal Review from the National Legal Observatory covers the Supreme Court’s landmark institutional governance ruling in Jojari River, defamation quashing under S.196 CrPC, and the Monsoon Session recap.'}
                  </p>

                  {/* 4 Topic Highlights */}
                  <div className="grid gap-2.5 sm:grid-cols-2 pt-2 text-xs font-serif text-on-surface-variant dark:text-on-background/70 border-t border-outline-variant/30 pt-3 dark:border-primary/15">
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">01</span>
                      <span><strong>Judgment of the Month:</strong> Jojari River Contamination (2026 INSC 812)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">02</span>
                      <span><strong>Constitutional Watch:</strong> Rahul Gandhi Defamation &amp; Bar Councils</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">03</span>
                      <span><strong>Legislative Tracker:</strong> Monsoon Session Recap (12 Bills)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-oxblood dark:text-primary font-bold">05</span>
                      <span><strong>Editor&apos;s Note:</strong> The Bench as Administrator</span>
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
                      Read Full Issue 3
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
