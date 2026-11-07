# KhelGrid Security Programme — Phase 8: Listing, Content & Moderation Security

> **Document ID:** SEC-P8-MOD-002  
> **Status:** Implemented in code | Verified in Isolated PostgreSQL 17  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** `hznsbxvovjxvmnchzzqt` (Development)  
> **Migration File:** `supabase/migrations/20261108100000_phase5_2_critical_remediation_and_closure.sql`  

---

## 1. Executive Summary

Phase 8 secures the community directory submission, review, and verification workflow. In open sports platforms, a major vulnerability is directory submitters exploiting elevated credentials to approve their own venues, academies, or tournament listings.

Phase 5.2 hardens `public.review_listing_submission` with an immutable anti-self-approval rule and an append-only audit log in `public.listing_moderation_audit_logs`.

---

## 2. Anti-Self-Approval Enforcement & Audit Architecture

```sql
CREATE OR REPLACE FUNCTION public.review_listing_submission(
  p_submission_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
...
BEGIN
  v_reviewer_id := auth.uid();
  IF v_reviewer_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required.');
  END IF;

  -- 1. Moderator / Admin Authorization
  IF NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Moderator privileges required.');
  END IF;

  -- 2. Anti-Self-Approval Rule
  SELECT id, submitted_by, status INTO v_submission FROM public.listing_submissions WHERE id = p_submission_id LIMIT 1;
  IF v_submission.submitted_by = v_reviewer_id THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'SELF_APPROVAL_PROHIBITED',
      'message', 'Security violation: Submitter cannot approve their own submission.'
    );
  END IF;

  -- 3. Atomic Status Transition
  UPDATE public.listing_submissions SET status = p_decision, updated_at = now() WHERE id = p_submission_id;

  -- 4. Append-Only Audit Trail
  INSERT INTO public.listing_moderation_audit_logs (submission_id, reviewer_id, action, review_notes)
  VALUES (p_submission_id, v_reviewer_id, p_decision, p_notes);

  RETURN jsonb_build_object('status', 'success', 'submission_id', p_submission_id, 'action', p_decision);
END;
```

---

## 3. Verification Evidence

- **Isolated PostgreSQL 17 Test Suite** (`SEC-TEST-ISO-03`):
  - Submitter attempting self-approval -> rejected with `SELF_APPROVAL_PROHIBITED`.
  - Submission status verified to remain `'pending'`.
  - Independent moderator review -> succeeds, status transitions to `'approved'`, and audit entry is recorded.
