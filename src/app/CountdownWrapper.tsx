'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownWrapperProps {
  targetDate: string; // ISO string
  children: React.ReactNode;
}

export function CountdownWrapper({ targetDate, children }: CountdownWrapperProps) {
  const [isLive, setIsLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance <= 0) {
        setIsLive(true);
        clearInterval(interval);
      } else {
        setIsLive(false);
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft({ minutes, seconds });
      }
    }, 1000);

    // Initial check
    const initialNow = new Date().getTime();
    if (target - initialNow <= 0) {
      setIsLive(true);
    }

    return () => clearInterval(interval);
  }, [targetDate]);

  if (isLive) {
    return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>{children}</motion.div>;
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-oxblood/30 bg-surface-container-lowest p-6 shadow-sm dark:border-primary/25 dark:bg-surface-container sm:p-10 flex flex-col items-center justify-center min-h-[400px]">
      <div className="absolute inset-0 bg-gradient-to-br from-background to-surface-container-lowest dark:from-background dark:to-surface-container z-0 opacity-50" />
      <div className="relative z-10 text-center space-y-6">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-600/30 bg-emerald-700/10 px-3 py-1 font-technical-ui text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-300">
          Upcoming Release
        </span>
        <h3 className="font-serif text-2xl font-bold leading-tight text-on-background dark:text-on-background sm:text-3xl lg:text-4xl max-w-2xl mx-auto">
          Custody, Consent, and the Limits of Law: Revisiting Tukaram v. State of Maharashtra
        </h3>
        <p className="font-body-md text-on-surface-variant dark:text-on-background/75">
          The full Judgment Review will be unveiled shortly.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="flex flex-col items-center">
            <span className="font-technical-ui text-4xl font-bold text-oxblood dark:text-primary">
              {timeLeft.minutes.toString().padStart(2, '0')}
            </span>
            <span className="font-technical-ui text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Minutes
            </span>
          </div>
          <span className="text-2xl font-bold text-outline-variant">:</span>
          <div className="flex flex-col items-center">
            <span className="font-technical-ui text-4xl font-bold text-oxblood dark:text-primary">
              {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
            <span className="font-technical-ui text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Seconds
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
