import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Scale, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Citation & Permissions | National Legal Observatory',
  description:
    'Academic citation standards, reproduction permissions, fair use guidelines, and intellectual property terms for the National Legal Observatory.',
};

export default function CitationPermissionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
        <Link href="/" className="inline-flex items-center hover:text-oxblood dark:hover:text-primary transition gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600 dark:text-slate-300 font-medium">Citation Permissions</span>
      </div>

      <header className="border-b border-outline-variant/40 dark:border-primary/20 pb-8 space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-technical-ui uppercase tracking-[0.24em] text-oxblood dark:text-primary">
          <Scale className="w-4 h-4" />
          <span>Editorial Standard</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-background dark:text-on-background leading-tight">
          Citation &amp; Reproduction Permissions
        </h1>
        <p className="font-serif italic text-base sm:text-lg text-on-surface-variant dark:text-on-background/75 max-w-3xl leading-relaxed">
          Guidelines on citing National Legal Observatory publications in academic works, judicial filings, and public policy research.
        </p>
      </header>

      {/* Official Notice */}
      <section className="rounded-xl border border-oxblood/30 bg-surface-container-lowest/80 dark:border-primary/30 dark:bg-surface-container p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="font-serif text-xl font-bold text-on-background">
          Observatory Intellectual Property Policy
        </h2>
        <div className="font-serif text-base text-on-surface dark:text-on-background/90 leading-relaxed space-y-3 italic border-l-2 border-oxblood dark:border-primary pl-4">
          <p>
            Everything published on this website, including articles, research papers, commentary, graphics, and the Monthly Legal Review, belongs to the National Legal Observatory unless we&apos;ve credited someone else. Please don&apos;t reproduce, distribute, or republish any of it without written permission first.
          </p>
          <p>
            Case law, statutes, constitutional provisions, and other primary legal materials mentioned or quoted here remain in the public domain and are used for research and educational purposes. Where we draw on third-party sources, we do so under fair use principles for commentary and criticism, with credit given wherever it&apos;s due.
          </p>
          <p>
            The content on this site is meant for academic and informational use. It isn&apos;t legal advice. If you have questions about permissions, licensing, or attribution, feel free to reach out to us directly.
          </p>
        </div>
        <p className="font-technical-ui text-xs uppercase tracking-wider text-on-surface-variant dark:text-on-background/60 pt-2">
          — Office of the Research Director, National Legal Observatory
        </p>
      </section>

      {/* Citation Standards */}
      <section className="space-y-4">
        <h3 className="font-serif text-2xl font-bold text-on-background">
          Academic Citation Standards
        </h3>
        <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/80 leading-relaxed">
          When referencing an observatory paper, review, or data visualization in an academic journal, dissertation, or court pleading, please use our standardized citation formats:
        </p>
        <div className="space-y-3 pt-2">
          <div className="p-4 rounded-lg border border-outline-variant/40 bg-surface-container-low font-mono text-xs text-on-surface dark:text-on-background/90 overflow-x-auto">
            <span className="font-bold text-oxblood dark:text-primary block font-technical-ui uppercase tracking-wider text-[10px] mb-1">Standard Citation</span>
            Bhoomija Khanna (ed.), &lsquo;[Publication Title]&rsquo;, National Legal Observatory (Month Year).
          </div>
          <div className="p-4 rounded-lg border border-outline-variant/40 bg-surface-container-low font-mono text-xs text-on-surface dark:text-on-background/90 overflow-x-auto">
            <span className="font-bold text-oxblood dark:text-primary block font-technical-ui uppercase tracking-wider text-[10px] mb-1">Bluebook Format</span>
            Bhoomija Khanna, <em>[Publication Title]</em>, Nat&apos;l Legal Observatory (Month Year), https://legal-observatory.vercel.app/publications/...
          </div>
        </div>
      </section>

      {/* Permissions Action Box */}
      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest dark:border-primary/20 dark:bg-surface-container p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <h4 className="font-serif text-xl font-bold text-on-background">
            Need Written Republication Clearance?
          </h4>
          <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/70 leading-relaxed">
            For anthologies, course syllabus readers, or translations, submit an inquiry and our editorial team will issue formal written clearances.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-md bg-oxblood dark:bg-primary px-5 py-2.5 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white dark:text-background shrink-0 hover:opacity-90 transition"
        >
          <Mail className="w-4 h-4" />
          Request Clearance
        </Link>
      </section>
    </div>
  );
}
