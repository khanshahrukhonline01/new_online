# KhelGrid Security Programme — Phase 6: Athlete Privacy & Statutory Minor Protection Architecture

> **Document ID:** SEC-P6-ARCH-002  
> **Status:** Implemented in code | Tested in Isolated PostgreSQL 17  
> **Applicable Regulations:** Digital Personal Data Protection Act, 2023 (DPDP Act 2023)  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Migration File:** `supabase/migrations/20261108100000_phase5_2_critical_remediation_and_closure.sql`  

---

## 1. Architectural Principles

1. **Private-by-Default Athlete Profiles**: Direct table access via PostgREST is owner-only (`auth.uid() = user_id`). Public discovery queries route strictly through the `get_athlete_public_cv(p_username)` RPC.
2. **Elimination of Public INSERT Vulnerability**: Dropped the legacy `athlete_profiles_public_insert` policy. Profile creation is strictly authenticated and owner-bound.
3. **Statutory Minor Protection (< 18 Years)**: Dynamic PostgreSQL age computation identifies minors. Minors remain completely invisible to the public directory unless an active, evidence-verified guardian consent record exists.
4. **Data Minimization on Public Projections**: Even when approved for public listing, minor athletes have their direct phone number, email address, and exact date of birth suppressed (only birth year is projected).
5. **Immutable Consent Logs**: Normal users cannot delete records from `public.user_consents`. Revocation is performed via `UPDATE` setting `revoked_at = now()`, preserving statutory compliance history.

---

## 2. Statutory Guardian Verification Architecture

Under DPDP Act 2023 Section 9, a self-asserted timestamp does not constitute legal proof of guardian consent. The table `public.guardian_consents` enforces:

```sql
CREATE TABLE IF NOT EXISTS public.guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guardian_name text NOT NULL,
  guardian_phone text NOT NULL,
  guardian_email text,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'legal_guardian', 'authorized_coach')),
  consent_scope text NOT NULL DEFAULT 'profile_and_trials',
  is_verified boolean NOT NULL DEFAULT false, -- STRICTLY FALSE UNTIL EVIDENCE RECORDED
  verified_at timestamptz DEFAULT NULL,
  verified_by uuid REFERENCES auth.users(id),
  verification_method text DEFAULT NULL,
  evidence_reference text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz DEFAULT NULL
);
```

### Minor Visibility Decision Logic inside `get_athlete_public_cv`:
```sql
v_is_minor := (v_athlete.date_of_birth IS NOT NULL AND v_athlete.date_of_birth > (CURRENT_DATE - INTERVAL '18 years'));
IF v_is_minor THEN
    SELECT EXISTS (
        SELECT 1 FROM public.guardian_consents
        WHERE minor_user_id = v_athlete.user_id
          AND is_active = true
          AND is_verified = true
          AND revoked_at IS NULL
    ) INTO v_has_guardian_consent;

    IF NOT v_has_guardian_consent THEN
        RETURN NULL; -- Profile remains completely private
    END IF;
    v_birth_year := extract(YEAR FROM v_athlete.date_of_birth)::int;
END IF;
```

---

## 3. Verification Evidence

- **Isolated PostgreSQL 17 Test Suite** (`SEC-TEST-ISO-04`):
  - Minor athlete with `is_verified = false` -> `get_athlete_public_cv` returns `null`.
  - Minor athlete with `is_verified = true` -> returns sanitized public view, omitting phone and email.
  - Revoked consent -> returns `null` immediately.
