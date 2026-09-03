# NLO — Deployment Guide

Production deploy guide for the NLO (National Legal Observatory) site + Editorial CMS. Optimized for **Vercel** (zero-config for Next.js) + **Supabase** (managed Postgres + auth).

---

## Stack

- **Framework:** Next.js 16.2.7 (App Router, Turbopack)
- **UI:** React 19.2.4, Tailwind CSS 4, Radix UI, Framer Motion, GSAP
- **Auth:** Custom HMAC session cookies + Supabase (service role for backend)
- **Database:** Supabase (Postgres)
- **Email:** Resend (magic links, newsletters)
- **LLM:** NVIDIA NIM primary, OmniRoute local router, Google + OpenAI as fallbacks
- **PWA:** Custom service worker via `workbox-build`

---

## One-time setup (15 min)

### 1. Supabase production project

1. Create a new Supabase project (separate from dev): `nlo-prod`
2. Region: **Mumbai** (`ap-south-1`) for India latency
3. Plan: **Pro** is fine for production (Free tier is OK for staging)
4. Run the migrations **in order**:
   ```sql
   -- In Supabase SQL Editor, run these in sequence:
   supabase/schema.sql
   supabase/cms/001_cms_users.sql
   ```
5. Create your admin user:
   ```sql
   INSERT INTO cms_users (email, name, role)
   VALUES ('your.email@thenlo.org', 'Your Name', 'owner');
   ```
6. Copy the API credentials from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (treat as secret)

### 2. Resend setup (for magic-link emails + newsletters)

1. Sign up at https://resend.com
2. Add and verify your sending domain (e.g. `thenlo.org`)
3. Copy the API key → `RESEND_API_KEY`
4. Configure sender addresses:
   - `CMS_MAGIC_LINK_FROM=NLO CMS <cms@thenlo.org>` (for login links)
   - `NEWSLETTER_FROM=National Legal Observatory <hello@thenlo.org>` (for newsletters)
5. Make sure both addresses are on the verified domain in Resend

### 3. LLM provider (at least one)

The site has AI features (article refactor, search) that need an LLM. Set **at least one** of:

- **NVIDIA NIM (recommended — has free tier):** https://build.nvidia.com
  ```env
  NVIDIA_API_KEY=nvapi-...
  ```
- **OmniRoute (local router, free if you have GPUs):** run the daemon on a machine with GPUs
  ```env
  OMNIROUTE_URL=http://YOUR_SERVER:20128/v1
  OMNIROUTE_API_KEY=
  OMNIROUTE_DEFAULT_MODEL=if/kimi-k2-thinking
  ```
- **Google Gemini:** https://aistudio.google.com/app/apikey
  ```env
  GOOGLE_GENERATIVE_AI_API_KEY=...
  GOOGLE_DEFAULT_MODEL=gemini-2.5-flash
  ```
- **OpenAI:** https://platform.openai.com/api-keys
  ```env
  OPENAI_API_KEY=sk-...
  OPENAI_DEFAULT_MODEL=gpt-4o-mini
  ```

The provider fallback chain in `src/lib/cms/providers.ts` will try them in order. Pick at least one or AI features will silently no-op.

---

## Vercel deploy

### Option A — One-click via GitHub (recommended)

1. Push the NLO repo to GitHub (if not already)
2. Go to https://vercel.com/new
3. **Import** the NLO repository
4. Vercel will auto-detect Next.js and prefill:
   - Build command: `npm run build` (already correct)
   - Output dir: `.next` (default)
   - Install command: `npm install`
5. **Before clicking Deploy**, expand **Environment Variables** and add all the vars from step 1–3 above
6. Click **Deploy**
7. After deploy: **Settings → Domains** to add `thenlo.org` and `www.thenlo.org`

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
cd /path/to/NLO
vercel
# Follow the prompts, then:
vercel env add CMS_SESSION_SECRET production
# (paste value, repeat for every env var)
vercel --prod
```

### Required Vercel env vars

| Name | Required | Notes |
|---|---|---|
| `CMS_SESSION_SECRET` | ✅ | `openssl rand -hex 32` — **must be different from dev** |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret**, service role — never expose to client |
| `RESEND_API_KEY` | ⭕ | Required for magic-link login in prod |
| `CMS_MAGIC_LINK_FROM` | ⭕ | e.g. `NLO CMS <cms@thenlo.org>` |
| `NEWSLETTER_FROM` | ⭕ | e.g. `National Legal Observatory <hello@thenlo.org>` |
| `NVIDIA_API_KEY` | ⭕ | Primary LLM |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ⭕ | Fallback LLM |
| `GOOGLE_DEFAULT_MODEL` | ⭕ | e.g. `gemini-2.5-flash` |
| `OPENAI_API_KEY` | ⭕ | Fallback LLM |
| `OPENAI_DEFAULT_MODEL` | ⭕ | e.g. `gpt-4o-mini` |
| `OMNIROUTE_URL` | ⭕ | Local router URL |
| `OMNIROUTE_API_KEY` | ⭕ | |
| `OMNIROUTE_DEFAULT_MODEL` | ⭕ | |
| `ENABLE_DEV_LOGIN` | ❌ | **Never set in prod** — exposes auth bypass |

> **Public vars** (prefixed `NEXT_PUBLIC_`) are inlined into the JS bundle. They're safe to expose (URL + anon key) but **service role** must NEVER be `NEXT_PUBLIC_`.

### Vercel build settings

The default Vercel Next.js preset works. If you need to override:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Build Command | `npm run build` (which runs `pwa:build` first to generate the service worker) |
| Output Directory | `.next` (default) |
| Install Command | `npm install --legacy-peer-deps` (if peer-dep conflicts) |
| Node Version | 20.x (or `22.x` if `engines` requires it) |

### Vercel cron jobs

The CMS has scheduled routes under `/api/cron/*` for:
- `send-article-live-all` — publishes scheduled articles
- `send-welcome-all` — sends welcome emails to new subscribers
- `send-weaponization-live-all` — newsletter send automation
- `send-reminders` — daily reminder digests

Add these to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/send-article-live-all", "schedule": "0 * * * *" },
    { "path": "/api/cron/send-welcome-all", "schedule": "0 9 * * *" },
    { "path": "/api/cron/send-weaponization-live-all", "schedule": "0 10 * * *" },
    { "path": "/api/cron/send-reminders", "schedule": "0 8 * * *" }
  ]
}
```

**Note:** Vercel cron on the Hobby plan is limited to 2 jobs/day. Upgrade to Pro for more.

---

## Domain + DNS

For `thenlo.org` (replace with your real domain):

1. **Vercel:** Settings → Domains → add `thenlo.org` and `www.thenlo.org`
2. **DNS provider:** add the records Vercel shows you:
   - `A` record: `@` → `76.76.21.21` (Vercel's IP)
   - `CNAME`: `www` → `cname.vercel-dns.com`
3. Wait for DNS to propagate (usually <30 min)
4. Vercel auto-issues a Let's Encrypt SSL cert

For the **Supabase** custom domain (if you want `db.thenlo.org`):
- Supabase Pro plan supports custom DB domains
- Otherwise just use the default `*.supabase.co` URL

For **Resend** (so magic links come from `@thenlo.org`):
- Add `thenlo.org` to Resend → verify via DNS records they give you

---

## Post-deploy verification

After first deploy, walk through this checklist:

- [ ] Site loads at `https://thenlo.org` (HTTP 200)
- [ ] All 4 cron jobs visible in Vercel dashboard
- [ ] CSP headers present (check via `curl -I https://thenlo.org`)
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] `/cms/login` loads without "CMS not configured" banner
- [ ] Magic link sign-in works end-to-end (check Resend for delivery)
- [ ] `/cms/dashboard` accessible after sign-in
- [ ] Article refactor (if LLM configured) works on a test article
- [ ] Newsletter subscribe form works
- [ ] All `NEXT_PUBLIC_*` vars are set in Vercel dashboard
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` leak — grep the built bundle just in case:
  ```bash
  vercel build
  # locally:
  grep -r "service_role" .next/static/ || echo "OK: no service_role in client bundle"
  ```

---

## Monitoring + ops

### Logs
- **Vercel:** real-time function logs in the dashboard
- **Supabase:** Postgres logs, API logs in dashboard
- **Resend:** email delivery logs in dashboard

### Backups
- **Supabase Pro:** daily automated backups, 7-day retention
- **Content:** The `content/` folder is bundled into the build via `outputFileTracingIncludes` in `next.config.ts`. To back up: `git push` (content is in git) + Supabase `cms_*` table dumps.

### Scaling
- **Vercel:** auto-scales. Cold starts on Hobby plan can be ~1–2s on first request.
- **Supabase:** Free → Pro when you hit 500MB DB or 1GB egress.
- **Resend:** Free tier is 100 emails/day, 3,000/month. Pro is $20/mo for 50k.

### Cost estimate (low traffic, <10k visitors/mo)
- Vercel Hobby: **$0** (or Pro $20/mo for cron jobs + custom domain SSL)
- Supabase Free: **$0** (or Pro $25/mo for backups + better performance)
- Resend Free: **$0** (up to 100 emails/day)
- Domain: **~$12/year**
- **Total: $0–$45/month** for a small production site

---

## Rollback

If a deploy breaks:

```bash
# Via Vercel CLI
vercel rollback
# Or in the dashboard: Deployments → click a previous one → Promote to Production
```

Database rollbacks are manual — keep migration files immutable and never edit a migration that's been applied. Add a new migration to undo changes.

---

## Environment parity

Keep these in sync between dev and prod:
- Node version (use `.nvmrc` to pin: `20` or `22`)
- Supabase schema (run all migrations in both envs)
- `package.json` versions (use `package-lock.json` and don't `npm update` blindly)
- `engines.node` in package.json (set to match Vercel's default runtime)

---

## Files that matter for deploys

| File | Why it matters |
|---|---|
| `vercel.json` | Cron schedule, region overrides |
| `next.config.ts` | `outputFileTracingIncludes` for content, CSP headers |
| `package.json` | `engines`, scripts |
| `tsconfig.json` | Strict mode is on — type errors block builds |
| `.env.cms.example` | Template for required env vars |
| `supabase/*.sql` | DB schema migrations |
| `src/lib/cms/session.ts` | Cookie security (httpOnly, secure flag in prod) |
| `src/lib/cms/supabaseAdmin.ts` | Service-role client — keep server-only |

---

Last reviewed: 2026-09-03.
