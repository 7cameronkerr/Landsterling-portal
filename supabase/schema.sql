-- ============================================================================
--  LAND STERLING INVESTMENT PORTAL — DATABASE SCHEMA
--  Run this once in your Supabase project:  SQL Editor → New query → paste → Run
--  Safe to re-run (uses IF NOT EXISTS / DROP ... IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (one row per user, linked to Supabase Auth)
--    status drives the two onboarding paths:
--      'invited'  -> you invited them; auto-approved once they set a password
--      'pending'  -> they self-registered; waiting for YOUR approval
--      'approved' -> can log in and view opportunities
--      'rejected' -> blocked
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  first_name  text,
  last_name   text,
  full_name   text,
  mobile      text,
  company     text,
  role        text not null default 'client'  check (role   in ('client','admin')),
  status      text not null default 'pending' check (status in ('invited','pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- 2. OPPORTUNITIES  (your investment listings — managed from the admin panel)
--    metrics & highlights are JSON so they map 1:1 to your existing design.
-- ---------------------------------------------------------------------------
create table if not exists public.opportunities (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  location      text,
  country       text default 'UAE',
  lat           double precision,
  lng           double precision,
  image         text,
  asset_type    text,
  asset_profile text,
  tenure        text,
  deal_status   text default 'Available',
  price         text,
  price_label   text default 'Guide Price',
  gross_yield   text,
  net_yield     text,
  entry_psf     text,
  short_angle   text,
  summary       text,
  metrics       jsonb default '{}'::jsonb,
  highlights    jsonb default '[]'::jsonb,
  featured      boolean default false,
  sort_order    integer default 100,
  is_published  boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. ENQUIRIES  (every CTA submission is stored here AND emailed to you)
-- ---------------------------------------------------------------------------
create table if not exists public.enquiries (
  id               uuid primary key default gen_random_uuid(),
  type             text not null default 'enquiry',  -- enquiry | particulars | contact
  opportunity_slug text,
  opportunity_name text,
  name             text,
  email            text,
  phone            text,
  company          text,
  message          text,
  consent          boolean default false,
  is_read          boolean default false,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. HELPER: is the current user an admin?  (SECURITY DEFINER avoids RLS loops)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. TRIGGER: auto-create a profile whenever a new auth user is created.
--    Reads optional metadata set at sign-up / invite time:
--      status  -> 'invited' (admin invite) or 'pending' (self register)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, full_name, mobile, company, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(
      nullif(trim(concat_ws(' ',
        new.raw_user_meta_data ->> 'first_name',
        new.raw_user_meta_data ->> 'last_name')), ''),
      new.raw_user_meta_data ->> 'full_name'
    ),
    new.raw_user_meta_data ->> 'mobile',
    new.raw_user_meta_data ->> 'company',
    coalesce(new.raw_user_meta_data ->> 'status', 'pending')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. TRIGGER: keep opportunities.updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_touch_opportunities on public.opportunities;
create trigger trg_touch_opportunities
  before update on public.opportunities
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.opportunities enable row level security;
alter table public.enquiries     enable row level security;

-- PROFILES ------------------------------------------------------------------
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "admin profiles all" on public.profiles;

create policy "own profile read"   on public.profiles
  for select using ( id = auth.uid() );
create policy "own profile update" on public.profiles
  for update using ( id = auth.uid() );
create policy "admin profiles all" on public.profiles
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- OPPORTUNITIES -------------------------------------------------------------
-- Only APPROVED logged-in users can read published opportunities.
-- Admins can do everything.
drop policy if exists "approved read opportunities" on public.opportunities;
drop policy if exists "admin opportunities all"     on public.opportunities;

create policy "approved read opportunities" on public.opportunities
  for select using ( is_published = true and public.is_approved() );
create policy "admin opportunities all" on public.opportunities
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- ENQUIRIES -----------------------------------------------------------------
-- Any logged-in user may submit an enquiry; only admins can read them.
drop policy if exists "auth insert enquiries" on public.enquiries;
drop policy if exists "admin read enquiries"  on public.enquiries;
drop policy if exists "admin update enquiries" on public.enquiries;

create policy "auth insert enquiries" on public.enquiries
  for insert with check ( auth.uid() is not null );
create policy "admin read enquiries" on public.enquiries
  for select using ( public.is_admin() );
create policy "admin update enquiries" on public.enquiries
  for update using ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- 8. PERFORMANCE INDEXES
-- ---------------------------------------------------------------------------
create index if not exists idx_opportunities_sort    on public.opportunities (sort_order, created_at);
create index if not exists idx_enquiries_created      on public.enquiries (created_at desc);
create index if not exists idx_profiles_status        on public.profiles (status);

-- ============================================================================
--  PHASE 2 ADDITIONS  (access model: NDA-at-activation, activity log, requests)
-- ============================================================================

-- 9. NDA audit fields on profiles (signed during account activation)
alter table public.profiles add column if not exists nda_signed_at timestamptz;
alter table public.profiles add column if not exists nda_name      text;
alter table public.profiles add column if not exists nda_version   text;
alter table public.profiles add column if not exists nda_ip        text;

-- 10. ACTIVITY LOG — sign-ins and opportunity views (feeds CRM / lead scoring)
create table if not exists public.activity_log (
  id               bigint generated by default as identity primary key,
  user_id          uuid references auth.users(id) on delete cascade,
  event_type       text not null,                 -- 'login' | 'view_opportunity' | ...
  opportunity_slug text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_activity_user    on public.activity_log (user_id, created_at desc);
create index if not exists idx_activity_created  on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;
drop policy if exists "own activity insert" on public.activity_log;
drop policy if exists "admin activity read" on public.activity_log;
create policy "own activity insert" on public.activity_log
  for insert with check ( user_id = auth.uid() );
create policy "admin activity read" on public.activity_log
  for select using ( public.is_admin() );

-- 11. ACCESS REQUESTS — self-registration captures details only (no password).
--     On approval, the admin invites them (Path A flow) → they activate (NDA+password).
create table if not exists public.access_requests (
  id          uuid primary key default gen_random_uuid(),
  first_name  text,
  last_name   text,
  email       text not null,
  mobile      text,
  company     text,
  consent     boolean default false,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references auth.users(id)
);
create index if not exists idx_access_requests_status on public.access_requests (status, created_at desc);

alter table public.access_requests enable row level security;
drop policy if exists "anyone can request access" on public.access_requests;
drop policy if exists "admin manage requests"     on public.access_requests;
-- Anonymous visitors may submit a request (consider adding a captcha later).
create policy "anyone can request access" on public.access_requests
  for insert with check ( true );
create policy "admin manage requests" on public.access_requests
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- ============================================================================
--  PHASE 3 ADDITIONS  (production upgrade: link enquiries to a real contact,
--  capture budget/location as real fields, notification/CRM completeness)
-- ============================================================================

-- 12. Link every enquiry back to the submitting profile, when known (nullable —
--     signed-out/teaser visitors have no account yet). Fixes duplicate/orphaned
--     lead records: activity is now queryable per contact, not just per row.
alter table public.enquiries add column if not exists user_id         uuid references auth.users(id) on delete set null;
alter table public.enquiries add column if not exists budget          text;
alter table public.enquiries add column if not exists target_location text;
create index if not exists idx_enquiries_user on public.enquiries (user_id, created_at desc);

-- 13. Capture mobile/company for admin-direct invites too (previously only the
--     self-registration path collected these). Safe no-op if already applied.
-- (No new columns needed — profiles.mobile/company already exist; this is a
--  front-end fix in the invite modal + activation page, not a schema change.)

-- ============================================================================
--  PHASE 4 ADDITIONS (asset-detail page elevated to institutional-brochure
--  standard — photo gallery + a floor-by-floor accommodation schedule,
--  matching how JLL/CBRE present individual assets)
-- ============================================================================

-- 14. A photo gallery (array of image URLs) and an accommodation/unit
--     schedule (array of {name, sqft, sqm, availability} rows) per
--     opportunity. Both default to an empty array, so every existing
--     opportunity keeps rendering exactly as before until you add data —
--     the front-end only shows these sections when there's something to show.
alter table public.opportunities add column if not exists gallery        jsonb default '[]'::jsonb;
alter table public.opportunities add column if not exists unit_schedule  jsonb default '[]'::jsonb;

-- ============================================================================
--  DONE. Next: create your own login, then promote yourself to admin with the
--  one-line command in SETUP.md (Step 6).
-- ============================================================================
