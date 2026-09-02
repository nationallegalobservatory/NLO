-- NLO CMS — additional tables for Bhumija's editorial dashboard
-- Run AFTER the existing schema.sql has been applied.

-- 1) CMS users (Bhoomija + future editors)
CREATE TABLE IF NOT EXISTS cms_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  magic_link_token TEXT,
  magic_link_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cms_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated cms_users can read the user table (no public access at all).
CREATE POLICY "cms_users_self_read" ON cms_users
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Inserts/updates go through the service role from API routes (bypasses RLS).
CREATE POLICY "cms_users_no_public_write" ON cms_users
  FOR ALL USING (false) WITH CHECK (false);

-- 2) Upload tracking
CREATE TABLE IF NOT EXISTS cms_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_email TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracting', 'extracted', 'failed')),
  refactor_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (refactor_status IN ('pending', 'refactoring', 'refactored', 'failed', 'skipped')),
  refactored_article_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_uploads_status
  ON cms_uploads (extraction_status, refactor_status);
CREATE INDEX IF NOT EXISTS idx_cms_uploads_uploader
  ON cms_uploads (uploader_email, created_at DESC);

ALTER TABLE cms_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_uploads_owner_read" ON cms_uploads
  FOR SELECT USING (auth.jwt() ->> 'email' = uploader_email);

-- Writes go through service role.
CREATE POLICY "cms_uploads_no_anon_write" ON cms_uploads
  FOR ALL USING (false) WITH CHECK (false);

-- 3) Newsletter send log
CREATE TABLE IF NOT EXISTS cms_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  campaign_subject TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'partial', 'failed')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  sent_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_send_log_status
  ON cms_send_log (status, scheduled_for);

ALTER TABLE cms_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_send_log_no_public_read" ON cms_send_log
  FOR SELECT USING (false);
CREATE POLICY "cms_send_log_no_anon_write" ON cms_send_log
  FOR ALL USING (false) WITH CHECK (false);

-- 4) Add columns to existing `articles` for CMS workflow
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS cms_status TEXT NOT NULL DEFAULT 'published'
    CHECK (cms_status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS cms_cover_image_path TEXT,
  ADD COLUMN IF NOT EXISTS cms_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cms_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS cms_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS cms_source_upload_id UUID,
  ADD COLUMN IF NOT EXISTS cms_newsletter_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cms_newsletter_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_cms_status
  ON articles (cms_status, cms_publish_at);

-- 5) Newsletter recipients — extend the existing subscribers table
-- (Keep the existing one; just add a `source` and `tags` column for CMS use.)
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
