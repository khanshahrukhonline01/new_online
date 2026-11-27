-- ==============================================================================
-- KhelGrid Auth & Multi-Persona Taxonomy Alignment
-- Migration: 20261126000000_expand_profiles_role_check.sql
--
-- Purpose:
-- Align public.profiles.role CHECK constraint with all consumer & institutional
-- roles supported by auth-client.ts, PartnerOnboardingPage, and WorkspaceShell
-- ('athlete', 'parent', 'creator', 'coach', 'scout', 'academy', 'host',
-- 'venue_owner', 'tournament', 'organization', 'submitter', 'moderator', 'admin').
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_conname text;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'athlete';
  END IF;

  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN (
      'athlete',
      'parent',
      'creator',
      'coach',
      'scout',
      'academy',
      'host',
      'venue_owner',
      'tournament',
      'organization',
      'submitter',
      'moderator',
      'admin'
    ));
END $$;

COMMIT;
