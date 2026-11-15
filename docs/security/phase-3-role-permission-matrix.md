# KhelGrid — Phase 3: Formal Role-Permission Matrix
## Canonical Authorization Matrix & Boundary Rules

**Document:** Formal Role-Permission Matrix  
**Programme:** KhelGrid 10-Phase Security and Authorization Programme  
**Module:** Phase 3 — Role-Based Access Control (RBAC)  
**Lead Security Architect:** Antigravity  
**Audit & Specification Date:** November 8, 2026  

---

## 1. High-Level Role-Permission Matrix

| Operation | Visitor | Athlete | Parent | Coach | Scout | Academy | Host / Owner | Submitter | Moderator | Admin | Service Role |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Browse public catalogue** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** |
| **Create athlete profile** | Deny | **Own only** | **Ward only** | Deny | Deny | Deny | Deny | Deny | Deny | Authorized | Authorized |
| **Submit a directory listing** | Public Intake | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | Authorized |
| **Edit own listing submission** | Deny | **Own only** | **Own only** | **Own only** | **Own only** | **Own only** | **Own only** | **Own only** | **Own only** | Authorized | Authorized |
| **Approve / verify listings** | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | **Allow** | **Allow** | **Allow** |
| **Reject / dispute listings** | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | **Allow** | **Allow** | **Allow** |
| **Read private trial applications** | Deny | **Own only** | **Ward only** | Scoped | Scoped | **Scoped only** | Deny | Deny | Scoped | **Allow** | **Allow** |
| **Manage own sports venue** | Deny | Deny | Deny | Deny | Deny | Deny | **Own only** | Deny | Deny | Authorized | Authorized |
| **Modify another user profile** | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Authorized | Authorized |
| **Manage user roles & RBAC** | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | **Authorized** | **Authorized** |
| **Update live sports scores** | Deny | Deny | Deny | Authorized | Deny | Authorized | **Own match** | Deny | Authorized | **Allow** | **Allow** |
| **Access private payment records**| Deny | **Own only** | **Own only** | **Own only** | Deny | **Own only** | **Own only** | Deny | Deny | Authorized | **Allow** |
| **View security audit logs** | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | **Authorized** | **Authorized** |

---

## 2. Granular Permission Specifications

### 2.1 Catalogue Operations
- **Permission:** `catalogue:browse`
  - **Resource:** `sports`, `academies`, `venues`, `events`, `cities`, `site_announcements`, `chronicle_categories`.
  - **Action:** `read`
  - **Required Role:** Any (`visitor`, `athlete`, `parent`, `coach`, `scout`, `academy`, `host`, `venue_owner`, `submitter`, `moderator`, `admin`).
  - **Ownership Requirement:** None (Public discovery data).
  - **Denial Behavior:** HTTP 200 / 206 Partial Content. Never denied.
  - **Regression Test:** `SEC-TEST-P3R-06`.

### 2.2 Profile Management
- **Permission:** `profile:view`
  - **Resource:** `public.profiles` / `public.public_profiles`
  - **Action:** `read`
  - **Required Role:** Any authenticated user. Public discovery fields available to all via view; private `email` and `phone` restricted strictly to owner (`auth.uid() = id`) or administrator.
  - **Denial Behavior:** HTTP 401 / 403 or masked PII.
  - **Regression Test:** `SEC-TEST-P3R-07`.

- **Permission:** `profile:edit`
  - **Resource:** `public.profiles`, `public.athlete_profiles`
  - **Action:** `update`
  - **Required Role:** Authenticated account owner (`auth.uid() = id`).
  - **Ownership Requirement:** Strict (`auth.uid() = id`).
  - **Denial Behavior:** RLS UPDATE rejected (403 Forbidden).
  - **Regression Test:** `SEC-TEST-P3R-07`.

- **Permission:** `profile:edit_other`
  - **Resource:** `public.profiles`
  - **Action:** `update`, `delete`
  - **Required Role:** `admin`, `service_role`.
  - **Ownership Requirement:** None (Administrative override).
  - **Denial Behavior:** HTTP 403 Forbidden.
  - **Regression Test:** `SEC-TEST-P3R-03`.

### 2.3 Directory Listings & Moderation
- **Permission:** `listing:submit`
  - **Resource:** `public.listing_submissions`
  - **Action:** `create`
  - **Required Role:** Authenticated user or public community intake modal.
  - **Conditions:** Status defaults strictly to `'pending_review'`.
  - **Denial Behavior:** HTTP 401 if unconfigured.
  - **Regression Test:** `SEC-TEST-P3R-06`.

- **Permission:** `listing:moderate`
  - **Resource:** `public.listing_submissions`, `public.verification_claims`, `public.listing_reports`
  - **Action:** `moderate` (Approve / Reject)
  - **Required Role:** `moderator`, `admin`.
  - **Ownership Requirement:** None.
  - **Denial Behavior:** HTTP 403 Forbidden / Error: `"Administrator or moderator privileges required"`.
  - **Regression Test:** `SEC-TEST-P3R-11`.

### 2.4 Selection Trial Applications & Sports CV Combine Records
- **Permission:** `application:submit`
  - **Resource:** `public.trial_applications`
  - **Action:** `create`
  - **Required Role:** `athlete`, `parent`.
  - **Ownership Requirement:** `auth.uid() = user_id`.
  - **Denial Behavior:** HTTP 403 Forbidden.
  - **Regression Test:** `SEC-TEST-P3R-06`.

- **Permission:** `application:read_own`
  - **Resource:** `public.trial_applications`, `public.academy_enquiries`
  - **Action:** `read`
  - **Required Role:** Applicant owner (`auth.uid() = user_id`).
  - **Ownership Requirement:** Strict owner match.
  - **Denial Behavior:** Returns 0 rows.
  - **Regression Test:** `SEC-TEST-P3R-07`.

- **Permission:** `application:read_scoped`
  - **Resource:** `public.trial_applications`, `public.academy_enquiries`
  - **Action:** `read`
  - **Required Role:** `academy`, `coach`, `scout`.
  - **Ownership Requirement:** Must be the verified academy director hosting the trial or coach assigned to the batch.
  - **Denial Behavior:** Returns 0 rows.
  - **Regression Test:** `SEC-TEST-P3R-09`.

### 2.5 Venue Court Management & Slot Bookings
- **Permission:** `venue:manage_own`
  - **Resource:** `public.venues`, `public.venue_slot_bookings`
  - **Action:** `update`, `create`
  - **Required Role:** `host`, `venue_owner`.
  - **Ownership Requirement:** User must own the venue record (`venue.host_id = auth.uid()`).
  - **Denial Behavior:** HTTP 403 Forbidden.
  - **Regression Test:** `SEC-TEST-P3R-10`.

### 2.6 Live Match Scoring
- **Permission:** `match:score`
  - **Resource:** `public.community_live_matches`, `public.live_matches`, `public.live_score_events`
  - **Action:** `score` (ball-by-ball updates)
  - **Required Role:** `host`, `coach`, `moderator`, `admin`.
  - **Ownership Requirement:** Caller must be the match creator / designated official scorer.
  - **Denial Behavior:** HTTP 403 Forbidden.
  - **Regression Test:** `SEC-TEST-P3R-14`.

### 2.7 Role Administration & RBAC Mutation
- **Permission:** `user:manage_roles`
  - **Resource:** `public.user_roles`, `public.role_permissions`, `public.user_role_audit_logs`
  - **Action:** `create`, `update`, `delete`
  - **Required Role:** `admin`, `service_role`.
  - **Additional Conditions:** Cannot revoke the final remaining administrator.
  - **Denial Behavior:** RPC exception: `"Access denied: Only system administrators can assign roles."`
  - **Regression Test:** `SEC-TEST-P3R-01`, `SEC-TEST-P3R-02`.
