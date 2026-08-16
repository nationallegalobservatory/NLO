import React from 'react';
import { FileText, Users, Scale, Shield } from 'lucide-react';
import Link from 'next/link';
import Avatar from '../../components/Avatar';

export const metadata = {
  title: 'About the Observatory',
  description: 'Independent Legal Research & Observation in India.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Platform Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 pb-10 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-[9px] sm:text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 w-full">
          <span>NATIONAL LEGAL OBSERVATORY</span>
          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
          <span>Independent Legal Research | India</span>
          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
          <span>Founding Editorial | June 2026</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight">
          About the Platform
        </h1>
        <p className="text-base sm:text-lg text-indigo-600 dark:text-indigo-400 font-serif italic mt-4 max-w-2xl">
          Charting constitutional developments, public policy, and landmark judgments with uncompromising academic rigour.
        </p>
      </header>

      {/* About the Platform Section */}
      <section className="py-12 border-b border-slate-200 dark:border-slate-800">
        <div className="prose prose-slate dark:prose-invert max-w-none font-serif text-lg leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            The National Legal Observatory (NLO) is an independent legal research platform dedicated to tracking, analyzing, and contextualizing legal developments across India. 
          </p>
          <p>
            Our mission is to bridge the gap between complex legal shifts—occurring across constitutional benches, parliamentary committees, and regulatory bodies—and the public discourse. We publish structured, primary-source-driven reviews tailored for legal professionals, academics, students, and citizens who require precise, agenda-free analysis without paywalls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
            <Scale className="w-8 h-8 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Constitutional & Public Law</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Tracking fundamental rights jurisprudence, federalism, and the structural integrity of Indian constitutionalism.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
            <Shield className="w-8 h-8 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Policy & Regulation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Analysis of legislative changes, executive orders, and regulatory shifts in technology, environment, and commerce.</p>
          </div>
        </div>
      </section>

      {/* Founders' Note Section */}
      <section className="py-12 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
          <h2 className="font-serif text-3xl font-extrabold text-slate-900 dark:text-white">
            Founders&apos; Note
          </h2>
          <a
            href="/NLO_Founding_Editorial.docx"
            download
            className="flex items-center mt-4 sm:mt-0 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold text-sm shrink-0"
          >
            <FileText className="w-4 h-4 mr-2 text-indigo-500" />
            <span>Download Editorial (DOCX)</span>
          </a>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
          
          <article className="prose prose-slate dark:prose-invert max-w-none font-serif text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300 space-y-6">
            <p>
              There is a particular kind of frustration that comes with studying law in India today.
            </p>
            <p>
              The Supreme Court delivers a judgment that reshapes the constitutional landscape and within forty-eight hours it is buried under political noise, reduced to a headline, or misrepresented entirely. Parliament passes legislation of real consequence, and the public discourse that follows is more partisan than legal. Policy shifts that carry serious implications for rights, for contracts, for civil liberties come and go, noted briefly and analysed rarely.
            </p>
            <p className="font-sans font-semibold text-slate-900 dark:text-white pl-4 border-l-2 border-indigo-500 dark:border-indigo-400 my-8 italic">
              This is not a critique of journalism. It is an observation about a gap.
            </p>
            <p>
              Legal developments in India move fast. The institutions that produce them are prolific. What is scarce is not information. What is scarce is sustained, independent, structured analysis of that information, produced without an agenda and accessible without a paywall.
            </p>
            <p>
              The National Legal Observatory is my attempt to address that gap.
            </p>
            <p>
              I do not write from the authority of a decade at the bar or a tenured academic position. What I bring is a deep investment in legal research, a commitment to rigorous analysis, and the belief that independent observation has value precisely because it is independent, not beholden to a firm, a party, or an institution.
            </p>
            <p>
              If you are a student, a practitioner, an academic, or simply someone who believes that legal literacy matters, I invite you to read, to engage, and to hold this platform to the standards it sets for itself.
            </p>
          </article>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <Avatar
              src="/images/bhoomija-avatar.png"
              alt="Bhoomija Khanna"
              className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
            />
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-base">
                <Link href="/bhoomija" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
                  Bhoomija Khanna
                </Link>
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Founder & Research Director
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Board Placeholder */}
      <section className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-6 h-6 text-indigo-500" />
          <h2 className="font-serif text-3xl font-extrabold text-slate-900 dark:text-white">
            Editorial Board
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Board Member Card */}
          <div className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition">
            <Avatar src="/images/bhoomija-avatar.png" alt="Bhoomija Khanna" authorSlug="bhoomija" className="w-16 h-16 rounded-full object-cover" />
            <div>
              <Link href="/bhoomija" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                <h4 className="font-bold text-slate-900 dark:text-white hover:underline">Bhoomija Khanna</h4>
              </Link>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">Editor-in-Chief</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Alliance University</p>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Board Positions Open</p>
              <Link href="/contact" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block">
                Apply to join the board →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
