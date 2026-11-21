# KhelGrid SaaS Platform — Phase 1: RLS Table Policy & Defense-in-Depth Audit
## Independent Technical Evaluation of Tables with RLS Enabled and Zero Client Policies

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Development Database:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Scope:** Security Advisor Finding — 4 RLS Tables Without Client Policies  
**Audit Status:** **Complete & Approved (Intentional Deny-All Defense-in-Depth Posture)**  

---

## 1. Executive Summary & Security Advisor Context

The Supabase Security Advisor automated scanner flags any table that meets the condition:
```sql
c.relrowsecurity = true AND NOT EXISTS (
  SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
)
```
with the warning: *"Table has RLS enabled, but no policies exist. All queries from non-superusers will be denied."*

In naive development workflows, this warning often indicates an accidental lockout where a developer turned on RLS but forgot to write policies.

However, in rigorous production systems, **enabling RLS with zero policies combined with `REVOKE ALL ON TABLE FROM PUBLIC, anon, authenticated` is a standard, battle-tested defense-in-depth security pattern for internal, audit, and evidence tables**.

Direct access from web clients via PostgREST is completely shut down. Legitimate operations are mediated exclusively through:
1. Privileged `SECURITY DEFINER` stored procedures that execute with strictly fixed `search_path` and explicit authorization checks.
2. Trusted backend processes executing under the elevated `service_role` credential (e.g., Supabase Edge Functions or background jobs).

Adding permissive or broad RLS policies to these tables solely to "silence" a dashboard alert would introduce critical security vulnerabilities, such as exposing moderator identity, leak of verification evidence, or exposing payment audit trails to unprivileged users.

---

## 2. Table-by-Table Architectural and Security Evaluation

### Table 1: `public.athlete_profile_moderation_audit`

#### A. Data Stored & Sensitivity
- **Columns:** `id` (uuid), `athlete_profile_id` (uuid), `actor_user_id` (uuid), `old_publication_status` (text), `new_publication_status` (text), `old_verification_status` (text), `new_verification_status` (text), `moderation_note` (text), `created_at` (timestamptz).
- **Sensitivity:** **HIGH**. Contains internal reviewer commentary, moderator identity (`actor_user_id`), athlete suspension/verification rationales, and historical publication decisions.

#### B. Application Workflows & Authorized Writers
- **Workflow:** Athlete profile verification and publication review by trusted administrators and platform moderators.
- **Authorized Writer:** Strictly written via the `SECURITY DEFINER` function `public.moderate_athlete_profile(p_profile_id uuid, p_publication_status text, p_verification_status text, p_moderation_note text)`.
- **Caller Roles Allowed Direct Access:** **NONE**. Neither `anon` nor `authenticated` web clients may insert rows directly.

#### C. Reading, Updating, and Deletion Policy
- **SELECT:** Restricted to platform administrators via administrative RPCs or Supabase Studio (`service_role`). Unrelated athletes and authenticated users must never inspect internal moderation notes or audit logs.
- **UPDATE / DELETE:** **STRICTLY PROHIBITED (IMMUTABLE)**. Audit trails must never be modified or expunged by any client role.

#### D. Supporting Schema Definition & Access Grants
```sql
CREATE TABLE IF NOT EXISTS public.athlete_profile_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_profile_id uuid NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  old_publication_status text NOT NULL,
  new_publication_status text NOT NULL,
  old_verification_status text NOT NULL,
  new_verification_status text NOT NULL,
  moderation_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_profile_moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.athlete_profile_moderation_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.athlete_profile_moderation_audit TO service_role;
```

#### E. Security Decision & Verdict
- **Decision:** **MAINTAIN ZERO POLICIES (DENY-ALL DEFENSE-IN-DEPTH)**.
- **Justification:** Direct client interaction returns `42501 (permission denied)`. Legitimate verification flows are fully encapsulated in `moderate_athlete_profile()`.

---

### Table 2: `public.listing_moderator_access_audits`

#### A. Data Stored & Sensitivity
- **Columns:** `id` (uuid), `target_user_id` (uuid), `actor_id` (uuid), `action` (text), `old_role` (text), `new_role` (text), `old_is_active` (boolean), `new_is_active` (boolean), `notes` (text), `created_at` (timestamptz).
- **Sensitivity:** **CRITICAL**. Contains internal security audit logs tracking who granted, altered, activated, or revoked moderator privileges across KhelGrid staff.

#### B. Application Workflows & Authorized Writers
- **Workflow:** Super-admin management of moderation personnel, listing reviewer role assignments, and permission changes.
- **Authorized Writer:** Written exclusively by administrative RPCs or secure backend service functions.
- **Caller Roles Allowed Direct Access:** **NONE**.

#### C. Reading, Updating, and Deletion Policy
- **SELECT:** Service role and authorized compliance auditors only.
- **UPDATE / DELETE:** **STRICTLY FORBIDDEN**. Security audit records are append-only.

#### D. Supporting Schema Definition & Access Grants
```sql
CREATE TABLE IF NOT EXISTS public.listing_moderator_access_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('granted', 'role_changed', 'activated', 'deactivated')),
  old_role text,
  new_role text,
  old_is_active boolean,
  new_is_active boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_moderator_access_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_moderator_access_audits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_moderator_access_audits TO service_role;
```

#### E. Security Decision & Verdict
- **Decision:** **MAINTAIN ZERO POLICIES (DENY-ALL DEFENSE-IN-DEPTH)**.
- **Justification:** Tampering with or reading moderator role changes from client sessions is prevented at both the privilege and RLS layers.

---

### Table 3: `public.listing_submission_evidence`

#### A. Data Stored & Sensitivity
- **Columns:** `id` (uuid), `submission_id` (uuid), `evidence_type` (text), `evidence_url` (text), `description` (text), `outcome` (text), `created_by` (uuid), `reviewed_by` (uuid), `reviewer_notes` (text), `reviewed_at` (timestamptz), `created_at` (timestamptz), `updated_at` (timestamptz).
- **Sensitivity:** **HIGH**. Contains private documentation submitted by academy owners, coaches, and venue managers to verify listing authenticity (e.g., government registrations, affiliation certificates, identity proofs, official contact records), plus internal moderator outcome assessments.

#### B. Application Workflows & Authorized Writers
- **Workflow:** Public listing onboarding and claim verification. Submitters upload proof documents during listing registration.
- **Authorized Writer:** Handled through vetted listing submission RPCs that validate evidence URLs (`^https://`) and link them to `submission_id`.
- **Why Submitters Must Not Read Directly:** If authenticated users could query this table directly, any registered user or competitor could enumerate and download confidential business evidence and government documents of other academies.

#### C. Reading, Updating, and Deletion Policy
- **SELECT:** Restricted to verified listing moderators via `admin_moderate_listing_submission` and service-role backends.
- **UPDATE / DELETE:** Restricted to moderation outcome workflows. Client-side mutations are denied.

#### D. Supporting Schema Definition & Access Grants
```sql
CREATE TABLE IF NOT EXISTS public.listing_submission_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.listing_submissions(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'official_source', 'organizer_identity', 'venue_address', 'event_details',
    'coach_qualification', 'academy_identity', 'other'
  )),
  evidence_url text NOT NULL CHECK (evidence_url ~* '^https://'),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
  outcome text NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending', 'supports', 'contradicts', 'insufficient')),
  created_by uuid NOT NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_submission_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_submission_evidence FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_submission_evidence TO service_role;
```

#### E. Security Decision & Verdict
- **Decision:** **MAINTAIN ZERO POLICIES (DENY-ALL DEFENSE-IN-DEPTH)**.
- **Justification:** Eliminates cross-submitter evidence theft and protects sensitive verification documents from public enumeration.

---

### Table 4: `public.payment_manual_verification_audit`

#### A. Data Stored & Sensitivity
- **Columns:** `id` (uuid), `payment_record_id` (uuid), `actor_user_id` (uuid), `order_id` (text), `payment_reference` (text), `amount_paisa` (bigint), `verification_note` (text), `created_at` (timestamptz).
- **Sensitivity:** **CRITICAL FINANCIAL AUDIT**. Contains bank payment references, transaction amounts in paisa, and manual verification rationale.

#### B. Application Workflows & Current Status
- **Current Platform Mandate:** Payment collection is strictly **PAUSED**. Listings and academy onboarding remain 100% free; verification is the sole gate.
- **Workflow:** In the event of offline payment verification (e.g., manual bank reconciliation by a finance officer), transactions are audited.
- **Authorized Writer:** Strictly written via `public.admin_verify_manual_payment(p_order_id, p_payment_reference, p_expected_amount_paisa, p_verification_note)`.
- **Payment Activation Prohibited:** No live Razorpay transactions, recurring subscriptions, or online payment collections are enabled in Phase 1.

#### C. Reading, Updating, and Deletion Policy
- **SELECT:** Restricted to finance compliance and super-administrators via service role.
- **UPDATE / DELETE:** **FORBIDDEN (IMMUTABLE FINANCIAL LEDGER)**.

#### D. Supporting Schema Definition & Access Grants
```sql
CREATE TABLE IF NOT EXISTS public.payment_manual_verification_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id uuid NOT NULL REFERENCES public.khelgrid_payments(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  order_id text NOT NULL,
  payment_reference text NOT NULL,
  amount_paisa bigint NOT NULL CHECK (amount_paisa > 0),
  verification_note text NOT NULL CHECK (char_length(verification_note) BETWEEN 10 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_manual_verification_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_manual_verification_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_manual_verification_audit TO service_role;
```

#### E. Security Decision & Verdict
- **Decision:** **MAINTAIN ZERO POLICIES (DENY-ALL DEFENSE-IN-DEPTH)**.
- **Justification:** Zero direct client access guarantees that unauthenticated visitors and authenticated tenant users cannot view financial ledger audits or forge payment verifications.

---

## 3. Summary Decision Matrix for Security Advisor Findings

| Table Name | RLS Enabled | Policies | Direct Client Access | Authorized Ingress Path | Recommended Action |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `athlete_profile_moderation_audit` | **YES** | 0 (Deny-All) | `42501` Denied | `moderate_athlete_profile()` RPC | **Keep Deny-All** (No changes) |
| `listing_moderator_access_audits` | **YES** | 0 (Deny-All) | `42501` Denied | Admin Moderator RPCs / `service_role` | **Keep Deny-All** (No changes) |
| `listing_submission_evidence` | **YES** | 0 (Deny-All) | `42501` Denied | Listing Submission RPCs / `service_role`| **Keep Deny-All** (No changes) |
| `payment_manual_verification_audit` | **YES** | 0 (Deny-All) | `42501` Denied | `admin_verify_manual_payment()` RPC | **Keep Deny-All** (No changes) |

---

## 4. Verification Evidence in Local PostgreSQL 16.4

In the local test runner (`scripts/run-comprehensive-postgres-rls-suite.py`):
1. An anonymous client executing `SELECT * FROM public.athlete_profile_moderation_audit;` immediately receives PostgreSQL error `42501 (permission denied for table athlete_profile_moderation_audit)`.
2. An authenticated non-moderator client attempting direct reads or writes receives `42501`.
3. The table remains completely secure against tampering, information leaks, and cross-tenant data snooping.
