'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import Avatar from '../../components/Avatar';
import './bhoomija.css';
import BorderGlow from '@/components/reactbits/BorderGlow';

// ─── Data ──────────────────────────────────────────────────────────────────────

const CERTS = [
  { href: '/certificates/illinois.png', img: '/certificates/illinois.png', issuer: 'University of Illinois Urbana-Champaign', name: 'Corporate & Commercial Law I: Contracts & Employment Law', hasImage: true },
  { href: '/certificates/yale.png', img: '/certificates/yale.png', issuer: 'Yale University', name: 'Moral Foundations of Politics', hasImage: true },
  { href: '/certificates/uva.png', img: '/certificates/uva.png', issuer: 'University of Virginia', name: 'Design Thinking: Ideas to Action', hasImage: true },
  { href: '/certificates/northeastern.png', img: '/certificates/northeastern.png', issuer: 'Northeastern University', name: 'Ethics & Governance in the Age of Generative AI', hasImage: true },
  { href: null, img: null, issuer: 'UNICEF', name: 'Social Norms, Social Change I', hasImage: false },
  { href: null, img: null, issuer: 'IBM', name: 'Introduction to Cybersecurity Tools & Cyberattacks', hasImage: false },
];

const EDUCATION = [
  { school: 'Alliance University, Bangalore', degree: 'B.A. LL.B. (Hons.)', period: '2025 – Present', active: true },
  { school: 'The British Co-Ed High School, Patiala', degree: 'ISC (Humanities) — 96.25%', period: 'Graduated 2025', active: false },
];

const SOFT_SKILLS = [
  { icon: '💬', title: 'Oral Advocacy', desc: 'Demonstrated through moot court participation, international debate, and public speaking.' },
  { icon: '✍️', title: 'Written Communication', desc: 'Precise legal drafting across 15+ documents — pleadings, contracts, notices, and briefs.' },
  { icon: '🔍', title: 'Analytical Thinking', desc: 'Identifying legal issues, constructing arguments from primary sources and case law.' },
  { icon: '🤝', title: 'Leadership', desc: 'Hosted speaker sessions at Alliance University; led NLO as founder and research director.' },
  { icon: '📋', title: 'Ownership', desc: 'Proactive approach to tasks — from independent research publication to event organisation.' },
];

const HARD_SKILLS = [
  { label: 'Legal Research', items: ['Primary source analysis', 'Case law synthesis', 'Statutory interpretation', 'OSCOLA citation'] },
  { label: 'Contract Drafting', items: ['NDA', 'Employment Agreements', 'Real Estate Indemnity', 'IP & Trademark Notices'] },
  { label: 'Litigation Drafts', items: ['Plaints', 'Bail Applications', 'Injunctions', 'Affidavits', 'DV Complaints'] },
  { label: 'Procedural Law', items: ['CPC', 'BNSS 2023', 'Trade Marks Act 1999', 'DV Act 2005'] },
  { label: 'Languages', items: ['English', 'Hindi', 'Punjabi'] },
];

const EXPERIENCE = [
  {
    role: 'Founder & Research Director',
    org: 'National Legal Observatory',
    period: 'June 2026 – Present',
    desc: 'Founded and built India\'s first independent constitutional research platform — primary-source analysis of constitutional law, judicial updates, and digital surveillance policy.',
    active: true,
  },
  {
    role: 'Finance Minister',
    org: 'Mock Parliament — High School',
    period: '2025',
    desc: 'Represented the Finance Ministry portfolio, demonstrating legislative understanding and policy argumentation in a structured parliamentary simulation.',
    active: false,
  },
  {
    role: 'International Debater',
    org: 'Representing India, United Kingdom',
    period: '2024',
    desc: 'Represented India at an international debate competition held in the United Kingdom — argumentation, research, and cross-examination under competitive pressure.',
    active: false,
  },
];

const PUBLICATIONS = [
  {
    type: 'Monthly Review',
    title: 'Monthly Legal Review — Vol. 1 | Issue 2 | July 2026',
    desc: 'Covering the Supreme Court ruling on AI-hallucinated citations (Pooja Ramesh Singh), Compassionate Release for Elderly Prisoners, Court Live-Stream Ban, and Monsoon Session 2026.',
    href: '/publications/research/monthly-legal-review-july-2026',
    tag: 'NLO Monthly Review · July 2026',
    readOnline: true,
    comingSoon: false,
  },
  {
    type: 'Monthly Review',
    title: 'Monthly Legal Review — Vol. 1 | Issue 1 | June 2026',
    desc: 'The inaugural Monthly Legal Review covering Supreme Court AI Regulations, Online Gaming Ruling, and Delimitation Battles.',
    href: '/publications/research/monthly-legal-review-june-2026',
    tag: 'NLO Monthly Review · June 2026',
    readOnline: true,
    comingSoon: false,
  },
  {
    type: 'Research Article',
    title: 'Manufacturing Consent: How Political Narratives Are Engineered in India',
    desc: 'Examines the mechanisms through which political consent is manufactured in India — from historical propaganda techniques to modern algorithmic amplification.',
    href: '/publications/research/manufacturing-consent',
    tag: 'NLO Research Desk · June 2026',
    readOnline: true,
    comingSoon: false,
  },
  {
    type: 'Research Paper',
    title: 'Gender, Propaganda and Patriarchal Power in Indian Democratic Politics',
    desc: 'A socio-legal analysis of gendered rhetoric, political exclusion, and patriarchal propaganda in Indian democratic institutions.',
    href: '/bhoomija/research/propaganda-patriarchy-democracy',
    tag: 'NLO · 2025',
    readOnline: true,
    comingSoon: false,
  },
  {
    type: 'Handbook',
    title: 'Digital Self-Defence Handbook',
    desc: 'Practical guidance on navigating digital safety, privacy, and self-defence in online spaces, authored and published by Bhoomija Khanna.',
    href: 'https://media.licdn.com/dms/document/media/v2/D561FAQGL95AefM2ugw/feedshare-document-sanitized-pdf/B56Z6i.cRrJsA8-/0/1780850740601?e=1782990000&v=beta&t=QP1vhu-bMBBqCRfHDG9fcUc1E3Rb5Kqiit0Lve9GTWU',
    tag: 'NLO · 2025',
    readOnline: true,
    comingSoon: false,
  },
  {
    type: 'Founding Editorial',
    title: 'Why India Needs Independent Legal Observation',
    desc: 'The founding note of the National Legal Observatory — the case for independent, primary-source constitutional analysis outside institutional constraints.',
    href: '/about',
    tag: 'NLO · June 2026',
    readOnline: true,
    comingSoon: false,
  },
];

const DRAFTING_ITEMS = [
  { label: 'Corporate & Transactional', text: 'NDA, Employment Agreement, Real Estate Indemnity Agreement (Karnataka law), Cease & Desist Notice (Trade Marks Act, 1999)' },
  { label: 'Civil Litigation', text: 'Plaint for Recovery of Money, Interim Injunction, Affidavit of Evidence, Reply to Legal Notice, Vakalatnama' },
  { label: 'Criminal', text: 'Regular Bail Application (S.483 BNSS), Anticipatory Bail Application (S.482 BNSS)' },
  { label: 'Family Law / DV', text: 'Complaint under S.12/18/19/22 DV Act 2005; Written Statement with Reply' },
];

const ACHIEVEMENTS = [
  'Hosted a speaker session at Alliance University featuring a GCC industry expert.',
  "Silver Standard Award — Duke of Edinburgh's International Award (IAYP).",
  'State-level hockey player.',
  'Trained swimmer.',
  'Represented India at an international debate competition in the United Kingdom.',
  'Mock Parliament — Finance Minister (High School).',
];

// ─── Skills custom cursor ─────────────────────────────────────────────────────
function useSkillsCursor(coverRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const cover = coverRef.current;
    if (!cover) return;

    const cursor = document.createElement('div');
    cursor.className = 'bk-cursor';
    cursor.innerHTML = '<div class="bk-cursor-inner">✦</div>';
    cursor.style.opacity = '0';
    document.body.appendChild(cursor);

    const inner = cursor.querySelector('.bk-cursor-inner') as HTMLElement;

    const onMove = (e: MouseEvent) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    };
    const onEnter = () => { cursor.style.opacity = '1'; };
    const onLeave = () => { cursor.style.opacity = '0'; };

    const spawnSparkles = (x: number, y: number) => {
      const ripple = document.createElement('div');
      ripple.className = 'bk-click-ripple';
      ripple.style.left   = x + 'px';
      ripple.style.top    = y + 'px';
      ripple.style.width  = '80px';
      ripple.style.height = '80px';
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist  = 32 + Math.random() * 24;
        const s = document.createElement('div');
        s.className = 'bk-sparkle';
        s.style.left = x + 'px';
        s.style.top  = y + 'px';
        s.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        s.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
        s.style.background = i % 2 === 0 ? '#a01e1e' : '#faf8f3';
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 650);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      inner.classList.add('is-clicking');
      spawnSparkles(e.clientX, e.clientY);
    };
    const onMouseUp = () => inner.classList.remove('is-clicking');

    window.addEventListener('mousemove', onMove);
    cover.addEventListener('mouseenter', onEnter);
    cover.addEventListener('mouseleave', onLeave);
    cover.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cover.removeEventListener('mouseenter', onEnter);
      cover.removeEventListener('mouseleave', onLeave);
      cover.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      cursor.remove();
    };
  }, [coverRef]);
}

function useScrollReveal() {
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const targets = root.querySelectorAll('.bk-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return pageRef;
}

// ─── Certificate card ──────────────────────────────────────────────────────────
function CertCard({ cert }: { cert: typeof CERTS[number] }) {
  const inner = (
    <>
      {cert.hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cert.img!} alt={cert.name} className="bk-cert-img" />
      ) : (
        <div className="bk-cert-no-img">
          <span className="bk-cert-no-img-icon">📜</span>
          <span>{cert.issuer}</span>
        </div>
      )}
      <div className="bk-cert-meta">
        <p className="bk-cert-issuer">{cert.issuer}</p>
        <p className="bk-cert-name">{cert.name}</p>
      </div>
    </>
  );
  if (cert.href) {
    return (
      <a href={cert.href} target="_blank" rel="noopener noreferrer" className="bk-cert-card">
        {inner}
      </a>
    );
  }
  return <div className="bk-cert-card bk-cert-card-static">{inner}</div>;
}

// ─── Certificate marquee ───────────────────────────────────────────────────────
function CertMarquee() {
  const [paused, setPaused] = useState(false);
  const handleMouseDown = useCallback(() => setPaused(true), []);
  const handleMouseUp = useCallback(() => setPaused(false), []);
  return (
    <div
      className={`bk-marquee-outer${paused ? ' is-paused' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="bk-marquee-track">
        {[...CERTS, ...CERTS].map((cert, i) => (
          <CertCard key={i} cert={cert} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function BhoomijaCVClient() {
  const pageRef = useScrollReveal();
  const [skillsOpen, setSkillsOpen] = useState(false);
  const skillsCoverRef = useRef<HTMLDivElement>(null);
  useSkillsCursor(skillsCoverRef);

  useEffect(() => {
    const handleOpenSkills = () => setSkillsOpen(true);
    window.addEventListener('open-skills', handleOpenSkills);
    return () => window.removeEventListener('open-skills', handleOpenSkills);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('bhoomija-mode');
    const FONT_ID = 'gloria-hallelujah-font';
    if (!document.getElementById(FONT_ID)) {
      const link = document.createElement('link');
      link.id = FONT_ID;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Gloria+Hallelujah&display=swap';
      document.head.appendChild(link);
    }
    return () => root.classList.remove('bhoomija-mode');
  }, []);

  return (
    <div ref={pageRef} className="bk-page">

      {/* ── HERO ── */}
      <section id="hero" className="bk-hero">
        <div className="bk-hero-left">
          <p className="bk-hero-eyebrow">National Legal Observatory — Founder &amp; Research Director</p>
          <h1 className="bk-hero-name">Bhoomija Khanna</h1>
          <p className="bk-hero-title">
            B.A. LL.B. (Hons.) · Alliance University · Bengaluru, Karnataka · 2025 – Present
            <br /><br />
            Corporate transactional law · Contract drafting · Legal research · Written advocacy.
          </p>
          <div className="bk-hero-cta-row">
            <a href="/Bhoomija_Khanna_CV.pdf" download className="bk-btn bk-btn-fill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download CV
            </a>
            <a href="mailto:bhoomija.k2810@gmail.com" className="bk-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              Email
            </a>
            <a href="https://linkedin.com/in/bhoomija-khanna-268995368" target="_blank" rel="noopener noreferrer" className="bk-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              LinkedIn
            </a>
          </div>
        </div>
        <div className="bk-hero-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bhoomija-desk.png" alt="Bhoomija Khanna — Legal Research Desk" className="bk-hero-photo" />
        </div>
      </section>

      {/* ── BIG TYPE DIVIDER ── */}
      <div className="bk-type-divider bk-reveal">
        <span className="bk-type-word">NLO</span>
        <span className="bk-type-word bk-type-word-hollow">Founder</span>
        <p className="bk-type-divider-text">
          Building India&apos;s first independent constitutional observatory — rigorous,
          primary-source analysis of constitutional law, digital surveillance, and judicial updates.
        </p>
      </div>

      {/* ── ABOUT ME ── */}
      <section id="about" className="bk-about bk-reveal">
        <div className="bk-about-label">about me</div>
        <div className="bk-about-grid">
          <div className="bk-about-photo-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Avatar src="/images/bhoomija-avatar.png" alt="Bhoomija Khanna" className="bk-about-photo" />
          </div>
          <div className="bk-about-text-col">
            <h2 className="bk-about-heading">Hi, I&apos;m Bhoomija.</h2>
            <p className="bk-about-body">
              I&apos;m a 2nd Year B.A. LL.B. (Hons.) student at Alliance University, Bengaluru with a deep
              interest in corporate transactional law, constitutional analysis, and written advocacy. My legal
              work is grounded in primary sources — I build arguments from statute, case law, and first
              principles rather than commentary.
            </p>
            <p className="bk-about-body">
              Beyond the classroom, I founded the{' '}
              <Link href="/" className="bk-inline-link">National Legal Observatory</Link> — an independent
              platform dedicated to tracking India&apos;s constitutional developments, judicial shifts, and
              digital policy. I believe rigorous, accessible legal writing is a democratic necessity, not a
              professional luxury.
            </p>
            <p className="bk-about-body">
              I&apos;ve represented India in international debate, competed in moot courts, and maintain an
              independent drafting portfolio of over 15 legal documents. Outside law, I&apos;m a state-level
              hockey player and trained swimmer.
            </p>
            <div className="bk-about-tags">
              {[
                { name: 'Constitutional Law', desc: 'Study of fundamental principles, rights, and governmental structures' },
                { name: 'Contract Drafting', desc: 'Creating legally binding agreements and commercial documents' },
                { name: 'Legal Research', desc: 'Finding and analyzing statutes, case law, and legal precedents' },
                { name: 'Written Advocacy', desc: 'Persuasive legal writing for briefs, pleadings, and submissions' },
                { name: 'Corporate Law', desc: 'Legal framework for business entities and commercial transactions' },
                { name: 'Moot Courts', desc: 'Simulated court proceedings for legal argumentation practice' }
              ].map(t => (
                <span key={t.name} className="bk-about-tag" data-tooltip={t.desc}>{t.name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIT TEXT BAND ── */}
      <section className="bk-lit-band">
        <span className="bk-lit-band-label">in her own words</span>
        <div className="bk-lit-band-grid">
          <div>
            <span className="bk-lit-line-lg">&ldquo;Independent legal</span>
            <span className="bk-lit-line-lg">observation is not a</span>
            <span className="bk-lit-line-lg">luxury — it is the</span>
            <span className="bk-lit-line-lg">minimum condition for</span>
            <span className="bk-lit-line-lg">democratic accountability.&rdquo;</span>
            <p className="bk-lit-attr">— Founding Note · National Legal Observatory</p>
          </div>
          <div>
            <span className="bk-lit-line">I write from a deep investment in legal research</span>
            <span className="bk-lit-line">and a commitment to rigorous analysis.</span>
            <span className="bk-lit-line">&nbsp;</span>
            <span className="bk-lit-line">Independent observation has value precisely</span>
            <span className="bk-lit-line">because it is independent — not beholden</span>
            <span className="bk-lit-line">to a firm, a party, or an institution.</span>
            <span className="bk-lit-line">&nbsp;</span>
            <span className="bk-lit-line">The legal profession trains us to read carefully,</span>
            <span className="bk-lit-line">argue precisely, and remain accountable to the text.</span>
            <span className="bk-lit-line">That is the standard I hold myself to.</span>
          </div>
        </div>
      </section>

      {/* ── CERTIFICATE STRIP ── */}
      <section className="bk-strip-wrapper bk-reveal">
        <p className="bk-strip-label">Certifications &amp; Credentials · hover to pause · click to open</p>
        <CertMarquee />
      </section>

      {/* ── SKILLS — STICKY NOTE COVER + EXPAND ── */}
      <section id="skills" className="bk-skills-section bk-reveal">
        {/* Sticky note cover — click to toggle */}
        <div
          ref={skillsCoverRef}
          className="bk-skills-cover"
          onClick={() => setSkillsOpen(o => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSkillsOpen(o => !o)}
          aria-expanded={skillsOpen}
        >
          <div className="bk-skills-sticky">
            <p className="bk-sticky-heading">Skills</p>
            <p className="bk-sticky-sub">my abilities</p>
          </div>
          <p className="bk-skills-click-hint">
            {skillsOpen ? 'click to close' : 'click here!!'}
          </p>
        </div>

        {/* Expanded content — scrapbook layout */}
        <div className={`bk-skills-body${skillsOpen ? ' is-open' : ''}`}>
          <div className="bk-scrap-board">
            {/* Card 1 — Soft Skills */}
            <div className="bk-scrap-card">
              <p className="bk-scrap-card-label">soft skills</p>
              <ul className="bk-scrap-soft-list">
                {SOFT_SKILLS.map((s) => (
                  <li key={s.title} className="bk-scrap-soft-item">
                    <span className="bk-scrap-soft-icon">{s.icon}</span>
                    <div>
                      <p className="bk-scrap-soft-title">{s.title}</p>
                      <p className="bk-scrap-soft-desc">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2 — Hard Skills */}
            <div className="bk-scrap-card">
              <p className="bk-scrap-card-label">hard skills</p>
              <div className="bk-scrap-hard-groups">
                {HARD_SKILLS.map((g) => (
                  <div key={g.label}>
                    <p className="bk-scrap-hard-label">{g.label}</p>
                    <div className="bk-scrap-hard-pills">
                      {g.items.map((item) => (
                        <span key={item} className="bk-scrap-hard-pill">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE ── */}
      <section id="experience" className="bk-exp-section bk-reveal">
        <div className="bk-exp-inner">
          <p className="bk-section-label-lg" style={{ marginBottom: '32px' }}>my experience</p>
          <div className="bk-exp-timeline">
            {EXPERIENCE.map((exp, i) => (
              <div key={i} className={`bk-exp-item${exp.active ? ' bk-exp-item-active' : ''}`}>
                <div className="bk-exp-dot" />
                <div className="bk-exp-content">
                  <p className="bk-exp-period">{exp.period}</p>
                  <p className="bk-exp-role">{exp.role}</p>
                  <p className="bk-exp-org">{exp.org}</p>
                  <p className="bk-exp-desc">{exp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PUBLICATIONS / PARALLAX CARDS ── */}
      <section id="publications" className="bk-pub-section bk-reveal">
        <div className="bk-pub-inner">
          <div className="bk-pub-top">
            <p className="bk-section-label-lg">published work</p>
            <p className="bk-pub-sub">
              A selection of Bhoomija&apos;s legal research and editorial writing, published through
              the National Legal Observatory. Each piece is primary-source driven and independently researched.
            </p>
          </div>

          <div className="bk-pub-grid">
            {PUBLICATIONS.map((pub, i) => {
              const cardContent = (
                <>
                  <div className={`bk-pub-card-bg bk-pub-bg-${i + 1}`} />
                  <div className="bk-pub-card-overlay">
                    <p className="bk-pub-card-type">{pub.type}</p>
                    <h3 className="bk-pub-card-title">{pub.title}</h3>
                    <p className="bk-pub-card-desc">{pub.desc}</p>
                    <p className="bk-pub-card-tag">{pub.tag}</p>
                    <div className="bk-pub-card-links">
                      {pub.comingSoon ? (
                        <span className="bk-pub-card-coming-soon">
                          ⏳ Publishing in progress
                        </span>
                      ) : (
                        <span className="bk-pub-card-link">Read Online →</span>
                      )}
                    </div>
                  </div>
                </>
              );

              if (pub.comingSoon) {
                return (
                  <BorderGlow key={i} className="bk-pub-card select-none" glowColor="#7d1919" colors={['#a01e1e', '#c97a7a', '#7d1919']} backgroundColor="transparent">
                    {cardContent}
                  </BorderGlow>
                );
              }

              return (
                <a key={i} href={pub.href} target="_blank" rel="noopener noreferrer" className="bk-pub-card-anchor block no-underline">
                  <BorderGlow className="bk-pub-card cursor-pointer" glowColor="#7d1919" colors={['#a01e1e', '#c97a7a', '#7d1919']} backgroundColor="transparent">
                    {cardContent}
                  </BorderGlow>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TWO-COLUMN BODY (Education / Skills / Achievements + Main Research) ── */}
      <div className="bk-body">
        <aside className="bk-sidebar">
          <div className="bk-reveal">
            <p className="bk-section-label">Education</p>
            {EDUCATION.map((edu) => (
              <div key={edu.school} className="bk-entry">
                <p className="bk-entry-title">{edu.school}</p>
                <p className="bk-entry-sub">{edu.degree}</p>
                <p className="bk-entry-date" style={edu.active ? { opacity: 0.7, fontStyle: 'normal' } : undefined}>
                  {edu.period}
                </p>
              </div>
            ))}
          </div>
          <div className="bk-reveal">
            <p className="bk-section-label">Compact Skills</p>
            {HARD_SKILLS.map((skill) => (
              <div key={skill.label} className="bk-skill-group">
                <p className="bk-skill-group-title">{skill.label}</p>
                <p className="bk-skill-group-text">{skill.items.join(' · ')}</p>
              </div>
            ))}
          </div>
          <div className="bk-reveal">
            <p className="bk-section-label">Leadership &amp; Achievements</p>
            <ul className="bk-achievement-list">
              {ACHIEVEMENTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="bk-main">
          <section className="bk-reveal">
            <h2 className="bk-block-title">Professional Summary</h2>
            <p className="bk-summary-text">
              2nd Year B.A. LL.B. (Hons.) student at Alliance University with a strong interest in corporate
              transactional law, contract law, and commercial dispute resolution. Skilled in legal research, contract
              drafting and analysis, and written advocacy through academic legal projects, an independent drafting
              portfolio of <strong>15 documents</strong>, and moot court participation. Seeking internship
              opportunities at corporate law firms to develop transactional and advisory skills across M&amp;A,
              commercial contracts, and regulatory practice.
            </p>
          </section>

          <section className="bk-reveal">
            <h2 className="bk-block-title">Projects</h2>
            <div className="bk-hover-card relative overflow-hidden group">
              <div 
                className="bk-hover-image-reveal"
                style={{ 
                  backgroundImage: "url('/images/founding_note.jpg')",
                }}
              />
              <div className="bk-hover-content relative z-10">
                <p className="bk-project-tag">Active Core Initiative</p>
                <h3 className="bk-project-name">The National Legal Observatory</h3>
                <p className="bk-project-desc">
                  An independent research platform dedicated to tracking India&apos;s constitutional law,
                  digital surveillance policies, and judicial updates with rigorous, primary-source analysis.
                </p>
                <Link href="/about" className="bk-research-link">View Founder&apos;s Note →</Link>
              </div>
            </div>
          </section>

          <section className="bk-reveal">
            <h2 className="bk-block-title">Legal Research &amp; Projects</h2>
            <div className="bk-research-block bk-research-block-first">
              <div className="bk-research-header">
                <p className="bk-research-title">
                  Independent Legal Drafting Portfolio
                  <span style={{ marginLeft: 8, opacity: 0.55, fontWeight: 400 }}>· 15 docs</span>
                </p>
                <div className="bk-research-links">
                  <a href="mailto:bhoomija.k2810@gmail.com?subject=Request%20for%20Legal%20Drafting%20Portfolio" className="bk-research-link">
                    Request Portfolio ↗
                  </a>
                </div>
              </div>
              <ul className="bk-bullet-list">
                {DRAFTING_ITEMS.map((item) => (
                  <li key={item.label}><strong>{item.label}:</strong> {item.text}</li>
                ))}
              </ul>
            </div>

            <div className="bk-research-block">
              <p className="bk-research-title">Indemnity Agreement Drafting Project</p>
              <ul className="bk-bullet-list">
                <li>Drafted a comprehensive Real Estate Indemnity Agreement governed by Karnataka law.</li>
                <li>Applied principles of contractual risk allocation — Transfer of Property Act, 1882 &amp; Karnataka Stamp Act, 1957.</li>
                <li>Analysed standard indemnity frameworks to ensure alignment with industry drafting practices.</li>
                <li>Demonstrated understanding of indemnity provisions with warranties, representations, and dispute resolution clauses.</li>
              </ul>
            </div>

            <div className="bk-hover-card relative overflow-hidden group">
              <div 
                className="bk-hover-image-reveal"
                style={{ 
                  backgroundImage: "url('/images/propaganda.jpg')",
                }}
              />
              <div className="bk-hover-content relative z-10">
                <div className="bk-research-header">
                  <p className="bk-research-title" style={{ marginBottom: '8px' }}>Research Paper: Gender, Propaganda, and Patriarchal Power in Indian Politics</p>
                </div>
                <ul className="bk-bullet-list">
                  <li>Conducted socio-legal research using critical discourse analysis methodology.</li>
                  <li>Examined political narratives, media representation, and gendered rhetoric in democratic institutions.</li>
                </ul>
              </div>
            </div>

            <div className="bk-research-block">
              <p className="bk-research-title">Moot Courts, Debates &amp; Advocacy</p>
              <ul className="bk-bullet-list">
                <li>Participated in intra-university Moot Court competitions — legal argumentation, case preparation, oral advocacy.</li>
                <li>Represented India at an international debate competition in the United Kingdom.</li>
                <li>Participated in Mock Parliament as Finance Minister at High School, demonstrating legislative and policy understanding.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* ── QUOTE BAND ── */}
      <section className="bk-quote-band bk-reveal">
        <blockquote className="bk-quote-text">
          &ldquo;Independent legal observation is not a luxury — it is the minimum condition
          for democratic accountability.&rdquo;
        </blockquote>
        <p className="bk-quote-attr">Bhoomija Khanna · Founding Note · National Legal Observatory</p>
      </section>

    </div>
  );
}
