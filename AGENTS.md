<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# National Legal Observatory (NLO) Rules & Conventions (Knowledge Base for OpenClaw & Autonomous Agents)

## 1. Domain & Environment Routing
- **Active Production Domain**: Always use `https://legal-observatory.vercel.app`.
- **Never use placeholders or unconfigured domains**: `thenlo.org` is not configured. All email dispatches, external shares, and metadata links must strictly target `https://legal-observatory.vercel.app`.
- **Local Dev Server**: Runs on port `3002` (`http://localhost:3002`).

## 2. Monthly Review Release Cadence & Embargo Protocol
- **Standard Cadence**: Every Monthly Legal Review issue goes live on the **27th of each month at 6:30 PM IST** (`YYYY-MM-27T18:30:00+05:30`) unless explicitly configured otherwise via frontmatter `publishAt`.
- **Editorial Embargo Rules (Prior to Launch Time)**:
  - Hidden from the `/publications` archive catalogue, format filters, categories, and search index.
  - Frontmatter must include `publishAt: "YYYY-MM-DDTHH:MM:SS+05:30"`.
  - The homepage and direct article URLs render the dynamic countdown timer with animated flip digits.
  - At zero seconds (`00:00:00`), the countdown automatically triggers an unveil animation and renders the publication content without requiring a manual browser refresh.
  - **Local/Admin Preview**: Adding `?preview=true` or `?preview=1` to the publication URL bypasses the countdown for editorial and design reviews.

## 3. 5-Minute Subscriber Early Access Backdoor Link
- **Mechanism**:
  - The release email sent to registered subscribers contains a cryptographic early-access backdoor link:
    `https://legal-observatory.vercel.app/publications/research/<slug>?token=<HMAC_TOKEN>&ref=email`
  - Tokens are calculated using HMAC-SHA256 over `early-access-<slug>` with `CMS_SESSION_SECRET` or fallback static salt.
  - Unlocks the article **5 minutes before the public embargo clock** ($[T_{\text{publish}} - 5\text{m}, T_{\text{publish}}]$).
- **Anti Copy-Paste & Tamper Protection**:
  - If a link is opened without the valid token and `ref=email`/`newsletter` parameter while under embargo, the server intercepts the request and serves a dedicated **"Publication Not Available"** error screen with a return button to the countdown clock.

## 4. Editorial Voice & Prose Standards
- **Founder & Research Director**: All observatory publications, editorial dispatches, and research articles are authored by **Bhoomija Khanna** (NLO Founder & Chief Editor).
- Do not use generic placeholders like "Observatory Scholar"; always default author links and profile avatars to Bhoomija Khanna (`/bhoomija`).
- **No Inline Numeric Citation Badges**: Do not inject bracketed numbers (`[[1]]`, `[[2]]`, `[1]`) into article paragraphs or headings. Case citations (e.g. `2026 INSC 1009`, `(2017) 10 SCC 1`) are woven organically into prose.
- **Reference Section**: Full URLs, source reporting, and primary judgment links are compiled under the `## REFERENCES` section at the end of the markdown document.
- **Tooling on Article Page**: Every publication includes:
  - Download PDF button (`<PrintPDFButton />`) in the header metadata row.
  - Citation Generator modal (`<CiteSection />`) supporting Bluebook, MLA, and APA formats.
  - Floating Dynamic Table of Contents (`<TableOfContents />`) with scroll-spy tracking.

## 5. Referral & WhatsApp Deep-Linking
- WhatsApp share buttons in emails and UI must link to:
  `https://legal-observatory.vercel.app/about#:~:text=Subscribe%20to%20receive%20bi%2Dweekly%20legal%20alerts%2C%20recent%20publications%2C%20case%20reviews%2C%20and%20editorial%20commentaries%20directly%20in%20your%20inbox.`
- Uses native scroll-to-text fragment to automatically scroll to the Newsletter Subscription form on the `/about` page and highlight the subscription text.

