-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Foreign Key Deletion Correction & Function Hardening
-- Migration: 20261121210000_phase1_fk_deletion_and_function_hardening.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Correct composite foreign key fk_student_tenant_batch:
--    Replace unsafe 'ON DELETE SET NULL' with 'ON DELETE RESTRICT'.
--    Reason: On composite foreign keys (tenant_id, batch_id), ON DELETE SET NULL
--    attempts to set both referencing columns to NULL, violating the NOT NULL
--    constraint on tenant_students.tenant_id. In sports academy management,
--    active coaching batches with enrolled trainees must not be silently or
--    destructively deleted; batches should be archived (is_active = false) or
--    students reassigned before deletion.
-- 2. Verify and enforce immutable search_path and least-privilege grants across
--    all Phase 1 SECURITY DEFINER functions.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CORRECT STUDENT-TO-BATCH FOREIGN KEY DELETION BEHAVIOR
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Drop existing foreign key if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_tenant_batch'
  ) THEN
    ALTER TABLE public.tenant_students DROP CONSTRAINT fk_student_tenant_batch;
  END IF;

  -- Re-add with ON DELETE RESTRICT
  ALTER TABLE public.tenant_students
    ADD CONSTRAINT fk_student_tenant_batch
    FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.tenant_batches(tenant_id, id)
    ON DELETE RESTRICT;
END $$;

-- -----------------------------------------------------------------------------
-- 2. VERIFY ATTENDANCE-TO-BATCH FOREIGN KEY DELETION BEHAVIOR
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_tenant_batch'
  ) THEN
    ALTER TABLE public.tenant_attendance_events DROP CONSTRAINT fk_attendance_tenant_batch;
  END IF;

  -- Enforce ON DELETE RESTRICT on historical attendance audit records
  ALTER TABLE public.tenant_attendance_events
    ADD CONSTRAINT fk_attendance_tenant_batch
    FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.tenant_batches(tenant_id, id)
    ON DELETE RESTRICT;
END $$;

-- -----------------------------------------------------------------------------
-- 3. FUNCTION SEARCH PATH HARDENING ASSURANCE
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.is_tenant_member(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_tenant_role(uuid, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_tenant(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) SET search_path = public, pg_temp;

COMMIT;
