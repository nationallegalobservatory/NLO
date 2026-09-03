# NLO CMS — Authentication Setup

This guide walks you through getting the Editorial CMS (`/cms`) working locally and in production. Follow it **in order** — each step is required.

**Time estimate:** 15–25 minutes for a fresh setup.

---

## What the CMS actually is

A passwordless magic-link system. No passwords, no JWT juggling. You:

1. Visit `/cms/login` and enter your email
2. Server looks you up in `cms_users` table → if you exist, it emails a one-time link
3. Click the link → server validates the token, sets an HMAC-signed session cookie, redirects you to `/cms/dashboard`
4. Cookie is `httpOnly`, `sameSite=lax`, `secure` in prod, **14-day TTL**

The session is server-signed with `CMS_SESSION_SECRET` (HMAC-SHA256). No external auth provider needed.

---

## TL;DR — Quick start (if you already have a Supabase project)

```bash
# 1. Copy the env template
cp .env.cms.example .env.local

# 2. Fill in 3 required vars in .env.local:
#    - CMS_SESSION_SECRET=$(openssl rand -hex 32)
#    - NEXT_PUBLIC_SUPABASE_URL=https://YOUR.supabase.co
#    - SUPABASE_SERVICE_ROLE_KEY=ey...service_role
#    - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ey...anon

# 3. Run the SQL migration
#    → Supabase Dashboard → SQL Editor → paste supabase/cms/001_cms_users.sql → Run

# 4. Seed your admin user
psql "$DATABASE_URL" -c "INSERT INTO cms_users (email, name, role) VALUES ('you@example.com', 'Your Name', 'owner');"
# OR just do it in the Supabase SQL editor.

# 5. Start the dev server
npm run dev

# 6. Go to http://localhost:3000/cms/login
#    Enter your email → check inbox (or terminal logs in dev) → click the link.
```

That's it. If anything below is unclear, the **Detailed walkthrough** section covers each step.

---

## Detailed walkthrough

### Step 1 — Create a Supabase project (skip if you have one)

1. Go to https://supabase.com/dashboard and sign in
2. **New project** → name it (`nlo-prod` or `nlo-dev`) → set a strong DB password → pick the **closest region** to your users (Mumbai/Singapore for India)
3. Wait ~2 min for the project to provision
4. Once ready, go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`) → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (click "Reveal" then copy — **this is a secret, never commit it**) → this is `SUPABASE_SERVICE_ROLE_KEY`
   - **anon / publishable key** → this is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

> ⚠️ The `service_role` key **bypasses Row Level Security**. It must only ever live in `.env.local` (or Vercel env vars) and never in any client-side code or git history.

### Step 2 — Copy the env template

```bash
cd /path/to/NLO
cp .env.cms.example .env.local
```

Then edit `.env.local` and set at minimum:

```env
# Generate this with: openssl rand -hex 32
CMS_SESSION_SECRET=replace_me_with_a_long_random_string_min_32_chars

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...service_role
```

The other vars (NVIDIA, Resend, etc.) are optional — only fill them in if you need the AI refactor or newsletter features. The CMS will work without them, just with a yellow "not fully configured" notice on the login page.

### Step 3 — Run the database migration

The CMS needs a `cms_users` table (and a few helper tables for uploads, send log, etc.). The migration is in `supabase/cms/001_cms_users.sql`.

1. In the Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Open `supabase/cms/001_cms_users.sql` in your editor, copy **all** of it, paste into the SQL Editor
4. Click **Run** (or Cmd/Ctrl+Enter)
5. You should see "Success. No rows returned" — that's good

> If you haven't run `supabase/schema.sql` yet, run that first. The CMS migration assumes the base schema is in place.

### Step 4 — Create your first admin user

You need to insert a row into `cms_users` with your email. The CMS uses the `role` column to gate access (`owner` > `editor` > `viewer`).

In the same Supabase SQL Editor:

```sql
INSERT INTO cms_users (email, name, role)
VALUES ('your.email@example.com', 'Your Name', 'owner');
```

Use **the same email you'll sign in with**. The magic-link endpoint will silently reject any email that isn't in this table (no account-enumeration).

For multiple admins:

```sql
INSERT INTO cms_users (email, name, role) VALUES
  ('you@example.com', 'You', 'owner'),
  ('teammate@example.com', 'Teammate', 'editor');
```

### Step 5 — Start the dev server

```bash
npm run dev
```

Open http://localhost:3000/cms/login. The "CMS is not configured yet" yellow banner should be gone. Enter your email.

**Dev-mode behavior:** if you haven't set `RESEND_API_KEY`, the magic link will be **logged to your terminal** (look for the line that starts with `[cms/auth/magic] dev mode — magic link for ...`). Copy the URL and paste it into your browser.

**Production / email-enabled behavior:** if `RESEND_API_KEY` is set and `CMS_MAGIC_LINK_FROM` is configured to an address on a verified Resend domain, the link is emailed to you. Make sure your `CMS_MAGIC_LINK_FROM` address is on a domain you've verified in Resend.

### Step 6 — Test the full flow

1. Land on `/cms/login` → enter email → click "Send sign-in link"
2. Check terminal (dev) or inbox (prod) for the link
3. Click the link → you're redirected to `/cms/dashboard` with a session cookie set
4. The cookie `nlo-cms-session` is `httpOnly` and `secure` in production
5. Sign out: there's a "Sign out" button in the CMS header that calls `/api/cms/auth/logout`

---

## Dev-login shortcut (local only)

For fast iteration, you can bypass email entirely:

```bash
# In your browser, visit:
http://localhost:3000/api/cms/auth/dev-login
# or with custom email:
http://localhost:3000/api/cms/auth/dev-login?email=you@example.com&name=Your+Name&role=owner
```

This signs a session cookie and redirects to `/cms/dashboard` without touching Supabase. **Disabled in production** unless `ENABLE_DEV_LOGIN=true` is explicitly set. Don't enable it in prod.

---

## Troubleshooting

### "CMS is not configured yet" banner on login page
One of `CMS_SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` is missing from `.env.local`. Check the file exists and is loaded — restart `npm run dev` after editing env.

### Magic link email not arriving
- **Dev mode:** the link is logged to the terminal. Look for `[cms/auth/magic] dev mode`.
- **Prod mode:** check Resend dashboard for delivery logs. Make sure `CMS_MAGIC_LINK_FROM` is a verified sender in Resend. Check spam folder.
- **Always:** check the server logs for `[cms/auth/magic] resend failed` or `BAD_EMAIL` / `DB_ERROR`.

### "That sign-in link is no longer valid" / "expired"
Magic links expire in 15 minutes and are single-use. Request a new one.

### Login page redirects immediately back to `/cms/login`
Session cookie isn't being set. Check:
- Are you on `http://localhost:3000` (not `127.0.0.1` or a different port)? The cookie is `path=/`.
- Is `secure: true` accidentally on in dev? It shouldn't be (it only flips in `NODE_ENV=production`).
- Check browser devtools → Application → Cookies → is `nlo-cms-session` present?

### "permission denied for table cms_users"
The service role key isn't being read. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in `.env.local` (no extra spaces, no quotes wrapping the value unless quoted consistently).

### SQL migration fails
- If `gen_random_uuid()` is unknown: your Postgres needs the `pgcrypto` extension. Run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.
- If `newsletter_subscribers` doesn't exist: run `supabase/schema.sql` first, then the CMS migration.

---

## Production checklist

- [ ] `CMS_SESSION_SECRET` is a 32+ byte random string, **different from dev**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is the production project's service role key
- [ ] `RESEND_API_KEY` is set and `CMS_MAGIC_LINK_FROM` is on a verified domain
- [ ] `ENABLE_DEV_LOGIN` is **not** set in production env
- [ ] All CMS users exist in `cms_users` table with correct `role`
- [ ] Cookie is `secure: true` (happens automatically when `NODE_ENV=production`)
- [ ] Supabase project has the `cms_users` table (run the migration in prod project, not just dev)

---

## Architecture recap

```
User → /cms/login (form)
  → POST /api/cms/auth/magic
    → Look up email in cms_users
    → If found: generate 32-byte token, store SHA-256 hash in cms_users.magic_link_token
    → Email link (Resend) OR log to terminal (dev)
  → User clicks link
  → GET /api/cms/auth/callback?token=...
    → Hash the token, look up cms_users
    → Validate expiry, consume token (one-time use)
    → Sign HMAC session payload (email, name, role, exp)
    → Set nlo-cms-session cookie
    → Redirect to /cms/dashboard
  → /cms/layout.tsx reads session via readSession()
    → If no session: redirect to /cms/login
    → If session: render admin UI
```

The session is server-only — there's no client-side auth state. Every page does a server-side cookie read.

---

## Files that matter

| File | Role |
|---|---|
| `src/lib/cms/session.ts` | Sign/verify session cookie, HMAC-SHA256 |
| `src/lib/cms/supabaseAdmin.ts` | Server-only Supabase client (service role) |
| `src/app/api/cms/auth/magic/route.ts` | Issue magic link |
| `src/app/api/cms/auth/callback/route.ts` | Validate token, set session |
| `src/app/api/cms/auth/dev-login/route.ts` | Local-only shortcut |
| `src/app/cms/login/page.tsx` | Login form + error display |
| `src/app/cms/layout.tsx` | Gates every /cms/* page on session |
| `supabase/cms/001_cms_users.sql` | DB migration (tables + RLS) |
| `.env.cms.example` | Template for `.env.local` |

---

Last reviewed: 2026-09-03. If anything in this doc is out of date with the code, the code is the source of truth — fix the doc.
