# NLO Editorial CMS

A private dashboard for Bhoomija (and any future editors) to run the National Legal Observatory end-to-end: upload research → AI-refactor into NLO format → edit → publish → email the newsletter.

Built **inside the existing NLO Next.js app** as a route group at `/cms`. No new deployment, no new infra. Shares the existing Supabase, Resend, and Tailwind setup.

## What you can do

| Feature | Where |
| --- | --- |
| Magic-link sign-in (no password) | `/cms/login` |
| Dashboard with counts of drafts / scheduled / published / subscribers | `/cms/dashboard` |
| Upload PDF / DOCX / MD / TXT → auto-extract text → AI-refactor into NLO article format | `/cms/upload` |
| Article library with status filter (draft / review / scheduled / published / archived) | `/cms/articles` |
| Per-article editor: title, body, abstract, citation, tags, categories, cover, status, schedule | `/cms/articles/[slug]` |
| Newsletter subscriber upload (paste / CSV-style) | `/cms/newsletter` |
| Compose a campaign: subject, intro, attach articles, send now or schedule | `/cms/newsletter/compose` |
| Team management: owners invite editors / viewers (magic-link) | `/cms/settings` |

## What it does NOT do (deliberately)

- Doesn't push to Vercel. Runs locally with `npm run dev` for now.
- Doesn't host its own files. Uses your existing Supabase project.
- Doesn't replace the public site. The CMS writes to the same `articles` table the public site already reads.
- Doesn't break the existing NLO build. New code lives in `src/app/cms/**`, `src/app/api/cms/**`, `src/lib/cms/**`, `src/components/cms/**`, `supabase/cms/**`. Zero changes to existing files except `package.json` (two new deps: `mammoth`, `pdf-parse`).

## Setup (one-time)

### 1. Install the two new dependencies

```bash
cd /home/utkarsh/.openclaw-mac-backup/GitHub_backup/NLO
npm install mammoth pdf-parse
```

### 2. Run the CMS SQL migration

In the Supabase SQL editor, run:

```sql
-- (contents of supabase/cms/001_cms_users.sql)
```

This adds:
- `cms_users` (magic-link auth)
- `cms_uploads` (file upload + refactor tracking)
- `cms_send_log` (newsletter history)
- Extends `articles` with CMS workflow columns
- Extends `newsletter_subscribers` with source/tags/active

### 3. Create the Supabase storage bucket

In Supabase dashboard → Storage → **New bucket**:
- Name: `cms-uploads`
- Public: **false** (private — only signed-in CMS users read their own files)

### 4. Configure environment

```bash
cp .env.cms.example .env.local
# edit .env.local and fill in real values
```

At minimum:
- `CMS_SESSION_SECRET` — generate with `openssl rand -hex 32`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- One LLM provider (NVIDIA NIM is cheapest/free)
- `RESEND_API_KEY` for newsletter sends

### 5. Add Bhoomija as the first owner

In Supabase SQL editor:

```sql
INSERT INTO cms_users (email, name, role)
VALUES ('bhoomija.k2810@gmail.com', 'Bhoomija Khanna', 'owner');
```

(Then visit `/cms/login`, enter her email, and check the inbox for the magic link.)

### 6. Start the dev server

```bash
npm run dev
```

Visit:
- Public site: http://localhost:3000
- CMS: http://localhost:3000/cms

## Architecture

```
src/
  app/
    cms/                              # route group (protected)
      layout.tsx                      # auth guard via CmsShell
      login/page.tsx
      dashboard/page.tsx
      upload/page.tsx
      articles/page.tsx
      articles/[id]/page.tsx
      newsletter/page.tsx
      newsletter/compose/page.tsx
      settings/page.tsx
    api/cms/                          # JSON API (also protected by middleware)
      auth/{magic,callback,logout,invite}/route.ts
      upload/route.ts
      refactor/route.ts
      articles/[id]/route.ts
      subscribers/route.ts
      newsletter/route.ts
  lib/cms/
    session.ts                        # HMAC-signed cookie sessions
    supabaseAdmin.ts                  # service-role client
    providers.ts                      # NVIDIA NIM → OmniRoute → Google → OpenAI
    refactor.ts                       # the AI prompt + JSON parser
    extract.ts                        # PDF/DOCX/MD/TXT text extraction
  components/cms/
    CmsShell.tsx
    LoginForm.tsx
    UploadClient.tsx
    ArticleEditor.tsx
    SubscriberUpload.tsx
    ComposeClient.tsx
    SettingsClient.tsx
  middleware.ts                       # /cms/* + /api/cms/* auth guard
supabase/
  cms/001_cms_users.sql
.env.cms.example
```

## AI refactor flow

1. User uploads a file at `/cms/upload` (PDF / DOCX / MD / TXT).
2. `POST /api/cms/upload` extracts text (mammoth for DOCX, pdf-parse for PDF, pass-through for MD/TXT) and saves the original to Supabase Storage bucket `cms-uploads`. A `cms_uploads` row tracks the result.
3. User clicks **Refactor into NLO format**.
4. `POST /api/cms/refactor` calls the LLM with the NLO system prompt + the extracted text + the allowed category list. Output must be JSON matching the NLO article schema (frontmatter keys, body markdown, type-specific fields).
5. The new article is inserted into `articles` with `cms_status = 'draft'`. The original upload row is marked `refactored` with the new slug.
6. User goes to `/cms/articles/[slug]`, reviews, edits, and either saves as draft or schedules / publishes.

The refactor respects NLO's editorial rules:
- Default author is `bhoomija-khanna`.
- Monthly Review (`format: monthly-report`) publish times are snapped to the 27th at 18:30 IST.
- Categories are constrained to the existing taxonomy in `content/categories.json`.

## Multi-provider LLM

`src/lib/cms/providers.ts` calls the first available provider in this order:

1. **NVIDIA NIM** (`NVIDIA_API_KEY`) — primary. Free tier at https://build.nvidia.com.
2. **OmniRoute** (`OMNIROUTE_URL`) — local LLM router with 237+ free providers. If the daemon is running on `127.0.0.1:20128`, it transparently falls through free tiers.
3. **Google Gemini** (`GOOGLE_GENERATIVE_AI_API_KEY`).
4. **OpenAI** (`OPENAI_API_KEY`).

If the primary 429s or 5xxs, the next one is tried automatically. This is exactly the "free providers, switch on key exhaust" pattern you asked for — applied only to generative calls (refactor + future LLM features), not to anything that needs determinism.

## Newsletter send

`POST /api/cms/newsletter`:
- Builds an HTML email matching the NLO visual style (centered header, article cards with citation).
- Sends via Resend in batches of 50 (their per-call recipient limit).
- Logs every send to `cms_send_log` with `recipient_count`, `sent_count`, `failed_count`, `status`.
- Marks each attached article as `cms_newsletter_sent = true` so the same article isn't accidentally re-sent.

If `scheduleFor` is set, the row is inserted with `status = 'queued'` and `scheduled_for = <ISO>`. A separate cron route (NOT in this initial build — see TODOs) should poll `cms_send_log WHERE status = 'queued' AND scheduled_for <= NOW()` and dispatch the same way. Add that when ready.

## Local-only by design

The whole stack runs with `npm run dev` against your Supabase. No Vercel push, no production build, no edge cases. When you want to ship it, the only thing that changes is the deployment target — the code is Next.js native.

## TODOs (intentionally not in v1)

- [ ] Cover image upload (drag-drop) — currently paste a URL or drop into `public/`
- [ ] Cron route for scheduled newsletter sends (`/api/cron/send-newsletter`)
- [ ] Article preview that mirrors the public site styling
- [ ] Webhook to refresh the public Supabase search index after publish
- [ ] Diff view between successive saves
- [ ] Article scheduling UI polish (calendar widget)
