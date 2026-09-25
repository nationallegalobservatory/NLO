'use client';

import React from 'react';
import { Download } from 'lucide-react';

interface PrintPDFButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export default function PrintPDFButton({ className = '', variant = 'compact' }: PrintPDFButtonProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (variant === 'full') {
    return (
      <button
        onClick={handlePrint}
        type="button"
        className={`w-full flex items-center justify-center px-4 py-2.5 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 transition cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 mr-2" />
        Download / Export PDF
      </button>
    );
  }

  return (
    <button
      onClick={handlePrint}
      type="button"
      title="Save / Download as PDF"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition text-xs font-semibold cursor-pointer ${className}`}
    >
      <Download className="w-3.5 h-3.5 text-indigo-500" />
      <span>Download PDF</span>
    </button>
  );
}
