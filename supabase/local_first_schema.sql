-- Local-first PWA sync extension for National Legal Observatory.
-- Run this after supabase/schema.sql in the Supabase SQL editor.
-- Public inserts are used for browser submissions/newsletter-style flows.
-- Editorial read/update access is limited to users whose app_metadata.roles contains "editor".

create table if not exists public.contact_submissions (
  id text primary key,
  name text not null,
  email text not null,
  category text not null default 'general',
  subject text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  file_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  reviewed_at timestamptz
);

alter table public.contact_submissions enable row level security;

drop policy if exists "Anyone can create contact submissions" on public.contact_submissions;
create policy "Anyone can create contact submissions"
  on public.contact_submissions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Editors can read contact submissions" on public.contact_submissions;
create policy "Editors can read contact submissions"
  on public.contact_submissions
  for select
  to authenticated
  using ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor');

drop policy if exists "Editors can update contact submissions" on public.contact_submissions;
create policy "Editors can update contact submissions"
  on public.contact_submissions
  for update
  to authenticated
  using ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor')
  with check ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor');

create table if not exists public.editorial_submissions (
  id text primary key,
  name text not null,
  email text not null,
  category text not null,
  subject text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  file_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  reviewed_at timestamptz
);

alter table public.editorial_submissions enable row level security;

drop policy if exists "Anyone can create editorial submissions" on public.editorial_submissions;
create policy "Anyone can create editorial submissions"
  on public.editorial_submissions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Editors can read editorial submissions" on public.editorial_submissions;
create policy "Editors can read editorial submissions"
  on public.editorial_submissions
  for select
  to authenticated
  using ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor');

drop policy if exists "Editors can update editorial submissions" on public.editorial_submissions;
create policy "Editors can update editorial submissions"
  on public.editorial_submissions
  for update
  to authenticated
  using ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor')
  with check ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor');

create table if not exists public.user_preferences (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id text not null,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
  on public.user_preferences
  for select
  to anon, authenticated
  using (user_id is null or (select auth.uid()) = user_id);

drop policy if exists "Users can upsert their own preferences" on public.user_preferences;
create policy "Users can upsert their own preferences"
  on public.user_preferences
  for insert
  to anon, authenticated
  with check (user_id is null or (select auth.uid()) = user_id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences
  for update
  to anon, authenticated
  using (user_id is null or (select auth.uid()) = user_id)
  with check (user_id is null or (select auth.uid()) = user_id);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  permissions text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own cached profile" on public.user_profiles;
create policy "Users can read own cached profile"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can upsert own cached profile" on public.user_profiles;
create policy "Users can upsert own cached profile"
  on public.user_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own cached profile" on public.user_profiles;
create policy "Users can update own cached profile"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table if not exists public.drafts (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  slug text,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'draft',
  updated_at timestamptz not null default now()
);

alter table public.drafts enable row level security;

drop policy if exists "Users can read own drafts" on public.drafts;
create policy "Users can read own drafts"
  on public.drafts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own drafts" on public.drafts;
create policy "Users can create own drafts"
  on public.drafts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own drafts" on public.drafts;
create policy "Users can update own drafts"
  on public.drafts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('nlo-submissions', 'nlo-submissions', false)
on conflict (id) do nothing;

drop policy if exists "Anyone can upload submission files" on storage.objects;
create policy "Anyone can upload submission files"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'nlo-submissions');

drop policy if exists "Editors can read submission files" on storage.objects;
create policy "Editors can read submission files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'nlo-submissions'
    and ((select auth.jwt()) -> 'app_metadata' -> 'roles' ? 'editor')
  );

grant usage on schema public to anon, authenticated;
grant insert on public.contact_submissions to anon, authenticated;
grant insert on public.editorial_submissions to anon, authenticated;
grant select, update on public.contact_submissions to authenticated;
grant select, update on public.editorial_submissions to authenticated;
grant select, insert, update on public.user_preferences to anon, authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select, insert, update on public.drafts to authenticated;
