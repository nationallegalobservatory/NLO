# 📚 Content Architecture & Publishing Guidelines

All editorial, research, and analysis content for the **National Legal Observatory** lives in this directory.

---

## 📂 Directory Layout

```
content/
├── 📁 research/       # Comprehensive research papers & Monthly Legal Reviews
├── 📁 opinions/       # Editorial commentaries, op-eds, and columns
├── 📁 authors/        # JSON author profiles and biographical data
└── 📄 categories.json # Category color codes, badges, and URL slug mappings
```

---

## 📝 Article Frontmatter Schema

Every Markdown file in `content/research/` or `content/opinions/` must follow this schema:

```yaml
---
title: "Monthly Legal Review — Vol. 1 | Issue 3 (August 2026)"
slug: "monthly-legal-review-august-2026"
date: "2026-08-27"
publishAt: "2026-08-27T18:30:00+05:30"   # Optional: For embargoed releases (hidden before this time)
category: "research"                     # research | opinions | analysis
author:
  name: "Bhoomija Khanna"
  role: "Founder & Chief Editor"
  avatar: "/images/bhoomija-avatar.png"
  slug: "bhoomija"
summary: "Supreme Court governance in Jojari river contamination, S.196 CrPC defamation quashing, Bar Council gender co-option, and Monsoon Session 2026."
readingTime: "18 min read"
tags: ["Supreme Court", "Constitutional Law", "Environmental Law", "Parliament"]
format: "Monthly Review"                 # Format badge shown across observatory
---
```

---

## ⏳ Editorial Embargo Engine

When `publishAt` is specified:
- If `publishAt > Current Time`, the publication is hidden from `/publications`, category filters, and search indexing.
- Direct navigation to `/publications/[category]/[slug]` renders the sealed countdown screen.
- At zero seconds, the client seamlessly unlocks and reveals the article live in the browser without requiring a page refresh.
