import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Scale, BookOpen, Mail, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Copyright & Permissions | National Legal Observatory',
  description:
    'Copyright notice, academic fair use policy, primary legal materials declaration, and reproduction permissions for the National Legal Observatory.',
  openGraph: {
    title: 'Copyright & Permissions | National Legal Observatory',
    description:
      'Copyright notice, academic fair use policy, and reproduction permissions for the National Legal Observatory.',
  },
};

export default function CopyrightPermissionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Back to Home / Publications */}
      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
        <Link
          href="/"
          className="inline-flex items-center hover:text-oxblood dark:hover:text-primary transition gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600 dark:text-slate-300 font-medium">Copyright &amp; Permissions</span>
      </div>

      {/* Page Header */}
      <header className="border-b border-outline-variant/40 dark:border-primary/20 pb-8 space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-technical-ui uppercase tracking-[0.24em] text-oxblood dark:text-primary">
          <ShieldCheck className="w-4 h-4" />
          <span>Legal Notice &amp; Intellectual Property</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-background dark:text-on-background leading-tight">
          Copyright, Fair Use &amp; Permissions
        </h1>
        <p className="font-serif italic text-base sm:text-lg text-on-surface-variant dark:text-on-background/75 max-w-3xl leading-relaxed">
          Guidelines regarding proprietary observatory scholarship, the preservation of public domain legal materials, academic citation standards, and reproduction permissions.
        </p>
      </header>

      {/* Featured Editorial Declaration Quote */}
      <section className="rounded-xl border border-oxblood/30 bg-surface-container-lowest/80 dark:border-primary/30 dark:bg-surface-container p-6 sm:p-8 space-y-4 shadow-xs backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-oxblood/10 dark:bg-primary/10 flex items-center justify-center text-oxblood dark:text-primary shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-on-background">
              Editorial Rights Declaration
            </h2>
            <p className="font-technical-ui text-[11px] uppercase tracking-wider text-on-surface-variant dark:text-on-background/50">
              National Legal Observatory &bull; Office of the Chief Editor
            </p>
          </div>
        </div>
        
        <blockquote className="border-l-2 border-oxblood dark:border-primary pl-4 py-1 font-serif text-base sm:text-lg text-on-surface dark:text-on-background/90 leading-relaxed italic space-y-3">
          <p>
            &ldquo;Everything published on this website, including articles, research papers, commentary, graphics, and the Monthly Legal Review, belongs to the National Legal Observatory unless we&apos;ve credited someone else. Please don&apos;t reproduce, distribute, or republish any of it without written permission first.
          </p>
          <p>
            Case law, statutes, constitutional provisions, and other primary legal materials mentioned or quoted here remain in the public domain and are used for research and educational purposes. Where we draw on third-party sources, we do so under fair use principles for commentary and criticism, with credit given wherever it&apos;s due.
          </p>
          <p>
            The content on this site is meant for academic and informational use. It isn&apos;t legal advice. If you have questions about permissions, licensing, or attribution, feel free to reach out to us directly.&rdquo;
          </p>
        </blockquote>

        <div className="pt-2 flex items-center justify-between text-xs text-on-surface-variant dark:text-on-background/60">
          <span className="font-technical-ui uppercase tracking-wider text-[11px]">
            — Bhoomija Khanna, Founder &amp; Research Director
          </span>
          <Link
            href="/bhoomija"
            className="text-oxblood dark:text-primary hover:underline font-technical-ui text-[11px] uppercase tracking-wider font-semibold"
          >
            Editorial Profile &rarr;
          </Link>
        </div>
      </section>

      {/* Detailed Provisions Breakdown */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Card 1 */}
        <div className="border border-outline-variant/60 bg-surface-container-lowest dark:border-primary/25 dark:bg-surface-container-low p-6 space-y-3.5 transition-colors hover:border-oxblood/60 dark:hover:border-primary/50">
          <div className="w-8 h-8 border border-oxblood/30 bg-oxblood/10 text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary flex items-center justify-center font-technical-ui font-bold text-xs tracking-wider">
            01
          </div>
          <h3 className="font-serif text-lg font-bold text-on-background">
            Proprietary Scholarship
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/70 leading-relaxed">
            All original research briefs, statutory commentary, Monthly Legal Review issues, infographics, and analytical syntheses authored by the Observatory belong to the National Legal Observatory. Unauthorized scraping, commercial republication, or mass harvesting is prohibited.
          </p>
        </div>

        {/* Card 2 */}
        <div className="border border-outline-variant/60 bg-surface-container-lowest dark:border-primary/25 dark:bg-surface-container-low p-6 space-y-3.5 transition-colors hover:border-oxblood/60 dark:hover:border-primary/50">
          <div className="w-8 h-8 border border-oxblood/30 bg-oxblood/10 text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary flex items-center justify-center font-technical-ui font-bold text-xs tracking-wider">
            02
          </div>
          <h3 className="font-serif text-lg font-bold text-on-background">
            Public Domain Materials
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/70 leading-relaxed">
            Judgments of the Supreme Court of India, High Court rulings, Parliamentary Acts, legislative bills, regulations, and sovereign documents remain inherently in the public domain. Their excerpted quotation on this platform is conducted strictly for educational, civic, and academic scholarship.
          </p>
        </div>

        {/* Card 3 */}
        <div className="border border-outline-variant/60 bg-surface-container-lowest dark:border-primary/25 dark:bg-surface-container-low p-6 space-y-3.5 transition-colors hover:border-oxblood/60 dark:hover:border-primary/50">
          <div className="w-8 h-8 border border-oxblood/30 bg-oxblood/10 text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary flex items-center justify-center font-technical-ui font-bold text-xs tracking-wider">
            03
          </div>
          <h3 className="font-serif text-lg font-bold text-on-background">
            Academic Fair Use
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/70 leading-relaxed">
            Scholars, practitioners, law students, and researchers may cite short passages with appropriate academic attribution under Bluebook, MLA, or APA conventions. Every publication provides an automated citation tool for this purpose.
          </p>
        </div>
      </section>

      {/* Non-Legal Advice Disclaimer */}
      <section className="rounded-xs border border-outline-variant/60 bg-surface-container-low/50 dark:border-primary/25 dark:bg-surface-container-high/40 p-6 sm:p-8 space-y-3">
        <h3 className="font-serif text-xl font-bold text-on-background">
          Academic and Informational Notice (No Legal Advice)
        </h3>
        <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/75 leading-relaxed">
          The materials and analyses published on the National Legal Observatory are prepared solely for educational, academic, and informational purposes. Nothing on this website constitutes legal counsel, an attorney-client relationship, or a formal legal opinion. Readers should consult qualified legal counsel for specific legal advice regarding their individual circumstances.
        </p>
      </section>

      {/* Permissions & Licensing Request Section */}
      <section className="rounded-xs border border-oxblood/30 bg-oxblood/5 dark:border-primary/30 dark:bg-primary/10 p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold text-on-background">
            Requesting Reproduction or Licensing Clearances
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant dark:text-on-background/80 leading-relaxed">
            If you wish to republish an observatory article in an edited volume, academic coursepack, law journal, institutional repository, or institutional newsletter, please reach out to the editorial team. We routinely grant written clearances for non-commercial educational use.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xs border border-oxblood bg-oxblood dark:border-primary dark:bg-primary px-5 py-2.5 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white dark:text-background transition hover:bg-on-background dark:hover:bg-tertiary-fixed"
          >
            <Mail className="w-4 h-4" />
            Submit Permissions Request
          </Link>
          <a
            href="mailto:Nationallegalobservatory@gmail.com?subject=[Permissions%20Request]%20National%20Legal%20Observatory"
            className="inline-flex items-center gap-2 rounded-xs border border-outline-variant bg-surface-container-lowest dark:border-primary/30 dark:bg-surface-container px-5 py-2.5 font-technical-ui text-xs font-semibold uppercase tracking-[0.14em] text-on-background hover:border-oxblood hover:text-oxblood dark:hover:border-primary dark:hover:text-primary transition"
          >
            Direct Email Clearance
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
