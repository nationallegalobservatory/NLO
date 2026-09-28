import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Shield } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | National Legal Observatory',
  description: 'Terms of service and intellectual property provisions for the National Legal Observatory.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
        <Link href="/" className="inline-flex items-center hover:text-oxblood dark:hover:text-primary transition gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600 dark:text-slate-300 font-medium">Terms of Service</span>
      </div>

      <header className="border-b border-outline-variant/40 dark:border-primary/20 pb-8 space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-technical-ui uppercase tracking-[0.24em] text-oxblood dark:text-primary">
          <FileText className="w-4 h-4" />
          <span>Platform Governance</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-background dark:text-on-background leading-tight">
          Terms of Service
        </h1>
        <p className="font-serif italic text-base sm:text-lg text-on-surface-variant dark:text-on-background/75 max-w-3xl leading-relaxed">
          Conditions governing readership, content attribution, intellectual property, and non-commercial educational use.
        </p>
      </header>

      {/* Section 1: Acceptance */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-on-background">1. Acceptance of Terms</h2>
        <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/80 leading-relaxed">
          By accessing or reading publications on the National Legal Observatory platform, you agree to these Terms of Service. If you do not agree with any part of these terms, please refrain from using the platform.
        </p>
      </section>

      {/* Section 2: Intellectual Property & Copyright Notice */}
      <section className="rounded-xl border border-oxblood/30 bg-surface-container-lowest/80 dark:border-primary/30 dark:bg-surface-container p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="font-serif text-xl font-bold text-on-background">2. Intellectual Property &amp; Content Ownership</h2>
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
        <p className="pt-2 text-xs text-on-surface-variant dark:text-on-background/70 font-body-md">
          For full reproduction licensing and citation guides, see our dedicated <Link href="/copyright" className="text-oxblood dark:text-primary underline font-semibold">Copyright &amp; Permissions policy</Link>.
        </p>
      </section>

      {/* Section 3: Academic & Research Use */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-on-background">3. Academic &amp; Educational Use</h2>
        <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/80 leading-relaxed">
          Scholars, educators, and students are welcome to reference excerpts from our analyses in academic research, court briefs, or university lectures provided complete attribution is preserved with a direct link to the primary publication.
        </p>
      </section>

      {/* Section 4: Disclaimer */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-on-background">4. Disclaimer of Legal Advice</h2>
        <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/80 leading-relaxed">
          The observatory provides academic observation and jurisprudential analysis. Nothing on this website constitutes legal counsel, solicitation, or legal representation.
        </p>
      </section>

      {/* Section 5: Contact */}
      <section className="pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant dark:text-on-background/60">
        Questions regarding these terms? <Link href="/contact" className="text-oxblood dark:text-primary hover:underline font-semibold">Contact the Observatory Editorial Team</Link>.
      </section>
    </div>
  );
}
