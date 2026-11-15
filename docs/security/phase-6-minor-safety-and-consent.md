# KhelGrid Security Programme — Phase 6: Minor Safety and Statutory Consent

> **Document ID:** SEC-P6-MINORS-001  
> **Status:** Implemented in code | Tested against isolated PostgreSQL  
> **Applicable Regulations:** Digital Personal Data Protection Act, 2023 (DPDP Act 2023 - Section 9: Processing of personal data of child)  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  

---

## 1. Executive Summary & Purpose

KhelGrid operates as an athletic talent discovery, trial application, and sports venue directory across India. Given that sports academies, school leagues, and grassroots trials heavily involve student-athletes under 18 years of age, special statutory safeguards are mandatory.

Under **Section 9 of the Digital Personal Data Protection Act, 2023 (DPDP Act 2023)**, processing personal data of a child (individual who has not completed eighteen years of age) requires:
1. Verifiable parental or legal guardian consent prior to data processing.
2. An absolute prohibition on tracking, behavioral monitoring, or targeted advertising directed at children.
3. An absolute prohibition on processing any personal data likely to cause detrimental effects on the child's well-being.

This document outlines the technical safeguards, database schema, verification mechanisms, and access control policies established in Phase 6 migration `20261108080000_phase6_athlete_privacy_and_minor_protection.sql`.

---

## 2. Minor Identification & Age Classification

In KhelGrid, every athlete registering or creating a profile provides their date of birth (`date_of_birth`).

### 2.1 Dynamic Minor Status Computation
Age calculation is performed server-side inside PostgreSQL to prevent client manipulation:
```sql
is_minor := (p_date_of_birth > (CURRENT_DATE - INTERVAL '18 years'));
```

### 2.2 Strict Data Minimization for Minors
For adult athletes, profile fields may include high school/college, contact handles, and senior club affiliations. For athletes identified as minors (`is_minor = true`):
- **Exact Date of Birth**: Suppressed from all public interfaces; only birth year (or competition age group, e.g. U-14, U-16) is projected.
- **Direct Phone Numbers**: Suppressed from all public, academy, and search results.
- **Direct Email Addresses**: Suppressed from all public views; replaced with guardian contact only if explicit scout consent is granted.
- **Physical Residence / Street Address**: Prohibited from storage or transmission. Only City and State are recorded.
- **School / Institutional Name**: Prohibited from public display without explicit guardian consent.

---

## 3. Statutory Guardian Consent Architecture

### 3.1 Schema: `public.guardian_consents`
The table `public.guardian_consents` enforces relational integrity and legal traceability:

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Consent record identifier |
| `minor_user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Child athlete account ID |
| `guardian_name` | `TEXT` | `NOT NULL CHECK (length(guardian_name) >= 3)` | Full name of parent / legal guardian |
| `guardian_relationship` | `TEXT` | `NOT NULL CHECK (guardian_relationship IN ('parent', 'legal_guardian'))` | Statutory legal relationship |
| `guardian_phone` | `TEXT` | `NOT NULL CHECK (guardian_phone ~ '^\+?[0-9]{10,14}$')` | Verified contact phone |
| `guardian_email` | `TEXT` | `NOT NULL CHECK (guardian_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')` | Notification and verification email |
| `consent_scope` | `TEXT` | `NOT NULL CHECK (consent_scope IN ('profile_creation', 'trial_participation', 'academy_enquiry', 'scout_contact'))` | Specific statutory processing purpose |
| `is_verified` | `BOOLEAN` | `NOT NULL DEFAULT false` | Verification status (OTP / signed consent) |
| `verification_method` | `TEXT` | `CHECK (verification_method IN ('sms_otp', 'email_link', 'aadhaar_esign', 'manual_verification'))` | Evidentiary verification path |
| `ip_address` | `INET` | `DEFAULT NULL` | Network origin at time of consent submission |
| `granted_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Timestamp of consent grant |
| `revoked_at` | `TIMESTAMPTZ` | `DEFAULT NULL` | Revocation timestamp |

### 3.2 Dual-Consent Enforcement for Profile Publishing
An athlete under 18 **cannot** toggle their profile to `is_public_cv = true` unless:
1. `public.guardian_consents` contains an active (`revoked_at IS NULL`), verified (`is_verified = true`) record with `consent_scope = 'profile_creation'`.
2. The minor profile query `get_athlete_public_cv(username)` enforces:
```sql
IF v_is_minor AND NOT v_has_guardian_consent THEN
    -- Block completely if guardian consent is missing
    RETURN QUERY SELECT NULL WHERE FALSE;
END IF;
```

---

## 4. Protection Against Behavioral Profiling & Tracking

1. **No Algorithmic Ad Profiling**: Third-party advertising trackers (Meta Pixel, Google Ads remarketing) are blocked from loading on routes serving athlete CVs (`/athletes/:username`) and trial application pages.
2. **Zero Commercial Data Brokering**: KhelGrid contracts prohibit the sale, licensing, or commercial transfer of any minor athlete performance records or physical biometric metrics.
3. **No Direct Messaging from Unverified Adults**: Direct open messaging between anonymous adult accounts and minor athlete accounts is architecturally prohibited. All trial enquiries route through verified academy listing coordinators and verified guardians.

---

## 5. Revocation, Retention and Erasure (DPDP Section 12)

1. **Immediate Revocation**: A guardian or athlete may revoke consent at any time via `public.user_consents` or `public.guardian_consents`. Setting `revoked_at = NOW()` immediately unpublishes the athlete profile from all public discovery views.
2. **Right to Erasure (Account Deletion)**: Invoking `public.anonymize_user_account(user_id)` triggers:
   - Scrubbing of `full_name`, `email`, `phone`, `avatar_url`, and bio in `profiles`.
   - Scrubbing of biometric stats, medical clearances, and identity documents in `athlete_profiles`.
   - Anonymization of participation history in `pickup_game_participants` and `trial_applications`.
   - Retaining only anonymized, aggregated match scores for statistical integrity.

---

## 6. Verification Status

| Item | Status | Verification Method |
| :--- | :--- | :--- |
| Minor age calculation trigger | Implemented in code | Verified in `20261108080000` |
| `guardian_consents` table & constraints | Implemented in code | Schema parser & Vitest |
| Contact masking for minors | Implemented in code | `SEC-TEST-P6-01` passed |
| Anti-profiling policy | Implemented in code | Client audit & Content Security Policy |
| Development Database Deployment | Not deployed | Awaiting manual approval |
| Production Database | Not deployed | Untouched (Out-of-scope) |
