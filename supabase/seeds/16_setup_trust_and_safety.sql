-- ==============================================================================
-- Seed / Runner: 16_setup_trust_and_safety.sql
-- Description: Trust & Safety, Scam Reporting & Verification Proof Intake
-- ==============================================================================

begin;

-- 1. Anti-Scam Community Reports Table
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('academy', 'venue', 'opportunity', 'coach')),
  entity_id text,
  entity_slug text not null,
  entity_name text not null,
  reason text not null check (reason in ('fake_trial', 'impersonation', 'fake_venue', 'unauthorized_fee', 'wrong_contact', 'other')),
  details text not null check (char_length(trim(details)) >= 5),
  reporter_email text,
  reporter_phone text,
  status text not null default 'pending' check (status in ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_reports enable row level security;

drop policy if exists "listing_reports_insert_community" on public.listing_reports;
create policy "listing_reports_insert_community" on public.listing_reports
  for insert to anon, authenticated
  with check (
    char_length(trim(details)) >= 5
    and char_length(trim(entity_slug)) >= 1
  );

grant insert (entity_type, entity_id, entity_slug, entity_name, reason, details, reporter_email, reporter_phone, status)
  on public.listing_reports to anon, authenticated;

-- 2. Official Verification Claims & Proof Intake Table
create table if not exists public.verification_claims (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('academy', 'venue', 'opportunity', 'coach')),
  entity_slug text not null,
  entity_name text not null,
  contact_name text not null check (char_length(trim(contact_name)) >= 2),
  contact_phone text not null check (char_length(trim(contact_phone)) >= 8),
  contact_email text,
  claimant_role text,
  document_type text not null check (document_type in ('affiliation_certificate', 'ground_lease', 'coaching_license', 'municipal_trade_license', 'geotagged_photos', 'other')),
  proof_details text not null check (char_length(trim(proof_details)) >= 5),
  status text not null default 'pending_review' check (status in ('pending_review', 'verified', 'rejected', 'more_info_needed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verification_claims enable row level security;

drop policy if exists "verification_claims_insert_community" on public.verification_claims;
create policy "verification_claims_insert_community" on public.verification_claims
  for insert to anon, authenticated
  with check (
    char_length(trim(contact_name)) >= 2
    and char_length(trim(contact_phone)) >= 8
    and char_length(trim(proof_details)) >= 5
  );

grant insert (entity_type, entity_slug, entity_name, contact_name, contact_phone, contact_email, claimant_role, document_type, proof_details, status)
  on public.verification_claims to anon, authenticated;

-- 3. Trust & Verification Columns on Academies
alter table public.academies
  add column if not exists affiliation_proof text,
  add column if not exists reported_count int not null default 0;

-- 4. Trust & Verification Columns on Venues
alter table public.venues
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  add column if not exists affiliation_proof text,
  add column if not exists reported_count int not null default 0;

commit;
