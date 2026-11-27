-- =============================================================================
-- KhelGrid Coach Workspace — Phase 3 Operational SaaS Schema, RLS & RPCs
-- Target: Development Environment & Hosted Dev Supabase (Additive Only)
-- =============================================================================
-- Creates strict tenant/coach-isolated PostgreSQL tables for:
--   1. Consent-first Coach–Athlete Roster & Development Notes
--   2. Training Programmes & Structured Exercises + Assignments
--   3. Coach Calendar & Training Sessions (with server-side overlap guard)
--   4. Session Attendance Roll-Call
--   5. Multi-Category & Khelo India Physical Assessments
--   6. Security-hardened RPCs (updated overview metrics + athlete consent RPC)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. HARDEN coach_profiles.directory_coach_id AGAINST SELF-ASSIGNMENT SPOOFING
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_coach_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
  v_is_privileged boolean;
BEGIN
  v_is_privileged :=
    v_jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_coach_moderator();

  IF NOT v_is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verification_status := 'unverified';
      NEW.verification_feedback := NULL;
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      NEW.directory_coach_id := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Forbidden: coach_profiles.user_id cannot be reassigned.';
      END IF;

      IF NEW.directory_coach_id IS DISTINCT FROM OLD.directory_coach_id THEN
        RAISE EXCEPTION 'Forbidden: only authorized moderators can link public directory coach records.';
      END IF;

      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verification_feedback IS DISTINCT FROM OLD.verification_feedback
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Forbidden: only authorized moderators can modify coach verification status.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_coach_profile_verification() FROM PUBLIC;

-- Allow coaches with an administrator-linked directory_coach_id to read/manage
-- inquiries addressed to their verified directory coach entry.
DO $$
BEGIN
  IF to_regclass('public.coach_inquiries') IS NOT NULL THEN
    REVOKE ALL ON public.coach_inquiries FROM PUBLIC;
    GRANT INSERT ON public.coach_inquiries TO anon, authenticated;
    GRANT SELECT, UPDATE ON public.coach_inquiries TO authenticated;

    DROP POLICY IF EXISTS "Verified linked coach can view their inquiries" ON public.coach_inquiries;
    CREATE POLICY "Verified linked coach can view their inquiries"
      ON public.coach_inquiries
      FOR SELECT
      TO authenticated
      USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR EXISTS (
          SELECT 1
          FROM public.coach_profiles cp
          WHERE cp.user_id = auth.uid()
            AND cp.directory_coach_id IS NOT NULL
            AND cp.directory_coach_id = coach_inquiries.coach_id
        )
        OR public.is_coach_moderator()
      );

    DROP POLICY IF EXISTS "Verified linked coach can update inquiry status" ON public.coach_inquiries;
    CREATE POLICY "Verified linked coach can update inquiry status"
      ON public.coach_inquiries
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.coach_profiles cp
          WHERE cp.user_id = auth.uid()
            AND cp.directory_coach_id IS NOT NULL
            AND cp.directory_coach_id = coach_inquiries.coach_id
        )
        OR public.is_coach_moderator()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.coach_profiles cp
          WHERE cp.user_id = auth.uid()
            AND cp.directory_coach_id IS NOT NULL
            AND cp.directory_coach_id = coach_inquiries.coach_id
        )
        OR public.is_coach_moderator()
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. COACH–ATHLETE ROSTER (CONSENT-FIRST) & DEVELOPMENT NOTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  athlete_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_student_id uuid REFERENCES public.tenant_students(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 140),
  guardian_name text CHECK (guardian_name IS NULL OR char_length(trim(guardian_name)) <= 140),
  guardian_phone text CHECK (guardian_phone IS NULL OR char_length(trim(guardian_phone)) BETWEEN 7 AND 30),
  athlete_email text CHECK (athlete_email IS NULL OR char_length(trim(athlete_email)) <= 160),
  sport text NOT NULL CHECK (char_length(trim(sport)) BETWEEN 2 AND 80),
  age_group text NOT NULL DEFAULT 'Open' CHECK (char_length(trim(age_group)) BETWEEN 1 AND 60),
  age_years integer CHECK (age_years IS NULL OR (age_years >= 4 AND age_years <= 80)),
  gender text NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
  skill_level text NOT NULL DEFAULT 'Intermediate' CHECK (
    skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Elite', 'National')
  ),
  relationship_status text NOT NULL DEFAULT 'invited' CHECK (
    relationship_status IN ('invited', 'active', 'paused', 'released')
  ),
  consent_granted boolean NOT NULL DEFAULT false,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  accepted_at timestamptz,
  released_at timestamptz,
  goals_summary text CHECK (goals_summary IS NULL OR char_length(goals_summary) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_athletes_profile_status
  ON public.coach_athletes(coach_profile_id, relationship_status);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete_user
  ON public.coach_athletes(athlete_user_id)
  WHERE athlete_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coach_athletes_tenant
  ON public.coach_athletes(tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_coach_athlete_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
  v_is_privileged boolean;
BEGIN
  v_is_privileged :=
    v_jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin');

  -- Prevent a coach from forging consent on behalf of a linked registered KhelGrid user
  IF NOT v_is_privileged
     AND NEW.athlete_user_id IS NOT NULL
     AND auth.uid() IS DISTINCT FROM NEW.athlete_user_id THEN
    IF TG_OP = 'INSERT' THEN
      NEW.consent_granted := false;
      NEW.relationship_status := 'invited';
      NEW.accepted_at := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.consent_granted = true AND OLD.consent_granted = false THEN
        RAISE EXCEPTION 'Forbidden: linked athlete consent must be granted by the athlete account.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.relationship_status = 'active' AND OLD.consent_granted = false THEN
        RAISE EXCEPTION 'Forbidden: linked athlete relationship cannot become active without athlete consent.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF NEW.relationship_status = 'released' AND (TG_OP = 'INSERT' OR OLD.relationship_status IS DISTINCT FROM 'released') THEN
    NEW.released_at := COALESCE(NEW.released_at, now());
  END IF;

  IF NEW.consent_granted = true AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_coach_athlete_consent() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_guard_coach_athlete_consent ON public.coach_athletes;
CREATE TRIGGER trg_guard_coach_athlete_consent
  BEFORE INSERT OR UPDATE ON public.coach_athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_coach_athlete_consent();

ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_athletes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_athletes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_athletes TO authenticated;

DROP POLICY IF EXISTS "coach_athletes_select_authorized" ON public.coach_athletes;
CREATE POLICY "coach_athletes_select_authorized"
  ON public.coach_athletes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athletes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR (athlete_user_id IS NOT NULL AND athlete_user_id = auth.uid())
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach'])
    )
  );

DROP POLICY IF EXISTS "coach_athletes_insert_owner" ON public.coach_athletes;
CREATE POLICY "coach_athletes_insert_owner"
  ON public.coach_athletes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athletes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    AND (
      tenant_id IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
  );

DROP POLICY IF EXISTS "coach_athletes_update_owner" ON public.coach_athletes;
CREATE POLICY "coach_athletes_update_owner"
  ON public.coach_athletes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athletes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athletes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    AND (
      tenant_id IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
  );

DROP POLICY IF EXISTS "coach_athletes_delete_owner" ON public.coach_athletes;
CREATE POLICY "coach_athletes_delete_owner"
  ON public.coach_athletes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athletes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  );

-- Development & Coaching Notes (strictly separated coach_private vs shared_with_athlete)
CREATE TABLE IF NOT EXISTS public.coach_athlete_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_athlete_id uuid NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'development' CHECK (
    note_type IN ('development', 'tactical', 'fitness', 'injury_precaution', 'parent_update')
  ),
  visibility text NOT NULL DEFAULT 'coach_private' CHECK (
    visibility IN ('coach_private', 'shared_with_athlete')
  ),
  note_body text NOT NULL CHECK (char_length(trim(note_body)) BETWEEN 2 AND 3000),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_athlete_notes_athlete
  ON public.coach_athlete_notes(coach_athlete_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_coach_athlete_note_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_athletes ca
    WHERE ca.id = NEW.coach_athlete_id
      AND ca.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Invalid coach_athlete_notes link: athlete % does not belong to coach profile %.',
      NEW.coach_athlete_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coach_athlete_note_ownership() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_coach_athlete_note_ownership ON public.coach_athlete_notes;
CREATE TRIGGER trg_validate_coach_athlete_note_ownership
  BEFORE INSERT OR UPDATE ON public.coach_athlete_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_coach_athlete_note_ownership();

ALTER TABLE public.coach_athlete_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_athlete_notes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_athlete_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_athlete_notes TO authenticated;

DROP POLICY IF EXISTS "coach_notes_select_strict_visibility" ON public.coach_athlete_notes;
CREATE POLICY "coach_notes_select_strict_visibility"
  ON public.coach_athlete_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athlete_notes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR (
      visibility = 'shared_with_athlete'
      AND EXISTS (
        SELECT 1 FROM public.coach_athletes ca
        WHERE ca.id = coach_athlete_notes.coach_athlete_id
          AND ca.athlete_user_id IS NOT NULL
          AND ca.athlete_user_id = auth.uid()
          AND ca.relationship_status IN ('active', 'paused')
      )
    )
  );

DROP POLICY IF EXISTS "coach_notes_manage_owner" ON public.coach_athlete_notes;
CREATE POLICY "coach_notes_manage_owner"
  ON public.coach_athlete_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athlete_notes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athlete_notes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 2. TRAINING PROGRAMMES & ATHLETE ASSIGNMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_training_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  sport text NOT NULL CHECK (char_length(trim(sport)) BETWEEN 2 AND 80),
  target_age_group text NOT NULL DEFAULT 'Open' CHECK (char_length(trim(target_age_group)) BETWEEN 1 AND 60),
  difficulty_level text NOT NULL DEFAULT 'Intermediate' CHECK (
    difficulty_level IN ('Foundation', 'Beginner', 'Intermediate', 'Advanced', 'High Performance')
  ),
  duration_weeks integer NOT NULL DEFAULT 4 CHECK (duration_weeks BETWEEN 1 AND 52),
  sessions_per_week integer NOT NULL DEFAULT 3 CHECK (sessions_per_week BETWEEN 1 AND 14),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  summary text CHECK (summary IS NULL OR char_length(summary) <= 2500),
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exercises) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_programmes_profile_status
  ON public.coach_training_programmes(coach_profile_id, status);

DROP TRIGGER IF EXISTS trg_coach_training_programmes_updated_at ON public.coach_training_programmes;
CREATE TRIGGER trg_coach_training_programmes_updated_at
  BEFORE UPDATE ON public.coach_training_programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coach_programme_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.coach_training_programmes(id) ON DELETE CASCADE,
  coach_athlete_id uuid NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'paused')),
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, coach_athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_programme_assignments_profile
  ON public.coach_programme_assignments(coach_profile_id, coach_athlete_id);

CREATE OR REPLACE FUNCTION public.validate_coach_programme_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.coach_training_programmes p
    WHERE p.id = NEW.programme_id AND p.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Programme % does not belong to coach profile %.', NEW.programme_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.id = NEW.coach_athlete_id AND ca.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Athlete % does not belong to coach profile %.', NEW.coach_athlete_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coach_programme_assignment() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_coach_programme_assignment ON public.coach_programme_assignments;
CREATE TRIGGER trg_validate_coach_programme_assignment
  BEFORE INSERT OR UPDATE ON public.coach_programme_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_coach_programme_assignment();

ALTER TABLE public.coach_training_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_training_programmes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_training_programmes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_training_programmes TO authenticated;

DROP POLICY IF EXISTS "coach_programmes_select_authorized" ON public.coach_training_programmes;
CREATE POLICY "coach_programmes_select_authorized"
  ON public.coach_training_programmes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_training_programmes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach'])
    )
    OR EXISTS (
      SELECT 1
      FROM public.coach_programme_assignments cpa
      JOIN public.coach_athletes ca ON ca.id = cpa.coach_athlete_id
      WHERE cpa.programme_id = coach_training_programmes.id
        AND ca.athlete_user_id IS NOT NULL
        AND ca.athlete_user_id = auth.uid()
        AND ca.relationship_status IN ('active', 'paused')
    )
  );

DROP POLICY IF EXISTS "coach_programmes_manage_owner" ON public.coach_training_programmes;
CREATE POLICY "coach_programmes_manage_owner"
  ON public.coach_training_programmes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_training_programmes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_training_programmes.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    AND (
      tenant_id IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
  );

ALTER TABLE public.coach_programme_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_programme_assignments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_programme_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_programme_assignments TO authenticated;

DROP POLICY IF EXISTS "coach_assignments_select_authorized" ON public.coach_programme_assignments;
CREATE POLICY "coach_assignments_select_authorized"
  ON public.coach_programme_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_programme_assignments.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.id = coach_programme_assignments.coach_athlete_id
        AND ca.athlete_user_id IS NOT NULL
        AND ca.athlete_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coach_assignments_manage_owner" ON public.coach_programme_assignments;
CREATE POLICY "coach_assignments_manage_owner"
  ON public.coach_programme_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_programme_assignments.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_programme_assignments.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. CALENDAR & TRAINING SESSIONS (WITH TIME OVERLAP PREVENTION TRIGGER)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  programme_id uuid REFERENCES public.coach_training_programmes(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  sport text NOT NULL CHECK (char_length(trim(sport)) BETWEEN 2 AND 80),
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue_name text NOT NULL DEFAULT '' CHECK (char_length(venue_name) <= 180),
  location_city text NOT NULL DEFAULT '' CHECK (char_length(location_city) <= 120),
  session_mode text NOT NULL DEFAULT 'in_person' CHECK (session_mode IN ('in_person', 'online', 'hybrid')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  max_participants integer CHECK (max_participants IS NULL OR (max_participants >= 1 AND max_participants <= 200)),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_coach_sessions_profile_date
  ON public.coach_training_sessions(coach_profile_id, session_date, start_time);

CREATE OR REPLACE FUNCTION public.guard_coach_training_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.programme_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.coach_training_programmes p
    WHERE p.id = NEW.programme_id AND p.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Linked programme % does not belong to coach profile %.', NEW.programme_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.status IN ('scheduled', 'in_progress') THEN
    PERFORM pg_advisory_xact_lock(
      hashtext('coach_sess_' || NEW.coach_profile_id::text || '_' || NEW.session_date::text)
    );

    IF EXISTS (
      SELECT 1
      FROM public.coach_training_sessions s
      WHERE s.coach_profile_id = NEW.coach_profile_id
        AND s.id IS DISTINCT FROM NEW.id
        AND s.session_date = NEW.session_date
        AND s.status IN ('scheduled', 'in_progress')
        AND s.start_time < NEW.end_time
        AND s.end_time > NEW.start_time
    ) THEN
      RAISE EXCEPTION 'Session time conflict: another active session already overlaps % (% - %).',
        NEW.session_date, NEW.start_time, NEW.end_time
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_coach_training_session() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_guard_coach_training_session ON public.coach_training_sessions;
CREATE TRIGGER trg_guard_coach_training_session
  BEFORE INSERT OR UPDATE ON public.coach_training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_coach_training_session();

ALTER TABLE public.coach_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_training_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_training_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_training_sessions TO authenticated;

DROP POLICY IF EXISTS "coach_sessions_select_authorized" ON public.coach_training_sessions;
CREATE POLICY "coach_sessions_select_authorized"
  ON public.coach_training_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_training_sessions.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach'])
    )
  );

DROP POLICY IF EXISTS "coach_sessions_manage_owner" ON public.coach_training_sessions;
CREATE POLICY "coach_sessions_manage_owner"
  ON public.coach_training_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_training_sessions.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_training_sessions.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    AND (
      tenant_id IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
  );

-- -----------------------------------------------------------------------------
-- 4. SESSION ATTENDANCE ROLL-CALL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_training_sessions(id) ON DELETE CASCADE,
  coach_athlete_id uuid NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  marked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, coach_athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_attendance_session
  ON public.coach_session_attendance(session_id, status);
CREATE INDEX IF NOT EXISTS idx_coach_attendance_athlete
  ON public.coach_session_attendance(coach_athlete_id, marked_at DESC);

CREATE OR REPLACE FUNCTION public.validate_coach_attendance_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.coach_training_sessions s
    WHERE s.id = NEW.session_id AND s.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Session % does not belong to coach profile %.', NEW.session_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.id = NEW.coach_athlete_id AND ca.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Athlete % does not belong to coach profile %.', NEW.coach_athlete_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;

  NEW.marked_at := COALESCE(NEW.marked_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coach_attendance_ownership() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_coach_attendance_ownership ON public.coach_session_attendance;
CREATE TRIGGER trg_validate_coach_attendance_ownership
  BEFORE INSERT OR UPDATE ON public.coach_session_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_coach_attendance_ownership();

ALTER TABLE public.coach_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_session_attendance FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_session_attendance FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_session_attendance TO authenticated;

DROP POLICY IF EXISTS "coach_attendance_select_authorized" ON public.coach_session_attendance;
CREATE POLICY "coach_attendance_select_authorized"
  ON public.coach_session_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_session_attendance.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.id = coach_session_attendance.coach_athlete_id
        AND ca.athlete_user_id IS NOT NULL
        AND ca.athlete_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coach_attendance_manage_owner" ON public.coach_session_attendance;
CREATE POLICY "coach_attendance_manage_owner"
  ON public.coach_session_attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_session_attendance.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_session_attendance.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. ATHLETE PHYSICAL & TECHNICAL ASSESSMENTS (INCLUDING KHELO INDIA BATTERY)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_athlete_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  coach_athlete_id uuid NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  athlete_name text NOT NULL CHECK (char_length(trim(athlete_name)) BETWEEN 2 AND 140),
  category text NOT NULL CHECK (
    category IN ('khelo_india', 'speed', 'endurance', 'strength', 'agility', 'flexibility', 'technical', 'tactical')
  ),
  age_band text CHECK (age_band IS NULL OR age_band IN ('sub_junior_5_8', 'junior_9_14', 'senior_15_18', 'open')),
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  grade_band text NOT NULL CHECK (char_length(trim(grade_band)) BETWEEN 1 AND 60),
  sai_report_code text CHECK (sai_report_code IS NULL OR char_length(sai_report_code) <= 60),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) IN ('object', 'array')),
  coach_summary text CHECK (coach_summary IS NULL OR char_length(coach_summary) <= 2500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_assessments_profile_date
  ON public.coach_athlete_assessments(coach_profile_id, assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_assessments_athlete
  ON public.coach_athlete_assessments(coach_athlete_id, assessment_date DESC);

CREATE OR REPLACE FUNCTION public.validate_coach_assessment_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.id = NEW.coach_athlete_id AND ca.coach_profile_id = NEW.coach_profile_id
  ) THEN
    RAISE EXCEPTION 'Athlete % does not belong to coach profile %.', NEW.coach_athlete_id, NEW.coach_profile_id
      USING ERRCODE = '23503';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coach_assessment_ownership() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_coach_assessment_ownership ON public.coach_athlete_assessments;
CREATE TRIGGER trg_validate_coach_assessment_ownership
  BEFORE INSERT OR UPDATE ON public.coach_athlete_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_coach_assessment_ownership();

ALTER TABLE public.coach_athlete_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_athlete_assessments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_athlete_assessments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_athlete_assessments TO authenticated;

DROP POLICY IF EXISTS "coach_assessments_select_authorized" ON public.coach_athlete_assessments;
CREATE POLICY "coach_assessments_select_authorized"
  ON public.coach_athlete_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athlete_assessments.coach_profile_id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.id = coach_athlete_assessments.coach_athlete_id
        AND ca.athlete_user_id IS NOT NULL
        AND ca.athlete_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coach_assessments_manage_owner" ON public.coach_athlete_assessments;
CREATE POLICY "coach_assessments_manage_owner"
  ON public.coach_athlete_assessments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athlete_assessments.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_athlete_assessments.coach_profile_id
        AND cp.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 6. SECURITY DEFINER RPCs: ATHLETE CONSENT & LIVE PHASE 3 DASHBOARD OVERVIEW
-- -----------------------------------------------------------------------------

-- 6.1 Consent acceptance / withdrawal by the invited athlete user
CREATE OR REPLACE FUNCTION public.coach_accept_athlete_consent(
  p_coach_athlete_id uuid,
  p_accept boolean DEFAULT true
)
RETURNS public.coach_athletes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.coach_athletes%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to respond to coach consent invitation.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.coach_athletes
  WHERE id = p_coach_athlete_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coach-athlete invitation % not found.', p_coach_athlete_id;
  END IF;

  IF v_row.athlete_user_id IS NULL OR v_row.athlete_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden: only the invited athlete can update relationship consent.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.coach_athletes
  SET
    consent_granted = COALESCE(p_accept, false),
    relationship_status = CASE WHEN COALESCE(p_accept, false) THEN 'active' ELSE 'released' END,
    accepted_at = CASE WHEN COALESCE(p_accept, false) THEN now() ELSE accepted_at END,
    released_at = CASE WHEN COALESCE(p_accept, false) THEN NULL ELSE now() END,
    updated_at = now()
  WHERE id = p_coach_athlete_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_accept_athlete_consent(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_accept_athlete_consent(uuid, boolean) TO authenticated;

-- 6.2 Updated Coach Dashboard Overview aggregating BOTH Phase 3 coach_* records
-- and authorized tenant operational records with weighted live metrics.
CREATE OR REPLACE FUNCTION public.get_coach_dashboard_overview(
  p_tenant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_coach_profile_id uuid;
  v_directory_coach_id uuid;
  v_total_athletes integer := 0;
  v_active_athletes integer := 0;
  v_pending_requests integer := 0;
  v_active_programmes integer := 0;
  v_upcoming_sessions integer := 0;
  v_completed_sessions integer := 0;
  v_pending_assessments integer := 0;
  v_attendance_rate numeric := NULL;
  v_attendance_total integer := 0;
  v_attendance_present integer := 0;
  v_tenant_completed_sessions integer := 0;
  v_tenant_att_total integer := 0;
  v_tenant_att_present integer := 0;
  v_coach_att_total integer := 0;
  v_coach_att_present integer := 0;
  v_academy_associations integer := 0;
  v_unread_notifications integer := 0;
  v_recent_requests jsonb := '[]'::jsonb;
  v_recent_batches jsonb := '[]'::jsonb;
  v_recent_notifications jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view coach overview.';
  END IF;

  SELECT id, directory_coach_id
  INTO v_coach_profile_id, v_directory_coach_id
  FROM public.coach_profiles
  WHERE user_id = v_user_id;

  -- Coach personal operational workspace records
  IF v_coach_profile_id IS NOT NULL THEN
    SELECT
      count(*) FILTER (WHERE relationship_status <> 'released')::int,
      count(*) FILTER (WHERE relationship_status = 'active')::int,
      count(*) FILTER (WHERE relationship_status = 'invited')::int
    INTO v_total_athletes, v_active_athletes, v_pending_requests
    FROM public.coach_athletes
    WHERE coach_profile_id = v_coach_profile_id;

    SELECT count(*)::int
    INTO v_active_programmes
    FROM public.coach_training_programmes
    WHERE coach_profile_id = v_coach_profile_id
      AND status = 'active';

    SELECT
      count(*) FILTER (WHERE status IN ('scheduled', 'in_progress') AND session_date >= CURRENT_DATE)::int,
      count(*) FILTER (WHERE status = 'completed' AND session_date >= (CURRENT_DATE - INTERVAL '30 days'))::int
    INTO v_upcoming_sessions, v_completed_sessions
    FROM public.coach_training_sessions
    WHERE coach_profile_id = v_coach_profile_id;

    SELECT
      count(*)::int,
      count(*) FILTER (WHERE csa.status IN ('present', 'late'))::int
    INTO v_coach_att_total, v_coach_att_present
    FROM public.coach_session_attendance csa
    JOIN public.coach_training_sessions cts ON cts.id = csa.session_id
    WHERE csa.coach_profile_id = v_coach_profile_id
      AND cts.session_date >= (CURRENT_DATE - INTERVAL '30 days');

    -- Active athletes who do not yet have an assessment recorded in the last 30 days
    SELECT count(*)::int
    INTO v_pending_assessments
    FROM public.coach_athletes ca
    WHERE ca.coach_profile_id = v_coach_profile_id
      AND ca.relationship_status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM public.coach_athlete_assessments a
        WHERE a.coach_athlete_id = ca.id
          AND a.assessment_date >= (CURRENT_DATE - INTERVAL '30 days')
      );

    SELECT COALESCE(jsonb_agg(row_to_json(sess)), '[]'::jsonb)
    INTO v_recent_batches
    FROM (
      SELECT
        s.id,
        s.title AS batch_name,
        s.sport,
        to_char(s.session_date, 'Dy DD Mon') AS days,
        to_char(s.start_time, 'HH24:MI') || ' - ' || to_char(s.end_time, 'HH24:MI') AS timings,
        initcap(replace(s.session_mode, '_', ' ')) AS age_group,
        COALESCE(s.max_participants, 0) AS max_capacity
      FROM public.coach_training_sessions s
      WHERE s.coach_profile_id = v_coach_profile_id
        AND s.status IN ('scheduled', 'in_progress')
        AND s.session_date >= CURRENT_DATE
      ORDER BY s.session_date ASC, s.start_time ASC
      LIMIT 5
    ) sess;

    -- Surface pending athlete invites or linked directory inquiries
    IF v_directory_coach_id IS NOT NULL AND to_regclass('public.coach_inquiries') IS NOT NULL THEN
      SELECT v_pending_requests + count(*)::int
      INTO v_pending_requests
      FROM public.coach_inquiries
      WHERE coach_id = v_directory_coach_id
        AND status IN ('submitted', 'contacted');
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(req)), '[]'::jsonb)
    INTO v_recent_requests
    FROM (
      SELECT
        ca.id,
        upper('ATH-' || substring(ca.id::text FROM 1 FOR 6)) AS enquiry_token,
        ca.full_name AS student_name,
        COALESCE(ca.guardian_name, ca.full_name) AS parent_name,
        ca.sport,
        'athlete_invite' AS request_type,
        ca.relationship_status AS status,
        ca.created_at AS submitted_at
      FROM public.coach_athletes ca
      WHERE ca.coach_profile_id = v_coach_profile_id
        AND ca.relationship_status = 'invited'
      ORDER BY ca.created_at DESC
      LIMIT 5
    ) req;

    IF jsonb_array_length(v_recent_requests) = 0
       AND v_directory_coach_id IS NOT NULL
       AND to_regclass('public.coach_inquiries') IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(row_to_json(inq)), '[]'::jsonb)
      INTO v_recent_requests
      FROM (
        SELECT
          ci.id,
          ci.inquiry_token AS enquiry_token,
          ci.athlete_name AS student_name,
          COALESCE(ci.parent_name, ci.athlete_name) AS parent_name,
          ci.sport,
          ci.training_type AS request_type,
          ci.status,
          ci.created_at AS submitted_at
        FROM public.coach_inquiries ci
        WHERE ci.coach_id = v_directory_coach_id
          AND ci.status IN ('submitted', 'contacted')
        ORDER BY ci.created_at DESC
        LIMIT 5
      ) inq;
    END IF;
  END IF;

  -- Tenant-scoped records (for coaches belonging to an academy/coach tenant)
  IF p_tenant_id IS NOT NULL THEN
    IF NOT public.is_tenant_member(p_tenant_id)
       OR NOT public.has_tenant_role(
         p_tenant_id,
         ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']
       ) THEN
      RAISE EXCEPTION 'Forbidden: caller lacks coach-eligible active membership on tenant %.', p_tenant_id;
    END IF;

    SELECT
      v_total_athletes + count(*)::int,
      v_active_athletes + count(*) FILTER (WHERE is_active = true)::int
    INTO v_total_athletes, v_active_athletes
    FROM public.tenant_students
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL;

    SELECT v_pending_requests + count(*)::int
    INTO v_pending_requests
    FROM public.tenant_enquiries
    WHERE tenant_id = p_tenant_id
      AND status IN ('new', 'contacted', 'trial_scheduled');

    SELECT v_active_programmes + count(*)::int
    INTO v_active_programmes
    FROM public.tenant_batches
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND is_active = true;

    SELECT
      count(DISTINCT (batch_id::text || ':' || session_date::text))::int,
      count(*)::int,
      count(*) FILTER (WHERE status IN ('present', 'late'))::int
    INTO v_tenant_completed_sessions, v_tenant_att_total, v_tenant_att_present
    FROM public.tenant_attendance_events
    WHERE tenant_id = p_tenant_id
      AND session_date >= (CURRENT_DATE - INTERVAL '30 days');

    v_completed_sessions := v_completed_sessions + v_tenant_completed_sessions;

    IF jsonb_array_length(v_recent_requests) = 0 THEN
      SELECT COALESCE(jsonb_agg(row_to_json(req)), '[]'::jsonb)
      INTO v_recent_requests
      FROM (
        SELECT id, enquiry_token, student_name, parent_name, sport, request_type, status, submitted_at
        FROM public.tenant_enquiries
        WHERE tenant_id = p_tenant_id
          AND status IN ('new', 'contacted', 'trial_scheduled')
        ORDER BY submitted_at DESC
        LIMIT 5
      ) req;
    END IF;

    IF jsonb_array_length(v_recent_batches) = 0 THEN
      SELECT COALESCE(jsonb_agg(row_to_json(bat)), '[]'::jsonb)
      INTO v_recent_batches
      FROM (
        SELECT id, batch_name, sport, days, timings, age_group, max_capacity
        FROM public.tenant_batches
        WHERE tenant_id = p_tenant_id
          AND deleted_at IS NULL
          AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 5
      ) bat;
    END IF;
  END IF;

  -- Combined weighted attendance calculation across personal sessions & tenant sessions
  v_attendance_total := COALESCE(v_coach_att_total, 0) + COALESCE(v_tenant_att_total, 0);
  v_attendance_present := COALESCE(v_coach_att_present, 0) + COALESCE(v_tenant_att_present, 0);
  IF v_attendance_total > 0 THEN
    v_attendance_rate := ROUND(100.0 * v_attendance_present / v_attendance_total, 1);
  END IF;

  -- Academy / institutional coaching associations
  SELECT count(*)::int
  INTO v_academy_associations
  FROM public.tenant_memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = v_user_id
    AND m.status = 'active'
    AND m.deleted_at IS NULL
    AND t.status = 'active'
    AND t.deleted_at IS NULL
    AND t.tenant_type IN ('academy', 'club', 'school', 'college', 'university', 'training_org')
    AND m.role IN ('owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach');

  IF to_regclass('public.user_notifications') IS NOT NULL THEN
    SELECT count(*)::int
    INTO v_unread_notifications
    FROM public.user_notifications
    WHERE user_id = v_user_id
      AND is_read = false;

    SELECT COALESCE(jsonb_agg(row_to_json(notif)), '[]'::jsonb)
    INTO v_recent_notifications
    FROM (
      SELECT id, category, title, message, action_url, is_read, created_at
      FROM public.user_notifications
      WHERE user_id = v_user_id
      ORDER BY created_at DESC
      LIMIT 5
    ) notif;
  END IF;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'totalAthletes', v_total_athletes,
      'activeAthletes', v_active_athletes,
      'pendingAthleteRequests', v_pending_requests,
      'activeProgrammes', v_active_programmes,
      'upcomingSessions', v_upcoming_sessions,
      'completedSessions', v_completed_sessions,
      'pendingAssessments', v_pending_assessments,
      'attendanceRatePct', v_attendance_rate,
      'attendanceEventsCount', v_attendance_total,
      'academyAssociations', v_academy_associations,
      'unreadNotifications', v_unread_notifications
    ),
    'recentRequests', v_recent_requests,
    'recentBatches', v_recent_batches,
    'recentNotifications', v_recent_notifications
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_dashboard_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard_overview(uuid) TO authenticated;

COMMIT;
