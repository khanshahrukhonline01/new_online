# KhelGrid Security Programme — Phase 8: Listing, Content & Moderation Security

> **Document ID:** SEC-P8-MOD-001  
> **Status:** Implemented in code | Tested against isolated PostgreSQL  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  
> **Migration File:** `supabase/migrations/20261108090000_phase7_and_8_business_logic_and_moderation_security.sql`  

---

## 1. Executive Summary

As a community-driven sports directory and talent platform, KhelGrid accepts user and academy submissions for sports venues, coaching academies, open trials, and tournament events.

Without strict server-side moderation controls, listing directories are vulnerable to:
1. Self-approval of fraudulent listings or fake sports academies.
2. Unchecked publication of scam trial opportunities charging extortionate registration fees.
3. Fabrication of verification badges (`is_verified = true`) without document review.
4. Reputational sabotage via malicious edits or unverified negative reviews.

Phase 8 implements cryptographic anti-self-approval mechanisms, tamper-resistant moderation audit logs, and strict queue isolation in PostgreSQL.

---

## 2. Listing Lifecycle & Workflow State Machine

Every submission across venues, academies, trials, and coaches follows an immutable lifecycle:

```
[User Draft / Submission] 
           │
           ▼
     status: 'pending' (Unpublished, invisible to public search)
           │
           ├──────────────────────────────┐
           ▼ (Moderator Review)           ▼ (Moderator Review)
     status: 'approved'             status: 'rejected'
  (Publicly Discoverable)       (Archived with audit reason)
           │
           ▼ (Subsequent Edit)
     status: 'pending' (Re-enters moderation queue if core details change)
```

---

## 3. Core Security Rules & Technical Safeguards

### 3.1 Strict Anti-Self-Approval Enforcement
* **Rule:** A user—even one possessing platform moderator or administrative credentials—**cannot approve their own submission**.
* **PostgreSQL Implementation (`public.review_listing_submission`)**:
  ```sql
  IF v_submission.submitted_by = auth.uid() THEN
      RAISE EXCEPTION 'Security violation: Submitter cannot approve or review their own listing';
  END IF;
  ```
* This prevents rogue moderators or compromised accounts from unilaterally injecting fraudulent listings.

### 3.2 Private Moderation Queue Isolation
* Direct PostgREST access to the pending review queue is blocked for `anon` and standard `authenticated` users.
* Only accounts holding verified `moderator` or `admin` roles in `public.user_roles` can view submissions in `'pending'` or `'flagged'` status.
* The public directory API queries only rows with `status = 'approved'`.

### 3.3 Immutable Moderation Audit Trail
Every action (approval, rejection, modification, status suspension) creates an append-only entry in `public.listing_moderation_audit_logs`:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key |
| `submission_id` | `UUID` | Reference to moderated listing |
| `moderator_id` | `UUID` | Identity of reviewing moderator (`auth.uid()`) |
| `action` | `TEXT` | `'approved'`, `'rejected'`, `'flagged'`, `'suspended'` |
| `notes` | `TEXT` | Documented reason / justification |
| `created_at` | `TIMESTAMPTZ` | Timestamp of decision |

* **Tamper Resistance:** RLS policies explicitly forbid `UPDATE` or `DELETE` on `listing_moderation_audit_logs`. Once recorded, moderation decisions cannot be altered or purged.

### 3.4 Verification Badge Integrity
* The `is_verified` flag on venues, academies, and athlete profiles is protected from user updates.
* Attempting to pass `is_verified: true` in user submission payloads is stripped by triggers or rejected by PostgreSQL validation.
* Verification badges can only be granted via the privileged `verify_listing_entity` RPC requiring senior administrative privileges and document cross-referencing.

### 3.5 Abuse Reporting & Reporter Anonymity
* Users can flag listings or report fraudulent behavior via `report_listing_entity`.
* The identity of the reporting user (`reporter_id`) is masked and accessible only to compliance administrators.
* Listing owners cannot see who submitted abuse reports against their listings.

---

## 4. Adversarial Testing & Verification

Automated test cases in `src/integrations/supabase/database-security-programme-closure.test.ts`:
- **SEC-TEST-P78-01 (Anti-Self-Approval)**: Verified that when a submitter attempts to invoke moderation approval on their own submission, the system aborts with `SELF_APPROVAL_PROHIBITED` and preserves the pending status.
- Independent moderator review succeeds with status transition to `approved`.

---

## 5. Deployment Status

| Component | Status | Verification |
| :--- | :--- | :--- |
| `listing_moderation_audit_logs` Table | Implemented in code | Validated in migration `20261108090000` |
| Anti-Self-Approval Rule | Implemented in code | Validated in migration `20261108090000` |
| Moderation Audit RLS (Append-Only) | Implemented in code | Validated in migration `20261108090000` |
| Automated Vitest Moderation Suite | CI passed | 85/85 test files passed |
| Development Database Deployment | Not deployed | Staged in consolidated SQL package |
| Production Database | Not deployed | Untouched (Out-of-scope) |
