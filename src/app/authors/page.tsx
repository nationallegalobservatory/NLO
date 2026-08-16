import React from 'react';
import Link from 'next/link';
import { ArrowRight, Cpu, ExternalLink, Shield } from 'lucide-react';
import Avatar from '../../components/Avatar';

export const metadata = {
  title: 'Observatory Contributors',
  description: 'Meet the legal scholars and technology builders behind the National Legal Observatory.',
};

export default function AuthorsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 py-8 sm:py-12">
      <header className="mx-auto max-w-3xl border-b border-outline-variant/45 pb-8 text-center dark:border-primary/20">
        <p className="font-technical-ui text-xs font-bold uppercase tracking-[0.28em] text-oxblood dark:text-primary">
          Contributor Registry
        </p>
        <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-on-background dark:text-on-background sm:text-5xl lg:text-6xl">
          Observatory Contributors
        </h1>
        <p className="mt-5 font-body-md text-base leading-8 text-on-surface-variant dark:text-on-background/70 sm:text-lg">
          The team powering the research, editorial standards, and digital infrastructure of the National Legal Observatory.
        </p>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-between space-y-6 border border-outline-variant/45 bg-surface-container-lowest p-6 transition-colors hover:border-oxblood/60 dark:border-primary/20 dark:bg-surface-container dark:hover:border-primary/55 sm:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-oxblood dark:text-primary">
              <div className="flex h-12 w-12 items-center justify-center border border-oxblood/25 bg-oxblood/10 dark:border-primary/25 dark:bg-primary/10">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-on-background dark:text-on-background">
                Legal & Editorial
              </h2>
            </div>
            
            <p className="border-b border-outline-variant/35 pb-4 font-body-md text-sm leading-7 text-on-surface-variant dark:border-primary/20 dark:text-on-background/65">
              Directing academic inquiry, editing submissions, and ensuring all observations adhere to high constitutional scholarship.
            </p>

            <div className="flex flex-col items-center gap-4 pt-2 text-center sm:flex-row sm:items-start sm:text-left">
              <Avatar
                src="/images/bhoomija-avatar.png"
                alt="Bhoomija Khanna"
                authorSlug="bhoomija"
                className="h-20 w-20 shrink-0 rounded-full border border-outline-variant object-cover grayscale dark:border-primary/25 sm:h-24 sm:w-24"
              />
              <div className="space-y-2 text-center sm:text-left">
                <div>
                  <Link href="/bhoomija" className="hover:text-oxblood dark:hover:text-primary transition-colors">
                    <h3 className="font-serif text-xl font-bold text-on-background dark:text-on-background hover:underline">
                      Bhoomija Khanna
                    </h3>
                  </Link>
                  <p className="font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-oxblood dark:text-primary">
                    Founder & Chief Editor
                  </p>
                </div>
                <p className="font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/65">
                  Focuses on constitutional law, public policy, and civil rights. Curates the observatory&apos;s research frameworks and publications.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-outline-variant/35 pt-6 dark:border-primary/20">
            <Link
              href="/bhoomija"
              className="inline-flex items-center gap-1.5 border border-oxblood bg-oxblood px-4 py-2.5 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed"
            >
              View Profile & Publications <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="flex flex-col justify-between space-y-6 border border-outline-variant/45 bg-surface-container-lowest p-6 transition-colors hover:border-oxblood/60 dark:border-primary/20 dark:bg-surface-container dark:hover:border-primary/55 sm:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-oxblood dark:text-primary">
              <div className="flex h-12 w-12 items-center justify-center border border-oxblood/25 bg-oxblood/10 dark:border-primary/25 dark:bg-primary/10">
                <Cpu className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-on-background dark:text-on-background">
                Platform Technology
              </h2>
            </div>

            <p className="border-b border-outline-variant/35 pb-4 font-body-md text-sm leading-7 text-on-surface-variant dark:border-primary/20 dark:text-on-background/65">
              Building standard-setting automation tools, managing database infrastructure, and maintaining premium web experiences.
            </p>

            <div className="flex flex-col items-center gap-4 pt-2 text-center sm:flex-row sm:items-start sm:text-left">
              <Avatar
                src="/utkarsh-avatar.svg"
                alt="Utkarsh Mani Tripathi"
                className="h-20 w-20 shrink-0 rounded-full border border-outline-variant bg-on-background object-cover dark:border-primary/25 sm:h-24 sm:w-24"
              />
              <div className="space-y-2 text-center sm:text-left">
                <div>
                  <h3 className="font-serif text-xl font-bold text-on-background dark:text-on-background">
                    Utkarsh Mani Tripathi
                  </h3>
                  <p className="font-technical-ui text-xs font-bold uppercase tracking-[0.14em] text-oxblood dark:text-primary">
                    Full Stack Product Builder & Tech Lead
                  </p>
                </div>
                <p className="font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/65">
                  High-agency product builder entering 3rd year of CSE at GTB4CEC. Expert in database automation, voice production, and AI operations.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-outline-variant/35 pt-6 dark:border-primary/20">
            <a
              href="https://utkarshmanitripathi.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-oxblood bg-oxblood px-4 py-2.5 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed"
            >
              View Portfolio <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
