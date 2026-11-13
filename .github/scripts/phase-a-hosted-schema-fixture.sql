-- Phase A CI fixture alignment.
-- The hosted development database already contains these catalogue/auth tables;
-- this lightweight PostgreSQL fixture creates only the omitted relations needed
-- to test the same Phase A grant and RLS boundary without copying production data.
BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY,
  slug text,
  zone text,
  is_metro boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.site_announcements (
  id uuid PRIMARY KEY,
  title text,
  is_active boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.chronicle_categories (
  id uuid PRIMARY KEY,
  slug text,
  name text,
  is_active boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.chronicle_papers (
  id uuid PRIMARY KEY,
  slug text,
  title text,
  publication_status text NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS public.chronicle_submissions (
  id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending_review'
);
CREATE TABLE IF NOT EXISTS public.trial_reminders (
  id uuid PRIMARY KEY,
  trial_slug text,
  notification_type text,
  user_id uuid,
  athlete_phone text,
  athlete_email text
);
CREATE TABLE IF NOT EXISTS public.verification_claims (
  id uuid PRIMARY KEY,
  contact_name text,
  contact_phone text,
  proof_details text
);
CREATE TABLE IF NOT EXISTS public.listing_reports (
  id uuid PRIMARY KEY,
  entity_slug text,
  details text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronicle_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronicle_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  -- The hosted schema has RLS enabled on every exposed public table. Mirror that
  -- invariant for all fixture-created public relations before testing grants.
  FOR r IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',r.nspname,r.relname);
  END LOOP;
END;
$$;

-- Mirror the owner-scoped profile and public intake policies used by hosted.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS chronicle_categories_read_all ON public.chronicle_categories;
CREATE POLICY chronicle_categories_read_all ON public.chronicle_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS chronicle_papers_public_read ON public.chronicle_papers;
CREATE POLICY chronicle_papers_public_read ON public.chronicle_papers
  FOR SELECT TO anon, authenticated USING (publication_status = 'published');
DROP POLICY IF EXISTS chronicle_submissions_public_insert ON public.chronicle_submissions;
CREATE POLICY chronicle_submissions_public_insert ON public.chronicle_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending_review');
DROP POLICY IF EXISTS trial_reminders_public_insert ON public.trial_reminders;
CREATE POLICY trial_reminders_public_insert ON public.trial_reminders
  FOR INSERT TO anon, authenticated WITH CHECK (athlete_phone IS NOT NULL OR athlete_email IS NOT NULL);
DROP POLICY IF EXISTS verification_claims_insert_community ON public.verification_claims;
CREATE POLICY verification_claims_insert_community ON public.verification_claims
  FOR INSERT TO anon, authenticated WITH CHECK (
    char_length(trim(contact_name)) >= 2
    AND char_length(trim(contact_phone)) >= 8
    AND char_length(trim(proof_details)) >= 5
  );
DROP POLICY IF EXISTS listing_reports_insert_community ON public.listing_reports;
CREATE POLICY listing_reports_insert_community ON public.listing_reports
  FOR INSERT TO anon, authenticated WITH CHECK (
    char_length(trim(details)) >= 5 AND char_length(trim(entity_slug)) >= 1
  );

COMMIT;
