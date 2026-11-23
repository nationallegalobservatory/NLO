-- NLO CMS — auth gate hardening (RFC-2026-CMS-01)
-- Idempotent migration for databases that already ran 001_cms_users.sql.
-- Safe to run on a fresh database too (all statements are IF NOT EXISTS /
-- DROP POLICY IF EXISTS guarded).

-- 1) Add spec-required columns to cms_users
ALTER TABLE cms_users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Align role default with the single-tenant owner model
ALTER TABLE cms_users ALTER COLUMN role SET DEFAULT 'owner';

-- 2) Replace the old self-read policy with strict deny-all (service-role only)
DROP POLICY IF EXISTS "cms_users_self_read" ON cms_users;
DROP POLICY IF EXISTS "cms_users_zero_anon_read" ON cms_users;
DROP POLICY IF EXISTS "cms_users_zero_anon_write" ON cms_users;
DROP POLICY IF EXISTS "cms_users_no_public_write" ON cms_users;

CREATE POLICY "cms_users_zero_anon_read" ON cms_users
  FOR SELECT USING (false);
CREATE POLICY "cms_users_zero_anon_write" ON cms_users
  FOR ALL USING (false) WITH CHECK (false);

-- 3) Auth audit log table
CREATE TABLE IF NOT EXISTS cms_auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  email_attempted TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cms_auth_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_service_only" ON cms_auth_audit_logs;
CREATE POLICY "audit_logs_service_only" ON cms_auth_audit_logs
  FOR ALL USING (false) WITH CHECK (false);

-- 4) Seed/refresh exclusively Bhoomija Khanna as owner
INSERT INTO cms_users (email, name, role)
VALUES ('bhoomija.k2810@gmail.com', 'Bhoomija Khanna', 'owner')
ON CONFLICT (email) DO UPDATE SET role = 'owner', name = 'Bhoomija Khanna';
