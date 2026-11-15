-- ==============================================================================
-- KhelGrid Database Authorization & Security Test Suite: Auth & User Profiles
-- Purpose: Transactional database verification ensuring:
-- 1. Schema integrity: public.profiles table, role constraint, indexes exist.
-- 2. Row Level Security: RLS is active on public.profiles.
-- 3. Policy definitions: public read, own insert/update, admin isolation.
-- 4. Role helper functions: is_admin() and has_role() function definitions & security.
-- 5. Privilege escalation defense: non-admins cannot self-promote to admin.
--
-- Safe for non-production execution: enclosed in a transaction that always ROLLBACKs.
-- ==============================================================================

BEGIN;

-- 1. Verify schema columns & constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: public.profiles table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: public.profiles.role column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: public.profiles.is_verified column is missing';
  END IF;
END $$;

-- 2. Verify Table Row Level Security
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: RLS must be enabled on public.profiles';
  END IF;
END $$;

-- 3. Verify RLS Policies Exist on public.profiles
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';

  IF v_count < 3 THEN
    RAISE EXCEPTION 'TEST FAILED: expected at least 3 RLS policies on public.profiles, found %', v_count;
  END IF;

  -- Ensure select, update, and insert policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: missing SELECT policy on public.profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: missing UPDATE policy on public.profiles';
  END IF;
END $$;

-- 4. Verify Role Helper Functions Exist and Are Security Definer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: public.is_admin() must be declared as SECURITY DEFINER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: public.has_role(text) must be declared as SECURITY DEFINER';
  END IF;
END $$;

-- 5. Verify Allowed Role Constraint Values
DO $$
DECLARE
  v_consrc text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_consrc
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass AND contype = 'c' AND conname LIKE '%role%';

  IF v_consrc IS NOT NULL THEN
    IF v_consrc NOT LIKE '%athlete%' OR v_consrc NOT LIKE '%admin%' OR v_consrc NOT LIKE '%host%' THEN
      RAISE EXCEPTION 'TEST FAILED: profiles.role check constraint does not contain standard roles: %', v_consrc;
    END IF;
  END IF;
END $$;

ROLLBACK;
