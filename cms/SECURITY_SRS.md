# NLO Editorial CMS — Security SRS & Engineering Implementation Plan

**Document status:** Turnkey implementation specification  
**Application:** National Legal Observatory (NLO)  
**Production origin:** `https://legal-observatory.vercel.app`  
**CMS surface:** `/cms/*` pages and `/api/cms/*` route handlers  
**Exclusive authorized identity:** Bhoomija Khanna — `bhoomija.k2810@gmail.com`  
**Target stack:** Next.js `16.2.7` App Router, React `19.2.4`, Supabase/PostgreSQL, Resend or SMTP

---

## 1. Purpose

This document specifies the security architecture, data model, API contracts, and implementation plan for a private, single-tenant Editorial CMS inside the existing NLO Next.js application.

The CMS is **not** a multi-user product. It is a private editorial back office for one authorized owner. The design goal is fail-closed authorization: if configuration, identity, token, session, database, or email transport cannot be verified, access is denied.

### 1.1 Current-state gap analysis

The repository already contains a partial CMS implementation:

- `src/app/cms/**` pages and `src/components/cms/**` UI.
- `src/app/api/cms/**` route handlers for auth, upload, refactor, articles, subscribers, and newsletter.
- `src/lib/cms/session.ts` HMAC cookie sessions.
- `src/lib/cms/supabaseAdmin.ts` service-role Supabase client.
- `src/middleware.ts` perimeter guard with an Origin/CSRF check.
- `src/lib/cms/audit.ts` and `src/lib/cms/rateLimit.ts` partial auth helpers.
- `supabase/cms/001_cms_users.sql` and `supabase/cms/002_cms_auth_gate.sql` initial CMS/auth tables.

The existing implementation is a useful base, but it does **not** yet satisfy the stricter requirements in this SRS:

| Gap | Current behavior | Required behavior |
|---|---|---|
| Identity scope | `cms_users` still allows `owner`/`editor`/`viewer`; invite endpoint can create users; `CMS_OWNER_EMAIL` is env-overridable and non-prod `CMS_DEV_EMAILS` can authorize extra identities | Code-constant single tenant only: one row, `bhoomija.k2810@gmail.com`, `role='owner'` |
| Magic response | Returns `{ ok: true }`, but only after an in-memory IP rate limit and still uses request origin for the emailed link | Always `{ ok: true }` for valid email-shaped requests; DB-backed IP+email limit; fixed `CMS_PUBLIC_ORIGIN` link |
| Rate limiting | In-memory per-IP sliding window only; not shared across serverless instances and does not key the owner email | DB-backed limit: 5 attempts / 15 min / IP hash and / email hash |
| Token storage | Hash is stored in ambiguously named `magic_link_token` column | Store only `magic_link_token_hash`; never raw token; atomic consume by hash match |
| Session payload | Signs `email.role.exp.nonce`, not the exact `base64url(payload)` segment; role is not constrained to `owner` | Sign exact `base64url(payload)` with HMAC-SHA256; accept only owner email + `role='owner'` |
| Cookie policy | `sameSite: 'strict'` now, but cookie helpers do not expose a single canonical option set for every response path | `httpOnly`, `secure` in production, `sameSite=strict`, `path=/`, 14-day TTL on every set/clear |
| Session identity | `isAuthorizedCmsEmail` allows dev emails outside production and does not force `role='owner'` | Production accepts only `bhoomija.k2810@gmail.com` + `role='owner'`; dev bypass cannot mint non-owner roles |
| Public origin | Magic link uses `req.nextUrl.origin` | Use fixed `CMS_PUBLIC_ORIGIN` to prevent Host-header token leakage |
| Next.js 16 guard | Uses deprecated `middleware.ts` convention | Use `src/proxy.ts` unless deliberately retaining legacy Edge middleware |
| Audit logging | `cms_auth_audit_logs` stores raw `email_attempted`, `ip_address`, `user_agent` | Store only HMAC-hashed email/IP/user-agent and token hash; no raw PII/secrets |
| RLS | `cms_users`/audit have deny-all policies, but `cms_uploads` still has owner-read policy and invite can write users | Deny-all RLS for CMS-private tables; service role only; DB constraint single owner |
| Dev login | Can mint owner-email sessions with `editor`/`viewer` role and is allowed in production when `ENABLE_DEV_LOGIN` is truthy | Production 403 unconditionally; dev only fixed owner identity behind explicit flag |
| Invite endpoint | Can create editor/viewer users | Remove or permanently disable |
| Local fallback | Several APIs fall back to local store when Supabase is missing | Fail closed unless explicit local-development flag is set |

---

## 2. Scope

### 2.1 In scope

- Passwordless magic-link authentication for the NLO Editorial CMS.
- Single-owner session issuance and verification.
- Edge/proxy perimeter protection for `/cms/*` and `/api/cms/*`.
- Supabase/PostgreSQL schema, RLS, seed data, audit logs, and distributed rate limiting.
- Transactional email dispatch for magic links.
- Logout and session invalidation behavior.
- Security regression and acceptance tests.

### 2.2 Out of scope

- Public user registration, password auth, OAuth, MFA, or multi-user CMS accounts.
- Subscriber-facing authentication.
- Public article rendering changes.
- Replacing Supabase Auth; this CMS uses an application-level magic-link protocol.
- Content migration or editorial workflow redesign beyond authorization hardening.

---

## 3. Definitions and identities

| Term | Definition |
|---|---|
| Owner | The only authorized CMS user: `bhoomija.k2810@gmail.com` |
| Magic link | Single-use, 15-minute sign-in URL containing a 256-bit random token |
| Token hash | SHA-256 hex digest of the raw magic-link token; only this is stored |
| Session token | `<base64url(payload)>.<base64url(hmac_sha256_signature)>` cookie value |
| Session cookie | `nlo-cms-session`, `httpOnly`, `secure` in production, `sameSite=strict`, `path=/`, 14-day TTL |
| Proxy guard | Next.js 16 request guard formerly called middleware; file convention is `src/proxy.ts` |
| Fail closed | Missing/invalid config, identity, token, or session denies access immediately |
| Audit log | Append-only record of auth events with hashed PII, never raw tokens |

### 3.1 Canonical constants

```ts
export const CMS_OWNER_EMAIL = 'bhoomija.k2810@gmail.com';
export const CMS_OWNER_NAME = 'Bhoomija Khanna';
export const CMS_SESSION_COOKIE = 'nlo-cms-session';
export const CMS_PUBLIC_ORIGIN = 'https://legal-observatory.vercel.app';
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const MAGIC_RATE_LIMIT = 5;
export const MAGIC_RATE_WINDOW_SECONDS = 15 * 60;
```

`CMS_OWNER_EMAIL` must be a code constant, not an environment variable. Environment variables may configure secrets and transports, but they must not be able to change the authorized identity.

---

## 4. Architecture

### 4.1 Trust boundaries

```text
Browser
  │
  ├─ /cms/login                 public page
  ├─ /api/cms/auth/magic        public POST, rate-limited, anti-enumeration
  ├─ /api/cms/auth/callback     public GET, consumes one-time token
  ├─ /api/cms/auth/logout       public POST, clears cookie
  │
  └─ /cms/* protected pages ────────► src/proxy.ts verifies HMAC session cookie
  └─ /api/cms/* protected APIs ─────► src/proxy.ts perimeter + route handler requireSession()
                                         │
                                         ▼
                              Supabase service-role client
                                         │
                                         ▼
                         cms_users / cms_auth_audit_logs /
                         cms_auth_rate_limits / cms_uploads /
                         cms_send_log / articles / newsletter_subscribers
```

### 4.2 Security layers

1. **Proxy perimeter** — rejects unauthenticated `/cms/*` and `/api/cms/*` before route rendering.
2. **Route-handler authorization** — every protected handler calls `requireSession()` again; proxy is not the only control.
3. **Page-level authorization** — every protected server component calls `readSession()`/`requireSession()` before reading CMS data.
4. **Database RLS** — CMS-private tables deny all anon/authenticated access; only the server-side service role can read/write.
5. **Application identity check** — session and DB user must both resolve to the single owner email.
6. **Audit logging** — auth attempts and outcomes are recorded without storing raw tokens, raw emails, or raw IPs.

### 4.3 Full magic-link authentication sequence

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Bhoomija Khanna
    participant UI as /cms/login
    participant Proxy as src/proxy.ts
    participant Magic as POST /api/cms/auth/magic
    participant DB as Supabase/Postgres
    participant Mail as Resend/SMTP
    participant CB as GET /api/cms/auth/callback
    participant Session as sessionToken.ts
    participant CMS as /cms/* + /api/cms/*

    Owner->>UI: Enter bhoomija.k2810@gmail.com
    UI->>Magic: POST { email }
    Magic->>Magic: Validate email shape, normalize, hash IP/email
    Magic->>DB: cms_consume_magic_link_rate_limit(ipHash,emailHash)
    DB-->>Magic: allowed / retryAfter
    alt rate limited
        Magic-->>UI: 429 RATE_LIMITED
    else allowed and email is owner
        Magic->>Magic: rawToken = randomBytes(32).base64url
        Magic->>DB: store SHA256(rawToken), expires_at = now + 15m
        Magic->>Mail: send https://legal-observatory.vercel.app/api/cms/auth/callback?token=...
        Mail-->>Owner: Magic-link email
        Magic-->>UI: 200 { ok: true }
    else allowed and email is not owner
        Magic-->>UI: 200 { ok: true }
    end

    Owner->>CB: Click magic link
    CB->>DB: Lookup cms_users by magic_link_token_hash + owner email
    CB->>DB: Check expiry
    CB->>DB: Atomic consume: clear token only if hash still matches
    alt token invalid/expired/replayed
        CB-->>UI: Redirect /cms/login?error=...
    else token valid
        CB->>Session: signSessionToken({ name })
        Session-->>CB: payload.signature
        CB->>Owner: Set-Cookie nlo-cms-session; redirect safe /cms path
        Owner->>Proxy: Request /cms/dashboard with cookie
        Proxy->>Session: verifySessionToken(cookie)
        Session-->>Proxy: session { email, role:'owner', exp, nonce }
        Proxy->>CMS: Allow request
        CMS->>Session: requireSession() again before data access
        Session-->>CMS: owner session
    end
```

---

## 5. Functional requirements

### FR-1 Single-tenant authorization

- The CMS must have exactly one authorized user record: `bhoomija.k2810@gmail.com`, `name='Bhoomija Khanna'`, `role='owner'`, `status='active'`.
- No public registration, signup, guest mode, invite flow, editor role, viewer role, or self-service account creation is permitted.
- `/api/cms/auth/invite` must be removed or permanently disabled.
- Any session whose `email !== CMS_OWNER_EMAIL` or `role !== 'owner'` must be rejected and the cookie cleared.

### FR-2 Unauthenticated behavior

- Unauthenticated `/cms/*` page requests redirect to `/cms/login` with a sanitized `next` parameter.
- Unauthenticated `/api/cms/*` requests return `401` with body `{ "error": "UNAUTHENTICATED" }`.
- Invalid/expired/tampered session cookies are treated as unauthenticated.
- Missing or placeholder configuration fails closed.

### FR-3 Magic-link request

- `POST /api/cms/auth/magic` accepts `{ "email": string }`.
- Email must be trimmed, lowercased, length ≤ 254, and match a strict email regex.
- For every valid email-shaped request that is not rate-limited, the response must be HTTP `200` with exactly `{ "ok": true }`, regardless of whether the email belongs to the owner.
- Non-owner emails must not create tokens, send email, or reveal account existence.
- Rate limit: max `5` magic-link requests per `15` minutes, enforced independently for client IP hash and normalized email hash.
- Raw magic token: `crypto.randomBytes(32).toString('base64url')` — 256 bits.
- Stored token material: SHA-256 hex digest only.
- Token expiry: `15` minutes.
- Previous unused tokens for the owner are invalidated when a new token is issued.

### FR-4 Magic-link callback

- `GET /api/cms/auth/callback?token=...&next=...` validates the token hash, expiry, and owner identity.
- Token consumption must be atomic: clear `magic_link_token_hash` only where the stored hash still equals the presented hash.
- Replayed tokens must fail.
- `next` must be sanitized to a same-origin `/cms/*` path; default `/cms/dashboard`.
- On success, set `nlo-cms-session` and redirect.

### FR-5 Session cookie

- Cookie name: `nlo-cms-session`.
- Attributes: `httpOnly: true`, `secure: true` in production, `sameSite: 'strict'`, `path: '/'`, TTL `14` days.
- Token format: `<base64url(payload)>.<base64url(hmac_signature)>`.
- Signature: HMAC-SHA256 over the exact `payloadB64` segment using server-only `CMS_SESSION_SECRET`.
- Payload required fields: `email`, `role`, `exp`, `nonce`; implementation may add `name`, `iat`.
- Verification must use `crypto.timingSafeEqual`.

### FR-6 Logout

- `POST /api/cms/auth/logout` clears `nlo-cms-session` with the same path/domain attributes and returns `{ ok: true }`.
- Logout does not need a valid session, but must not leak whether a session existed.

### FR-7 Audit logging

- Record at minimum: `magic_rate_limited`, `magic_ignored_non_owner`, `magic_issued`, `magic_email_failed`, `magic_token_update_failed`, `callback_success`, `callback_invalid`, `callback_expired`, `callback_replay`, `logout`, `dev_login_blocked`, `config_missing`, `session_rejected`.
- Store `email_hash`, `ip_hash`, `user_agent_hash`, `token_hash`, and safe metadata only.
- Never store raw magic tokens, session tokens, service-role keys, or full email/IP addresses in logs.

---

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Fail closed on missing `CMS_SESSION_SECRET`, Supabase URL, service-role key, public origin, or email transport config. |
| NFR-2 | No anonymous or authenticated-role client access to CMS-private tables. |
| NFR-3 | All token/HMAC comparisons use constant-time primitives. |
| NFR-4 | Magic endpoint responses are indistinguishable for owner vs non-owner valid emails. |
| NFR-5 | Magic links are generated only against `CMS_PUBLIC_ORIGIN`, never request `Host`. |
| NFR-6 | CMS mutations must re-check authorization inside route handlers; proxy is not sufficient alone. |
| NFR-7 | Secrets must remain server-only; no `NEXT_PUBLIC_` secret variables. |
| NFR-8 | Production disables dev-login and invite flows unconditionally. |
| NFR-9 | CMS-private data must not fall back to browser/local storage when Supabase is unavailable. |
| NFR-10 | Build must pass `npm run build`; auth security tests must pass `node --test tests/cms-auth.test.mjs` and `node --test tests/security-regression.test.mjs`. |

---

## 7. Data model and SQL migration

Create `supabase/cms/003_single_tenant_cms.sql`. It is idempotent and safe to run after `001_cms_users.sql` and `002_cms_auth_gate.sql`.

```sql
-- NLO CMS single-tenant hardening migration
-- Run AFTER supabase/schema.sql and supabase/cms/001_cms_users.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- cms_users: exactly one owner, passwordless magic-link state only
-- ---------------------------------------------------------------------------
alter table if exists public.cms_users
  add column if not exists status text not null default 'active',
  add column if not exists magic_link_token_hash text,
  add column if not exists magic_link_expires_at timestamptz,
  add column if not exists magic_link_requested_at timestamptz,
  add column if not exists magic_link_request_ip_hash text,
  add column if not exists updated_at timestamptz not null default now();

-- Remove the old ambiguous column if present. The application must only use
-- magic_link_token_hash. Keeping a raw-token column would be a security defect.
alter table if exists public.cms_users
  drop column if exists magic_link_token;

-- Remove non-owner rows before adding single-tenant constraints so the
-- migration cannot fail on legacy editor/viewer/test accounts.
delete from public.cms_users
where email <> 'bhoomija.k2810@gmail.com'
   or role <> 'owner'
   or email is null;

alter table if exists public.cms_users
  alter column role set default 'owner',
  alter column status set default 'active';

-- If the old table allowed multiple roles, constrain it now.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_users_role_owner_only'
      and conrelid = 'public.cms_users'::regclass
  ) then
    alter table public.cms_users
      add constraint cms_users_role_owner_only check (role = 'owner');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_users_status_valid'
      and conrelid = 'public.cms_users'::regclass
  ) then
    alter table public.cms_users
      add constraint cms_users_status_valid check (status in ('active', 'disabled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_users_email_normalized'
      and conrelid = 'public.cms_users'::regclass
  ) then
    alter table public.cms_users
      add constraint cms_users_email_normalized
      check (email = lower(email) and length(email) between 3 and 254);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_users_single_owner_email'
      and conrelid = 'public.cms_users'::regclass
  ) then
    alter table public.cms_users
      add constraint cms_users_single_owner_email
      check (email = 'bhoomija.k2810@gmail.com');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_users_magic_token_hash_format'
      and conrelid = 'public.cms_users'::regclass
  ) then
    alter table public.cms_users
      add constraint cms_users_magic_token_hash_format
      check (
        magic_link_token_hash is null
        or magic_link_token_hash ~ '^[a-f0-9]{64}$'
      );
  end if;
end $$;

create unique index if not exists cms_users_email_key
  on public.cms_users (email);

create index if not exists idx_cms_users_magic_token_hash
  on public.cms_users (magic_link_token_hash)
  where magic_link_token_hash is not null;

-- ---------------------------------------------------------------------------
-- cms_auth_audit_logs: append-only auth audit trail.
-- The earlier audit schema stored raw email/IP/user-agent. Drop and recreate
-- rather than preserving PII. Export a hashed summary first if history matters.
-- ---------------------------------------------------------------------------
drop table if exists public.cms_auth_audit_logs;

create table public.cms_auth_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'magic_rate_limited',
    'magic_ignored_non_owner',
    'magic_issued',
    'magic_email_failed',
    'magic_token_update_failed',
    'callback_success',
    'callback_invalid',
    'callback_expired',
    'callback_replay',
    'logout',
    'dev_login_blocked',
    'config_missing',
    'session_rejected'
  )),
  user_id uuid references public.cms_users(id) on delete set null,
  email_hash text,
  ip_hash text,
  user_agent_hash text,
  token_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cms_auth_audit_logs_created_at
  on public.cms_auth_audit_logs (created_at desc);

create index if not exists idx_cms_auth_audit_logs_event_created
  on public.cms_auth_audit_logs (event_type, created_at desc);

create index if not exists idx_cms_auth_audit_logs_ip_created
  on public.cms_auth_audit_logs (ip_hash, created_at desc);

create index if not exists idx_cms_auth_audit_logs_email_created
  on public.cms_auth_audit_logs (email_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- cms_auth_rate_limits: distributed fixed-window rate limiting
-- ---------------------------------------------------------------------------
create table if not exists public.cms_auth_rate_limits (
  bucket text not null check (bucket in ('ip', 'email')),
  identifier_hash text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (bucket, identifier_hash, window_start)
);

create index if not exists idx_cms_auth_rate_limits_window
  on public.cms_auth_rate_limits (window_start);

-- Atomic rate-limit consumer. Service role only.
create or replace function public.cms_consume_magic_link_rate_limit(
  p_ip_hash text,
  p_email_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_ip_count integer;
  v_email_count integer;
begin
  if p_ip_hash is null
     or p_email_hash is null
     or p_limit < 1
     or p_window_seconds < 60 then
    return query select false, greatest(1, p_window_seconds);
    return;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_window_end := v_window_start + make_interval(secs => p_window_seconds);

  insert into public.cms_auth_rate_limits (
    bucket, identifier_hash, window_start, attempt_count, updated_at
  )
  values ('ip', p_ip_hash, v_window_start, 1, v_now)
  on conflict (bucket, identifier_hash, window_start)
  do update set
    attempt_count = public.cms_auth_rate_limits.attempt_count + 1,
    updated_at = excluded.updated_at
  returning attempt_count into v_ip_count;

  insert into public.cms_auth_rate_limits (
    bucket, identifier_hash, window_start, attempt_count, updated_at
  )
  values ('email', p_email_hash, v_window_start, 1, v_now)
  on conflict (bucket, identifier_hash, window_start)
  do update set
    attempt_count = public.cms_auth_rate_limits.attempt_count + 1,
    updated_at = excluded.updated_at
  returning attempt_count into v_email_count;

  -- Opportunistic cleanup; low-traffic CMS makes this cheap.
  delete from public.cms_auth_rate_limits
  where window_start < v_now - interval '1 day';

  return query select
    (v_ip_count <= p_limit and v_email_count <= p_limit),
    greatest(1, ceil(extract(epoch from v_window_end - v_now))::integer);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: deny all client-side access to CMS-private tables.
-- The Supabase service role bypasses RLS and is the only intended accessor.
-- ---------------------------------------------------------------------------
alter table if exists public.cms_users enable row level security;
alter table if exists public.cms_auth_audit_logs enable row level security;
alter table if exists public.cms_auth_rate_limits enable row level security;
alter table if exists public.cms_uploads enable row level security;
alter table if exists public.cms_send_log enable row level security;

revoke all on public.cms_users from anon, authenticated;
revoke all on public.cms_auth_audit_logs from anon, authenticated;
revoke all on public.cms_auth_rate_limits from anon, authenticated;
revoke all on public.cms_uploads from anon, authenticated;
revoke all on public.cms_send_log from anon, authenticated;

grant all on public.cms_users to service_role;
grant all on public.cms_auth_audit_logs to service_role;
grant all on public.cms_auth_rate_limits to service_role;
grant all on public.cms_uploads to service_role;
grant all on public.cms_send_log to service_role;

-- Remove any older permissive CMS policies, then install deny-all policies.
drop policy if exists "cms_users_self_read" on public.cms_users;
drop policy if exists "cms_users_no_public_write" on public.cms_users;
drop policy if exists "cms_uploads_owner_read" on public.cms_uploads;
drop policy if exists "cms_uploads_no_anon_write" on public.cms_uploads;
drop policy if exists "cms_send_log_no_public_read" on public.cms_send_log;
drop policy if exists "cms_send_log_no_anon_write" on public.cms_send_log;

drop policy if exists "cms_users_deny_all" on public.cms_users;
create policy "cms_users_deny_all"
  on public.cms_users
  for all
  using (false)
  with check (false);

drop policy if exists "cms_auth_audit_logs_deny_all" on public.cms_auth_audit_logs;
create policy "cms_auth_audit_logs_deny_all"
  on public.cms_auth_audit_logs
  for all
  using (false)
  with check (false);

drop policy if exists "cms_auth_rate_limits_deny_all" on public.cms_auth_rate_limits;
create policy "cms_auth_rate_limits_deny_all"
  on public.cms_auth_rate_limits
  for all
  using (false)
  with check (false);

drop policy if exists "cms_uploads_deny_all" on public.cms_uploads;
create policy "cms_uploads_deny_all"
  on public.cms_uploads
  for all
  using (false)
  with check (false);

drop policy if exists "cms_send_log_deny_all" on public.cms_send_log;
create policy "cms_send_log_deny_all"
  on public.cms_send_log
  for all
  using (false)
  with check (false);

-- Rate-limit RPC is callable only by service_role.
revoke all on function public.cms_consume_magic_link_rate_limit(text, text, integer, integer)
  from PUBLIC;
revoke all on function public.cms_consume_magic_link_rate_limit(text, text, integer, integer)
  from anon, authenticated;
grant execute on function public.cms_consume_magic_link_rate_limit(text, text, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Seed the only authorized user and remove any accidental extra users.
-- ---------------------------------------------------------------------------
delete from public.cms_users
where email <> 'bhoomija.k2810@gmail.com';

insert into public.cms_users (email, name, role, status)
values ('bhoomija.k2810@gmail.com', 'Bhoomija Khanna', 'owner', 'active')
on conflict (email) do update
set name = excluded.name,
    role = 'owner',
    status = 'active',
    updated_at = now();
```

### 7.1 Schema notes

- `magic_link_token_hash` stores `sha256(rawToken)` as 64-char lowercase hex.
- `cms_auth_rate_limits` uses fixed 15-minute windows keyed by HMAC-hashed IP/email, not raw identifiers.
- `cms_auth_audit_logs` is append-only by convention; the application must never update or delete rows.
- The `cms_users_single_owner_email` check constraint makes the database itself reject any non-owner account.
- `FOR ALL USING (false) WITH CHECK (false)` denies row access for RLS-subject roles. `anon` and `authenticated` are also revoked table privileges as defense in depth. `service_role` bypasses RLS and is the only intended data path.

---

## 8. Environment configuration

Update `.env.cms.example` and deployment env with:

```env
# Required: session signing secret. Minimum 32 chars; generate with openssl rand -hex 32
CMS_SESSION_SECRET=

# Required: Supabase server-side access. Never expose service role to browser.
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Required: canonical public origin for magic links. Production must be exact.
CMS_PUBLIC_ORIGIN=https://legal-observatory.vercel.app

# Required for magic-link email delivery: at least one transport.
RESEND_API_KEY=
CMS_MAGIC_LINK_FROM=NLO CMS <noreply@legal-observatory.vercel.app>

# Optional SMTP alternative if not using Resend.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
CMS_SMTP_FROM=NLO CMS <noreply@legal-observatory.vercel.app>

# Dev-only escape hatch. Must never be set in production.
ENABLE_DEV_LOGIN=false
```

### 8.1 Configuration validation rules

- `CMS_SESSION_SECRET`: required, length ≥ 32, not placeholder.
- `NEXT_PUBLIC_SUPABASE_URL`: required, valid URL, `https:` in production, not placeholder.
- `SUPABASE_SERVICE_ROLE_KEY`: required, not placeholder, never prefixed `NEXT_PUBLIC_`.
- `CMS_PUBLIC_ORIGIN`: required; production must be `https://legal-observatory.vercel.app`.
- Email transport: require `RESEND_API_KEY` or complete SMTP vars before magic-link issuance.
- `ENABLE_DEV_LOGIN`: ignored/blocked when `NODE_ENV === 'production'`.
- `CMS_OWNER_EMAIL` and `CMS_DEV_EMAILS`: remove from env files; the authorized identity is a code constant and dev identities are not permitted.

---

## 9. TypeScript implementation specification

### 9.1 `src/lib/cms/sessionToken.ts` — pure token module

This module must not import `next/headers`, `next/server`, Supabase, or any client-safe code. It is safe to import from the proxy guard.

```ts
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const CMS_OWNER_EMAIL = 'bhoomija.k2810@gmail.com';
export const CMS_OWNER_NAME = 'Bhoomija Khanna';
export const CMS_SESSION_COOKIE = 'nlo-cms-session';
export const CMS_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const SESSION_SECRET_MIN_LENGTH = 32;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export type CmsRole = 'owner';

export interface CmsSession {
  email: typeof CMS_OWNER_EMAIL;
  name: string;
  role: CmsRole;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

interface SessionPayload {
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
  nonce: string;
}

function getSessionSecret(): string | null {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) return null;
  return secret;
}

export function isCmsSessionConfigured(): boolean {
  return getSessionSecret() !== null;
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function signSessionToken(
  input: { name?: string; nonce?: string } = {},
): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('CMS_SESSION_SECRET is missing or too short.');
  }

  const now = Date.now();
  const payload: SessionPayload = {
    email: CMS_OWNER_EMAIL,
    name: input.name?.trim() || CMS_OWNER_NAME,
    role: 'owner',
    iat: now,
    exp: now + CMS_SESSION_TTL_MS,
    nonce: input.nonce || randomBytes(18).toString('base64url'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${signPayload(payloadB64, secret)}`;
}

export function verifySessionToken(token: string | undefined | null): CmsSession | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;
  if (!BASE64URL_RE.test(payloadB64) || !BASE64URL_RE.test(sigB64)) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const expected = createHmac('sha256', secret).update(payloadB64).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sigB64, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.email !== CMS_OWNER_EMAIL) return null;
  if (payload.role !== 'owner') return null;
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  if (typeof payload.nonce !== 'string' || payload.nonce.length < 16) return null;
  if (typeof payload.iat !== 'number' || payload.iat > Date.now() + 60_000) return null;

  return {
    email: CMS_OWNER_EMAIL,
    name: typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : CMS_OWNER_NAME,
    role: 'owner',
    issuedAt: payload.iat,
    expiresAt: payload.exp,
    nonce: payload.nonce,
  };
}
```

### 9.2 `src/lib/cms/session.ts` — server-only cookie helpers

```ts
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import {
  CMS_SESSION_COOKIE,
  CMS_SESSION_TTL_MS,
  verifySessionToken,
  type CmsSession,
} from './sessionToken';

export const SESSION_COOKIE = CMS_SESSION_COOKIE;
export type { CmsSession };
export { signSessionToken } from './sessionToken';

export class CmsAuthError extends Error {
  constructor(public code: 'UNAUTHENTICATED' | 'SESSION_EXPIRED' | 'FORBIDDEN') {
    super(code);
  }
}

export function cmsSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor(CMS_SESSION_TTL_MS / 1000),
  };
}

export function applySessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(CMS_SESSION_COOKIE, token, cmsSessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(CMS_SESSION_COOKIE, '', {
    ...cmsSessionCookieOptions(),
    maxAge: 0,
  });
}

export async function readSession(): Promise<CmsSession | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(CMS_SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<CmsSession> {
  const session = await readSession();
  if (!session) throw new CmsAuthError('UNAUTHENTICATED');
  return session;
}
```

### 9.3 `src/lib/cms/authSecurity.ts` — request hardening helpers

```ts
import { createHash, createHmac, randomInt } from 'node:crypto';
import type { NextRequest } from 'next/server';

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export function normalizeCmsEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function getTrustedClientIp(request: NextRequest): string {
  // Prefer platform-set headers. Do not trust arbitrary leftmost X-Forwarded-For.
  const vercel = request.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0]?.trim() || 'unknown';

  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

export function hashAuditValue(kind: 'ip' | 'email' | 'ua', value: string): string {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('CMS_SESSION_SECRET is missing or too short.');
  }
  return createHmac('sha256', secret)
    .update(`nlo-cms-audit:${kind}:${value.trim().toLowerCase()}`)
    .digest('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isBase64UrlToken(token: string): boolean {
  return token.length <= 128 && BASE64URL_RE.test(token);
}

export async function enforceMinimumResponseDelay(startedAt: number): Promise<void> {
  const targetMs = 350 + randomInt(0, 350);
  const elapsed = Date.now() - startedAt;
  if (elapsed < targetMs) {
    await new Promise((resolve) => setTimeout(resolve, targetMs - elapsed));
  }
}

export function getCmsPublicOrigin(): string | null {
  const raw = process.env.CMS_PUBLIC_ORIGIN
    || (process.env.NODE_ENV === 'production'
      ? 'https://legal-observatory.vercel.app'
      : 'http://localhost:3002');

  try {
    const url = new URL(raw);
    if (process.env.NODE_ENV === 'production') {
      if (url.protocol !== 'https:' || url.hostname !== 'legal-observatory.vercel.app') {
        return null;
      }
    } else if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function safeCmsNextPath(value: string | null | undefined): string {
  const fallback = '/cms/dashboard';
  if (!value || typeof value !== 'string') return fallback;
  if (
    !value.startsWith('/cms/') ||
    value.includes('://') ||
    value.includes('\\') ||
    value.includes('%')
  ) {
    return fallback;
  }
  const pathOnly = value.split('?')[0]?.split('#')[0] || '';
  if (pathOnly === '/cms/login' || pathOnly.startsWith('/cms/login/')) return fallback;
  return value;
}
```

### 9.4 `src/lib/cms/supabaseAdmin.ts` — strict config validation

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isCmsSessionConfigured } from './sessionToken';
import { getCmsPublicOrigin } from './authSecurity';

let adminClient: SupabaseClient | null = null;

function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return (
    v.includes('your_project') ||
    v.includes('your-supabase-url') ||
    v.includes('example.com') ||
    v === 'your-supabase-service-role-key' ||
    v.startsWith('ey...')
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}

export function isCmsBackendConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholder(url) || isPlaceholder(key)) return false;
  if (!isCmsSessionConfigured()) return false;
  if (!getCmsPublicOrigin()) return false;

  try {
    const parsed = new URL(url);
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false;
  } catch {
    return false;
  }

  return true;
}

export function isCmsAuthConfigured(): boolean {
  if (!isCmsBackendConfigured()) return false;

  const hasResend = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.CMS_MAGIC_LINK_FROM?.trim(),
  );
  const hasSmtp = Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim() &&
    (process.env.CMS_SMTP_FROM?.trim() || process.env.CMS_MAGIC_LINK_FROM?.trim()),
  );

  return hasResend || hasSmtp;
}
```

### 9.5 `src/proxy.ts` — Next.js 16 perimeter guard

Next.js 16 deprecates `middleware.ts`; the current file convention is `src/proxy.ts` with `export function proxy`. `proxy` runs on the Node.js runtime, which is required for `node:crypto` session verification. Remove `src/middleware.ts` after adding this file.

```ts
import { NextRequest, NextResponse } from 'next/server';
import {
  CMS_OWNER_EMAIL,
  CMS_SESSION_COOKIE,
  verifySessionToken,
} from '@/lib/cms/sessionToken';
import { isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { getCmsPublicOrigin, safeCmsNextPath } from '@/lib/cms/authSecurity';

const PUBLIC_PAGE_PATHS = new Set(['/cms/login']);
const PUBLIC_API_PATHS = new Set([
  '/api/cms/auth/magic',
  '/api/cms/auth/callback',
  '/api/cms/auth/logout',
]);
const DEV_LOGIN_PATH = '/api/cms/auth/dev-login';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isCmsPath(pathname: string): boolean {
  return pathname === '/cms' || pathname.startsWith('/cms/') ||
    pathname === '/api/cms' || pathname.startsWith('/api/cms/');
}

function denyApi(): NextResponse {
  return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
}

function clearCookie(response: NextResponse): void {
  response.cookies.set(CMS_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

function allowedCmsOrigins(): Set<string> {
  const origins = new Set<string>();
  const publicOrigin = getCmsPublicOrigin();
  if (publicOrigin) origins.add(publicOrigin);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      origins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {
      // ignore malformed optional env
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3002');
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3002');
  }
  return origins;
}

function checkCmsOrigin(request: NextRequest): NextResponse | null {
  if (!MUTATING_METHODS.has(request.method)) return null;
  if (!request.nextUrl.pathname.startsWith('/api/cms')) return null;
  const origin = request.headers.get('origin');
  if (!origin) return null; // non-browser client; SameSite=strict still applies
  return allowedCmsOrigins().has(origin)
    ? null
    : NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isCmsPath(pathname)) return NextResponse.next();

  const originRejection = checkCmsOrigin(request);
  if (originRejection) return originRejection;

  if (pathname === DEV_LOGIN_PATH) {
    const devAllowed =
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_DEV_LOGIN === 'true';
    if (!devAllowed) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGE_PATHS.has(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(CMS_SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session || session.email !== CMS_OWNER_EMAIL || session.role !== 'owner') {
    if (pathname.startsWith('/api/')) return denyApi();

    const url = request.nextUrl.clone();
    url.pathname = '/cms/login';
    url.search = '';
    url.searchParams.set('next', safeCmsNextPath(pathname));
    const response = NextResponse.redirect(url);
    clearCookie(response);
    return response;
  }

  if (!isCmsBackendConfigured()) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/cms/login';
    url.search = '';
    url.searchParams.set('error', 'not_configured');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cms/:path*', '/api/cms/:path*'],
};
```

#### Edge-runtime compatibility note

`sessionToken.ts` above intentionally uses `node:crypto` and `Buffer` so signature checks can use `crypto.timingSafeEqual`. That module is compatible with `src/proxy.ts` because Next.js 16 `proxy` runs on the Node.js runtime.

If the organization mandates the deprecated Edge `src/middleware.ts` filename, `node:crypto`/`Buffer` are not available there. In that case, implement a separate edge-safe verifier with Web Crypto (`crypto.subtle`) and a manual constant-time byte comparison, and keep `src/middleware.ts` as the only guard file. Do **not** run both `middleware.ts` and `proxy.ts`. For this repository, `src/proxy.ts` is the recommended target.

### 9.6 `POST /api/cms/auth/magic`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseAdmin,
  isCmsAuthConfigured,
} from '@/lib/cms/supabaseAdmin';
import { CMS_OWNER_EMAIL } from '@/lib/cms/sessionToken';
import {
  enforceMinimumResponseDelay,
  getCmsPublicOrigin,
  getTrustedClientIp,
  hashAuditValue,
  hashToken,
  normalizeCmsEmail,
} from '@/lib/cms/authSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  if (!isCmsAuthConfigured()) {
    await auditSafe(getSupabaseAdmin(), {
      eventType: 'config_missing',
      ipHash: safeIpHash(req),
    });
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const email = normalizeCmsEmail((body as { email?: unknown } | null)?.email);
  if (!email) {
    return NextResponse.json({ error: 'BAD_EMAIL' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const origin = getCmsPublicOrigin();
  if (!admin || !origin) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }

  const ipHash = hashAuditValue('ip', getTrustedClientIp(req));
  const emailHash = hashAuditValue('email', email);
  const uaHash = hashAuditValue('ua', req.headers.get('user-agent') || 'unknown');

  const { data: rateRows, error: rateError } = await admin.rpc(
    'cms_consume_magic_link_rate_limit',
    {
      p_ip_hash: ipHash,
      p_email_hash: emailHash,
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    },
  );

  if (rateError) {
    console.error('[cms/auth/magic] rate limit RPC failed', rateError);
    return NextResponse.json({ error: 'RATE_LIMIT_UNAVAILABLE' }, { status: 503 });
  }

  const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
  if (!rate?.allowed) {
    await auditSafe(admin, {
      eventType: 'magic_rate_limited',
      emailHash,
      ipHash,
      userAgentHash: uaHash,
      metadata: { retryAfterSeconds: rate?.retry_after_seconds ?? RATE_WINDOW_SECONDS },
    });
    await enforceMinimumResponseDelay(startedAt);
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate?.retry_after_seconds ?? RATE_WINDOW_SECONDS) },
      },
    );
  }

  if (email !== CMS_OWNER_EMAIL) {
    await auditSafe(admin, {
      eventType: 'magic_ignored_non_owner',
      emailHash,
      ipHash,
      userAgentHash: uaHash,
    });
    await enforceMinimumResponseDelay(startedAt);
    return NextResponse.json({ ok: true });
  }

  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  const { data: updatedUser, error: updateError } = await admin
    .from('cms_users')
    .update({
      magic_link_token_hash: tokenHash,
      magic_link_expires_at: expiresAt.toISOString(),
      magic_link_requested_at: new Date().toISOString(),
      magic_link_request_ip_hash: ipHash,
      updated_at: new Date().toISOString(),
    })
    .eq('email', CMS_OWNER_EMAIL)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (updateError || !updatedUser) {
    console.error('[cms/auth/magic] token update failed', updateError);
    await auditSafe(admin, {
      eventType: 'magic_token_update_failed',
      emailHash,
      ipHash,
      userAgentHash: uaHash,
      metadata: { stage: 'token_update', reason: updateError ? 'update_error' : 'owner_missing_or_inactive' },
    });
    await enforceMinimumResponseDelay(startedAt);
    return NextResponse.json({ ok: true });
  }

  const link = `${origin}/api/cms/auth/callback?token=${encodeURIComponent(rawToken)}&next=%2Fcms%2Fdashboard`;
  const sent = await sendMagicLinkEmail(email, link, expiresAt);

  await auditSafe(admin, {
    eventType: sent ? 'magic_issued' : 'magic_email_failed',
    emailHash,
    ipHash,
    userAgentHash: uaHash,
    tokenHash,
    metadata: { expiresAt: expiresAt.toISOString() },
  });

  await enforceMinimumResponseDelay(startedAt);
  return NextResponse.json({ ok: true });
}

async function sendMagicLinkEmail(
  to: string,
  link: string,
  expiresAt: Date,
): Promise<boolean> {
  const subject = 'Your NLO Editorial CMS sign-in link';
  const html = magicLinkEmail(link, expiresAt);

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.CMS_MAGIC_LINK_FROM;
  if (resendKey && resendFrom) {
    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: resendFrom,
        to: [to],
        subject,
        html,
      });
      if (error) {
        console.error('[cms/auth/magic] resend error', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[cms/auth/magic] resend send failed', err);
      return false;
    }
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.CMS_SMTP_FROM || process.env.CMS_MAGIC_LINK_FROM;
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) return false;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({ from: smtpFrom, to, subject, html });
    return true;
  } catch (err) {
    console.error('[cms/auth/magic] smtp send failed', err);
    return false;
  }
}

function magicLinkEmail(link: string, expiresAt: Date): string {
  const safeLink = escapeHtml(link);
  return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
  <h2 style="margin: 0 0 16px; font-size: 20px;">NLO Editorial CMS</h2>
  <p>Use this one-time sign-in link. It expires at <strong>${expiresAt.toUTCString()}</strong>.</p>
  <p style="margin: 32px 0;">
    <a href="${safeLink}" style="background: #7a1f2b; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign in</a>
  </p>
  <p style="color: #666; font-size: 13px; word-break: break-all;">${safeLink}</p>
  <p style="color: #666; font-size: 13px;">If you did not request this link, ignore this email.</p>
</body></html>`;
}

async function auditSafe(
  admin: SupabaseClient | null,
  event: {
    eventType: string;
    emailHash?: string;
    ipHash?: string;
    userAgentHash?: string;
    tokenHash?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!admin) return;
  try {
    await admin.from('cms_auth_audit_logs').insert({
      event_type: event.eventType,
      email_hash: event.emailHash ?? null,
      ip_hash: event.ipHash ?? null,
      user_agent_hash: event.userAgentHash ?? null,
      token_hash: event.tokenHash ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (err) {
    console.error('[cms/auth/magic] audit insert failed', err);
  }
}

function safeIpHash(req: NextRequest): string | undefined {
  try {
    return hashAuditValue('ip', getTrustedClientIp(req));
  } catch {
    return undefined;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### 9.7 `GET /api/cms/auth/callback`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseAdmin,
  isCmsAuthConfigured,
} from '@/lib/cms/supabaseAdmin';
import {
  applySessionCookie,
  signSessionToken,
} from '@/lib/cms/session';
import { CMS_OWNER_EMAIL } from '@/lib/cms/sessionToken';
import {
  getTrustedClientIp,
  hashAuditValue,
  hashToken,
  isBase64UrlToken,
  safeCmsNextPath,
} from '@/lib/cms/authSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const next = safeCmsNextPath(req.nextUrl.searchParams.get('next'));

  if (!isCmsAuthConfigured()) {
    return redirectLogin(req, 'not_configured');
  }
  if (!isBase64UrlToken(token)) {
    return redirectLogin(req, 'invalid_token');
  }

  const admin = getSupabaseAdmin();
  if (!admin) return redirectLogin(req, 'not_configured');

  const tokenHash = hashToken(token);
  const { data: user, error } = await admin
    .from('cms_users')
    .select('id, email, name, role, status, magic_link_expires_at')
    .eq('magic_link_token_hash', tokenHash)
    .eq('email', CMS_OWNER_EMAIL)
    .maybeSingle();

  if (error || !user || user.status !== 'active') {
    await audit(admin, req, 'callback_invalid', { tokenHash });
    return redirectLogin(req, 'invalid_token');
  }

  if (!user.magic_link_expires_at || new Date(user.magic_link_expires_at).getTime() < Date.now()) {
    await admin
      .from('cms_users')
      .update({
        magic_link_token_hash: null,
        magic_link_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    await audit(admin, req, 'callback_expired', { tokenHash });
    return redirectLogin(req, 'expired_token');
  }

  // Atomic consume: only the request that still sees the same hash wins.
  const { data: consumed, error: consumeError } = await admin
    .from('cms_users')
    .update({
      magic_link_token_hash: null,
      magic_link_expires_at: null,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .eq('magic_link_token_hash', tokenHash)
    .select('id')
    .maybeSingle();

  if (consumeError || !consumed) {
    await audit(admin, req, 'callback_replay', { tokenHash });
    return redirectLogin(req, 'invalid_token');
  }

  const sessionToken = signSessionToken({
    name: user.name,
    nonce: randomBytes(18).toString('base64url'),
  });

  const response = NextResponse.redirect(new URL(next, req.url));
  applySessionCookie(response, sessionToken);
  await audit(admin, req, 'callback_success', { tokenHash });
  return response;
}

function redirectLogin(req: NextRequest, error: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/cms/login';
  url.search = '';
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

async function audit(
  admin: SupabaseClient,
  req: NextRequest,
  eventType: string,
  extra: { tokenHash?: string } = {},
): Promise<void> {
  try {
    await admin.from('cms_auth_audit_logs').insert({
      event_type: eventType,
      ip_hash: hashAuditValue('ip', getTrustedClientIp(req)),
      user_agent_hash: hashAuditValue('ua', req.headers.get('user-agent') || 'unknown'),
      token_hash: extra.tokenHash ?? null,
      metadata: {},
    });
  } catch (err) {
    console.error('[cms/auth/callback] audit failed', err);
  }
}
```

### 9.8 `POST /api/cms/auth/logout`

```ts
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/cms/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
```

### 9.9 `POST|GET /api/cms/auth/dev-login` — dev only

Delete this route for production. If retained for local development, it must ignore request-supplied identity and mint only the fixed owner session.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import {
  applySessionCookie,
  signSessionToken,
} from '@/lib/cms/session';
import { safeCmsNextPath } from '@/lib/cms/authSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function devLoginAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_LOGIN === 'true';
}

export async function POST(req: NextRequest) {
  if (!devLoginAllowed()) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const next = safeCmsNextPath((body as { next?: string }).next);
  return devLoginResponse(req, next);
}

export async function GET(req: NextRequest) {
  if (!devLoginAllowed()) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const next = safeCmsNextPath(req.nextUrl.searchParams.get('next'));
  return devLoginResponse(req, next);
}

function devLoginResponse(req: NextRequest, next: string): NextResponse {
  const token = signSessionToken({
    name: 'Bhoomija Khanna',
    nonce: randomBytes(18).toString('base64url'),
  });
  const response = NextResponse.redirect(new URL(next, req.url));
  applySessionCookie(response, token);
  return response;
}
```

### 9.10 Protected API handler pattern

Every protected `/api/cms/*` handler must start with:

```ts
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  if (!isCmsBackendConfigured() || !getSupabaseAdmin()) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }

  // session.email is guaranteed to be bhoomija.k2810@gmail.com by sessionToken.ts.
  // Do not branch on editor/viewer roles; they do not exist in single-tenant mode.
}
```

Remove all `session.role === 'viewer'` / `role === 'editor'` checks. There is only `owner`.

### 9.11 Protected page pattern

Every protected `/cms/*` page must verify the session before reading CMS data:

```tsx
import { readSession } from '@/lib/cms/session';
import { isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProtectedCmsPage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  if (!isCmsBackendConfigured()) redirect('/cms/login?error=not_configured');
  // render protected content
}
```

`src/app/cms/layout.tsx` may render `CmsShell` only when a session exists, but it must not be the sole authorization check.

---

## 10. Threat model and mitigation matrix

| Threat | Attack vector | Mitigation | Verification |
|---|---|---|---|
| Brute-force magic links | Guess 256-bit token or spam link requests | 256-bit token, SHA-256 hash storage, 15-minute expiry, single-use atomic consume, DB rate limit 5/15m per IP+email | Attempt 6 requests → 429; replay token → invalid |
| Account enumeration | Compare response/body/timing for owner vs non-owner | Always `200 { ok: true }` for valid email shapes; no `sent` field; minimum response delay; non-owner path performs audit+jitter without DB token write/email | Owner and random email return identical status/body; timing within jitter band |
| Timing side channels | HMAC/token compare leaks via early exit | `crypto.timingSafeEqual` for session signature; hash-token DB lookup; minimum response delay on magic endpoint | Unit test tampered token rejects; timing test stable |
| Replay attack | Reuse intercepted magic link | Atomic consume clears hash only if it still matches; second callback gets `invalid_token` | Use token twice; second fails |
| Expired token | Use old link | `magic_link_expires_at` checked; expired token cleared | Travel clock or insert expired row; callback redirects `expired_token` |
| Session theft | Stolen cookie reused | `httpOnly`, `secure`, `sameSite=strict`, 14-day TTL, HMAC signature, owner-only payload, nonce | Inspect Set-Cookie; tamper payload → 401 |
| Session forgery | Forge cookie without secret | HMAC-SHA256 over exact payload segment; missing/weak `CMS_SESSION_SECRET` fails closed | Sign with wrong secret → rejected |
| Wrong-user session | Valid token for non-owner email | `verifySessionToken` requires `email === CMS_OWNER_EMAIL` and `role === 'owner'`; DB check constraint prevents non-owner users | Inject cookie with other email → rejected/cleared |
| CSRF | Cross-site POST to CMS APIs/logout | `sameSite=strict` cookie; JSON content-type; proxy perimeter; mutating handlers re-check session | Cross-site form POST does not carry cookie |
| Open redirect | `next=https://evil.com` after callback/login | `safeCmsNextPath` allows only `/cms/*`, rejects `://`, `\\`, `/cms/login` | Callback with external next redirects to `/cms/dashboard` |
| Host-header poisoning | Magic link generated from attacker-controlled Host | Link origin is fixed `CMS_PUBLIC_ORIGIN`, never `req.nextUrl.origin` | Request with `Host: evil.com`; email link still uses legal-observatory.vercel.app |
| Email token leakage | Token in logs, referrer, analytics | Token only in email URL path to `/api/cms/auth/callback`; audit stores hash only; no token logging | Inspect logs/audit; no raw token present |
| Service-role exposure | Supabase service key reaches browser | Only `NEXT_PUBLIC_SUPABASE_URL` and publishable key are public; service key server-only; CMS tables deny anon/auth | Build output and client bundle contain no service key |
| RLS bypass/misconfig | anon/auth reads CMS tables via Supabase client | Deny-all RLS policies + revoke grants; service role only; DB constraint single owner | Supabase anon query returns permission denied/empty |
| Invite abuse | Owner endpoint creates editor/viewer | Remove/disable invite route; DB role constraint `role='owner'`; UI team management removed | `POST /api/cms/auth/invite` → 403/404; insert editor fails |
| Dev-login abuse | Dev route mints arbitrary sessions in prod | Proxy returns 403 unless `NODE_ENV!=='production' && ENABLE_DEV_LOGIN==='true'`; route ignores request identity | Production request → 403 |
| Rate-limit bypass | Rotate IPs/emails | Limit enforced per IP hash and per email hash independently; email fixed to owner for issuance | 6th request from same IP or same email → 429 |
| Local fallback data leak | Missing Supabase silently uses local files | Fail closed unless explicit dev flag; protected APIs return 503 when unconfigured | Unset env → auth APIs 503, pages redirect |
| Audit tampering | Attacker deletes auth logs | Logs append-only by app convention; RLS deny-all; service role only; optional DB trigger can block update/delete | Direct anon update denied |
| Email provider compromise | Magic link sent to wrong recipient | Recipient is always normalized owner email from DB/session constant; link single-use/15m; audit email failures | Non-owner email never sends |
| Configuration drift | `thenlo.org` or placeholder domain used | `CMS_PUBLIC_ORIGIN` production must equal `https://legal-observatory.vercel.app`; `isCmsAuthConfigured` validates | Missing/wrong origin → 503/redirect |

---

## 11. Developer implementation checklist

### Phase 1 — Database

1. Run `supabase/schema.sql` if not already applied.
2. Run `supabase/cms/001_cms_users.sql` if not already applied.
3. Run `supabase/cms/002_cms_auth_gate.sql` if it exists and has not been applied.
4. Create and run `supabase/cms/003_single_tenant_cms.sql`.
5. Verify in Supabase SQL editor:
   - `select email, name, role, status from cms_users;` returns only Bhoomija.
   - `select * from cms_users where role <> 'owner' or email <> 'bhoomija.k2810@gmail.com';` returns zero rows.
   - `select proname from pg_proc where proname='cms_consume_magic_link_rate_limit';` exists.
6. Verify RLS:
   - As `anon`/`authenticated`, `select * from cms_users` is denied or returns no rows.
   - `cms_auth_audit_logs` and `cms_auth_rate_limits` are not readable/writable by client roles.

### Phase 2 — Environment

1. Copy `.env.cms.example` to `.env.local`.
2. Set `CMS_SESSION_SECRET=$(openssl rand -hex 32)`.
3. Set `CMS_PUBLIC_ORIGIN=https://legal-observatory.vercel.app` for production; `http://localhost:3002` for local.
4. Set Supabase URL + service role key.
5. Set `RESEND_API_KEY` and `CMS_MAGIC_LINK_FROM` or SMTP vars.
6. Remove `CMS_OWNER_EMAIL` and `CMS_DEV_EMAILS`; they must not configure identity.
7. Ensure `ENABLE_DEV_LOGIN` is unset/false in production.
8. Restart `npm run dev` after env changes.

### Phase 3 — Code

1. Add `src/lib/cms/sessionToken.ts`.
2. Refactor `src/lib/cms/session.ts` to cookie helpers only.
3. Add `src/lib/cms/authSecurity.ts`.
4. Refactor `src/lib/cms/audit.ts` to write only hashed identifiers, or remove it and use the route-local `auditSafe` helper.
5. Remove `src/lib/cms/rateLimit.ts` and all imports; use the DB-backed RPC instead.
6. Update `src/lib/cms/supabaseAdmin.ts` with strict `isCmsBackendConfigured()` / `isCmsAuthConfigured()`.
7. Replace `src/middleware.ts` with `src/proxy.ts`.
8. Rewrite `src/app/api/cms/auth/magic/route.ts`.
9. Rewrite `src/app/api/cms/auth/callback/route.ts`.
10. Rewrite `src/app/api/cms/auth/logout/route.ts`.
11. Harden or delete `src/app/api/cms/auth/dev-login/route.ts`.
12. Delete or disable `src/app/api/cms/auth/invite/route.ts`; remove team invite UI from Settings.
13. Update every protected `/api/cms/*` handler to call `requireSession()` and remove role branches.
14. Update every protected `/cms/*` page to call `readSession()`/`requireSession()` before data access.
15. Remove silent local-store fallbacks for CMS mutations unless `NODE_ENV==='development'` and an explicit local flag is set.

### Phase 4 — Tests

1. Add `tests/cms-auth.test.mjs` covering session token sign/verify/tamper/expiry/wrong-email.
2. Add proxy tests or Playwright checks for redirects/401/403.
3. Run:

```bash
node --test tests/cms-auth.test.mjs
node --test tests/security-regression.test.mjs
npm run lint
npm run build
```

### Phase 5 — Deployment verification

1. Deploy to Vercel with production env vars.
2. Confirm `https://legal-observatory.vercel.app/cms/dashboard` redirects to `/cms/login` when logged out.
3. Confirm `https://legal-observatory.vercel.app/api/cms/subscribers` returns `401 {"error":"UNAUTHENTICATED"}`.
4. Request a magic link for `bhoomija.k2810@gmail.com`; verify email link host is `legal-observatory.vercel.app`.
5. Sign in; verify cookie attributes in browser devtools.
6. Replay the same magic link; verify it fails.
7. Verify `/api/cms/auth/dev-login` returns `403` in production.

---

## 12. Acceptance criteria test matrix

| # | Test | Steps | Expected result |
|---:|---|---|---|
| 1 | Unauthenticated perimeter | `GET /cms/dashboard` and `GET /api/cms/subscribers` with no cookie | `/cms/dashboard` → redirect `/cms/login?next=%2Fcms%2Fdashboard`; API → `401 {"error":"UNAUTHENTICATED"}` |
| 2 | Anti-enumeration parity | `POST /api/cms/auth/magic` with owner email and with `not-real@example.com` | Both return `200 {"ok":true}` with no `sent` field; only owner receives email; DB token exists only for owner |
| 3 | Rate limiting | Send 6 magic requests from same IP for owner email within 15 min | First 5 → `200 {ok:true}`; 6th → `429 {"error":"RATE_LIMITED"}` with `Retry-After`; separate email bucket also enforced |
| 4 | Magic token lifecycle | Request link, use callback, then reuse same token; also test expired token | First callback sets cookie and redirects safe path; replay → `/cms/login?error=invalid_token`; expired → `expired_token` |
| 5 | Session integrity | Tamper cookie payload/signature; craft cookie for another email; inspect attributes | Tampered/wrong-user cookie → API `401`, page redirect, cookie cleared; valid cookie has `httpOnly`, `secure`, `sameSite=strict`, `path=/`, ~14-day expiry |
| 6 | Production dev-login block | `GET|POST /api/cms/auth/dev-login` with `NODE_ENV=production` | `403 {"error":"FORBIDDEN"}` regardless of query/body |
| 7 | Single-tenant DB/RLS | Query `cms_users`, `cms_auth_audit_logs`, `cms_auth_rate_limits` as anon/authenticated; attempt insert editor | Client roles denied; only `bhoomija.k2810@gmail.com`/`owner`/`active` exists; non-owner insert rejected |
| 8 | Fail-closed config | Unset `CMS_SESSION_SECRET`, Supabase URL/key, `CMS_PUBLIC_ORIGIN`, or email transport | Protected pages redirect to login error; protected APIs `401`/`503`; magic endpoint `503`; no local fallback writes |

---

## 13. Test implementation guidance

### 13.1 `tests/cms-auth.test.mjs`

Add unit tests for pure functions:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CMS_OWNER_EMAIL,
  signSessionToken,
  verifySessionToken,
} from '../src/lib/cms/sessionToken.ts';
```

If Node cannot import TS directly, either:
- compile a tiny test bundle with `tsx`/`ts-node`, or
- move pure token helpers to `.mjs`/plain `.ts` consumed by tests via `typescript` transpile, or
- duplicate minimal test harness using `node --experimental-strip-types` if the Node version supports it.

Recommended assertions:

- `verifySessionToken(signSessionToken())` returns owner session.
- Changing one payload character invalidates signature.
- Token with `email='attacker@example.com'` is rejected even if re-signed? No — re-signing requires secret; test forged unsigned payload rejected.
- Expired `exp` rejected.
- Missing `CMS_SESSION_SECRET` makes verify return `null` and sign throw.

### 13.2 HTTP acceptance tests

Use Playwright (`playwright` is already a dependency) or `curl` against `npm run dev` / preview deployment:

```bash
curl -i http://localhost:3002/cms/dashboard
curl -i http://localhost:3002/api/cms/subscribers
curl -i -X POST http://localhost:3002/api/cms/auth/magic \
  -H 'content-type: application/json' \
  -d '{"email":"bhoomija.k2810@gmail.com"}'
curl -i -X POST http://localhost:3002/api/cms/auth/magic \
  -H 'content-type: application/json' \
  -d '{"email":"not-real@example.com"}'
```

Expected:

- `/cms/dashboard` → `307`/`308` to `/cms/login?next=...`
- `/api/cms/subscribers` → `401`
- Both magic calls → `200 {"ok":true}`

---

## 14. Rollout, rollback, and monitoring

### 14.1 Rollout order

1. Apply SQL migration in Supabase.
2. Configure env vars in Vercamp preview.
3. Deploy preview and run acceptance matrix.
4. Deploy production.
5. Request owner magic link and verify end-to-end login.
6. Monitor `cms_auth_audit_logs` for `magic_email_failed`, `callback_replay`, `session_rejected`, `magic_rate_limited`.

### 14.2 Rollback

- If auth breaks, set `ENABLE_DEV_LOGIN=false` remains; do not re-enable invite/dev flows.
- Roll back application code to previous deployment if needed; SQL migration is additive except policy changes. To restore prior RLS for local development only, run a dev-specific rollback script — never in production.
- If `CMS_SESSION_SECRET` is compromised, rotate it; all existing sessions invalidate immediately because signatures no longer verify.

### 14.3 Monitoring queries

```sql
select event_type, count(*)
from public.cms_auth_audit_logs
where created_at > now() - interval '24 hours'
group by event_type
order by count(*) desc;

select event_type, created_at, metadata
from public.cms_auth_audit_logs
where event_type in ('magic_email_failed', 'callback_replay', 'session_rejected', 'magic_rate_limited')
order by created_at desc
limit 50;
```

---

## 15. File change map

| File | Action | Purpose |
|---|---|---|
| `supabase/cms/003_single_tenant_cms.sql` | Add | Single-tenant schema, RLS, audit, rate limit, seed |
| `src/lib/cms/sessionToken.ts` | Add | Pure HMAC session token sign/verify |
| `src/lib/cms/session.ts` | Refactor | Cookie helpers + `requireSession()` |
| `src/lib/cms/authSecurity.ts` | Add | Email/IP/hash/jitter/origin/next sanitizers |
| `src/lib/cms/audit.ts` | Refactor/remove | Replace raw PII audit with hashed `cms_auth_audit_logs` writes |
| `src/lib/cms/rateLimit.ts` | Remove | Replace in-memory limiter with `cms_consume_magic_link_rate_limit` RPC |
| `src/lib/cms/supabaseAdmin.ts` | Update | Strict fail-closed config checks |
| `src/proxy.ts` | Add | Next.js 16 perimeter guard |
| `src/middleware.ts` | Remove | Replaced by `proxy.ts` |
| `src/app/api/cms/auth/magic/route.ts` | Rewrite | Rate-limited anti-enumeration magic issuer |
| `src/app/api/cms/auth/callback/route.ts` | Rewrite | Atomic token consume + session cookie |
| `src/app/api/cms/auth/logout/route.ts` | Rewrite | Strict cookie clearing |
| `src/app/api/cms/auth/dev-login/route.ts` | Harden/delete | Dev-only fixed owner login |
| `src/app/api/cms/auth/invite/route.ts` | Delete/disable | No multi-user invites |
| `src/app/api/cms/**` protected handlers | Update | Re-check `requireSession()`, remove role branches |
| `src/app/cms/**` protected pages | Update | Re-check `readSession()` before data access |
| `tests/cms-auth.test.mjs` | Add | Session/token/security unit tests |
| `.env.cms.example` | Update | New required env vars |
| `cms/SECURITY_SRS.md` | Add | This specification |

---

## 16. Final security invariants

The implementation is complete only when all of the following are true:

1. Only `bhoomija.k2810@gmail.com` can obtain a CMS session.
2. No code path can create, invite, or impersonate another CMS user.
3. `/api/cms/auth/magic` always returns `200 { ok: true }` for valid non-rate-limited email requests.
4. Magic tokens are 256-bit random, SHA-256 hashed at rest, 15-minute TTL, single-use, and atomically consumed.
5. Session cookies are HMAC-SHA256 signed over the exact payload, `httpOnly`, `secure` in production, `sameSite=strict`, `path=/`, 14-day TTL.
6. `verifySessionToken` rejects every payload whose email is not the owner or whose role is not `owner`.
7. Proxy guards `/cms/*` and `/api/cms/*`; protected handlers/pages independently re-check auth.
8. CMS-private Supabase tables have deny-all RLS for client roles and are accessible only via service role.
9. Auth events are audited with hashed identifiers and no raw secrets/tokens.
10. Production rejects dev-login and invite flows unconditionally.
