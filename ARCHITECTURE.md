# 🏛 National Legal Observatory (NLO) — System Architecture

Welcome to the **National Legal Observatory** codebase. This document is written in human terms to provide a comprehensive, transparent map of how every subsystem, directory, data pipeline, design token, and release mechanism operates.

---

## 🧭 Repository Blueprint & Mental Model

```
NLO/
├── 📁 content/                # All editorial, research, and author markdown/JSON data
│   ├── 📁 research/           # In-depth legal research & Monthly Reviews (.md)
│   ├── 📁 opinions/           # Editorial dispatches and op-eds (.md)
│   ├── 📁 authors/            # Editorial board & author biographies (.json)
│   └── 📄 categories.json     # Taxonomy definitions, colors, and badge metadata
│
├── 📁 emails/                 # Production-ready, client-tested responsive HTML newsletters
│   ├── 📁 templates/          # Reusable email templates (welcome, bulletins)
│   ├── 📁 campaigns/          # Monthly Review issue teasers & live launch emails
│   └── 📄 README.md           # Email system documentation & dispatch guide
│
├── 📁 scripts/                # Utility and automation tooling
│   ├── 📄 generate-sw.mjs     # Offline PWA service worker generator
│   ├── 📄 send-launch-mail.js # Node.js script to dispatch launch email via Gmail/Supabase
│   ├── 📄 send-teaser-mail.js # Node.js script to dispatch teaser email via Gmail/Supabase
│   └── 📄 list-subscribers.js # Fast query tool for active newsletter subscribers
│
├── 📁 public/                 # Static assets served directly at root
│   ├── 📁 images/             # Author avatars, article figures, and infographics
│   ├── 📁 fonts/              # Custom typography and web fonts
│   └── 📄 manifest.json       # Progressive Web App manifest
│
├── 📁 src/                    # Core Next.js 16 Application source code
│   ├── 📁 app/                # App Router: Pages, Layouts, Dynamic Routes & API Endpoints
│   ├── 📁 components/         # Modular React UI components (Reader, Countdown, Cards)
│   └── 📁 lib/                # Business logic, Supabase client, and Markdown parser
│
├── 📁 docs/                   # Developer guides, feature roadmaps, and specifications
│   └── 📄 AUTOPILOT_ROADMAP.md# Feature roadmap and architectural enhancements
│
├── 📄 AGENTS.md               # AI pairing rules, monthly release cadence & attribution laws
└── 📄 package.json            # Node.js dependencies, scripts, and build configuration
```

---

## 🔄 1. Content & Editorial Release Lifecycle

### The Monthly Cadence Rule
Every **Monthly Legal Review** goes live on the **27th of each month at 6:30 PM IST** (`YYYY-MM-27T18:30:00+05:30`).

### Strict Editorial Embargo Engine
Before 6:30 PM IST on the 27th:
1. **Frontmatter Parameter**: The article includes `publishAt: "2026-08-27T18:30:00+05:30"`.
2. **Catalogue Invisibility**: [src/lib/markdown.ts](file:///Users/utkarshmanitripathi/Documents/GitHub/NLO/src/lib/markdown.ts) filters out all articles where `publishAt > Date.now()`. They do not appear in `/publications`, category filters, format selectors, or search results.
3. **Direct URL Protection**: Navigating directly to the article URL renders [DynamicReleaseCountdown.tsx](file:///Users/utkarshmanitripathi/Documents/GitHub/NLO/src/components/DynamicReleaseCountdown.tsx) in sealed countdown mode.
4. **Zero-Refresh Live Unveil**: The moment the client timer reaches zero, the component automatically unlocks and renders the full publication live in the browser without requiring a page refresh.

---

## 🎨 2. Design System & Typography Tokens

NLO employs a high-contrast editorial legal palette:

| Token | Value / Font | Description |
|---|---|---|
| **Oxblood (Primary)** | `#561922` | Brand identity, primary headers, key CTA buttons |
| **Parchment Background** | `#F6F3EE` / `#FAF8F5` | Warm, readable paper-like reading canvas |
| **Obsidian (Text)** | `#111111` / `#1A1A1A` | High-contrast editorial typography |
| **Gold / Sand Accent** | `#D8A580` / `#C5A880` | Metadata badges, issue labels, dividers |
| **Editorial Serif** | `Newsreader`, `Georgia`, serif | Article body, publication titles, longform essays |
| **Technical Sans** | `-apple-system`, `Inter`, sans-serif | Navigation, metadata labels, search interfaces |
| **Monospace** | `SF Mono`, `Monaco`, monospace | Citations, statute numbers, case identifiers |

---

## 👩‍⚖️ 3. Author & Editorial Attribution

- **Founder & Research Director**: **Bhoomija Khanna** (`/bhoomija`).
- All observatory dispatches, monthly reviews, and editorial commentaries are attributed to Bhoomija Khanna.
- Author avatars use circular framing with oxblood outlines ([public/images/bhoomija-avatar-circle.png](file:///Users/utkarshmanitripathi/Documents/GitHub/NLO/public/images/bhoomija-avatar-circle.png)).

---

## 📧 4. Newsletter & Communication Subsystem

All email campaigns are crafted with inline CSS compatible with Gmail, Apple Mail, Outlook, and mobile clients:

1. **Teaser Email** ([emails/campaigns/monthly-review-2026-08-teaser.html](file:///Users/utkarshmanitripathi/Documents/GitHub/NLO/emails/campaigns/monthly-review-2026-08-teaser.html)):
   - Zero spoilers.
   - Title, issue number, release timestamp, circular avatar, and CTA to live countdown.
2. **Launch Email** ([emails/campaigns/monthly-review-2026-08-launch.html](file:///Users/utkarshmanitripathi/Documents/GitHub/NLO/emails/campaigns/monthly-review-2026-08-launch.html)):
   - Concise 4-topic summary (Judgment of the Month, Constitutional Watch, Legislative Tracker, Policy Pulse).
   - Direct clickable deep link to the exact showcase line.
3. **Automated Dispatch**:
   - Run via [scripts/send-launch-mail.js](file:///Users/utkarshmanitripathi/Documents/GitHub/NLO/scripts/send-launch-mail.js) or copy-pasted directly into Gmail web compose.

---

## ⚙️ 5. Technology Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Styling**: Tailwind CSS + Custom CSS Variables
- **Backend / Database**: Supabase PostgreSQL (`newsletter_subscribers`, `contacts`, `citation_requests`)
- **PWA & Offline**: Custom Service Worker (`scripts/generate-sw.mjs`) caching offline issues
- **Hosting & CI/CD**: Vercel production deployment (`https://legal-observatory.vercel.app`)
