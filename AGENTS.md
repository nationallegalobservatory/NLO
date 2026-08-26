<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# National Legal Observatory (NLO) Rules & Conventions

## Monthly Review Release Cadence
- **Launch Date & Time**: Every Monthly Legal Review issue goes live on the **27th of each month at 6:30 PM IST** (`YYYY-MM-27T18:30:00+05:30`).
- **Editorial Embargo**: Prior to 6:30 PM IST on the 27th:
  - The monthly issue must remain hidden from the `/publications` catalogue, format filters, categories, and search index.
  - Frontmatter must include `publishAt: "YYYY-MM-27T18:30:00+05:30"`.
  - The homepage and direct article URLs display the dynamic countdown timer.
  - At zero seconds (6:30 PM IST on the 27th), the issue automatically unlocks and unveils live in the browser without requiring a page refresh.

## Editorial & Author Attribution
- **Founder & Research Director**: All observatory publications, editorial dispatches, and research articles are authored/handled by **Bhoomija Khanna** (NLO Founder & Chief Editor).
- Do not use generic placeholders like "Observatory Scholar"; always default author links and profile avatars to Bhoomija Khanna (`/bhoomija`).

