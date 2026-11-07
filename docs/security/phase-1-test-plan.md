# KhelGrid — Phase 1: Database Security Test Plan

**Document**: Database Security Test Plan  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation  
**Auditor**: Senior Database Security Engineer & Security Auditor  
**Date**: November 7, 2026  

---

## 1. Test Architecture & Principles

The KhelGrid database security test suite verifies access controls across three caller identities:
1. **Unauthenticated Caller (`anon`)**: The public internet visiting `https://khelgrid.com/` without a session.
2. **Authenticated Athlete/Customer (`authenticated`)**: A standard logged-in user with a valid Supabase JWT (`auth.uid() = user_a`).
3. **Authorized Moderator / Administrator (`admin`)**: A privileged user with verified claims or administrative role.

### Core Testing Invariants
- **Zero Production Pollution**: No tests insert fake or synthetic records into production.
- **Transactional Rollback**: Direct PostgreSQL catalog tests run inside a transaction ending in `ROLLBACK`.
- **Stateless PostgREST Probes**: Read-only HTTP probes verify live RLS policies without altering table states.

---

## 2. Test Specifications by Domain

### Test Suite 1: Anonymous Read & PII Isolation
| Test ID | Target Object | Method | Expected Status / Behavior | Verification Goal |
|---|---|---|---|---|
| `SEC-TEST-01` | `public.sports` | GET `/rest/v1/sports` | 200 / 206 OK | Public catalogue is readable by anon. |
| `SEC-TEST-02` | `public.academies` | GET `/rest/v1/academies` | 200 / 206 OK | Public directory is readable by anon. |
| `SEC-TEST-03` | `public.listing_subscriptions` | GET `/rest/v1/listing_subscriptions` | 200 OK (0 rows) or 401 | **Anon must NOT read commercial subscriber contact details or payments (remediates SEC-001).** |
| `SEC-TEST-04` | `public.venue_bookings` | GET `/rest/v1/venue_bookings` | 200 OK (0 rows) or 401 | **Anon must NOT read customer full names or phone numbers (remediates SEC-002).** |
| `SEC-TEST-05` | `public.trial_reminders` | GET `/rest/v1/trial_reminders` | 200 OK (0 rows) or 401 | **Anon must NOT read subscriber phone numbers or email addresses (remediates SEC-003).** |
| `SEC-TEST-06` | `public.khelgrid_payments` | GET `/rest/v1/khelgrid_payments` | 200 OK (Empty array `[]`) | Anon receives 0 rows; payment ledger is protected. |
| `SEC-TEST-07` | `public.profiles` | GET `/rest/v1/profiles?select=email,phone` | 401 / Denied | **Anon cannot query private user emails or phone numbers (remediates SEC-005).** |

### Test Suite 2: Record Ownership & Cross-User Isolation
| Test ID | Target Object | Actor | Target Record | Expected Behavior |
|---|---|---|---|---|
| `SEC-TEST-08` | `public.user_bookmarks` | User A | User A's bookmarks | Can read, insert, and delete own bookmarks. |
| `SEC-TEST-09` | `public.user_bookmarks` | User B | User A's bookmarks | Query returns 0 rows (Cross-user access denied). |
| `SEC-TEST-10` | `public.khelgrid_payments` | User B | User A's payments | Query returns 0 rows. |
| `SEC-TEST-11` | `public.trial_applications` | User B | User A's Sports CV submission | Query returns 0 rows (Candidate privacy protected). |
| `SEC-TEST-12` | `public.academy_enquiries` | User B | User A's batch enquiry | Query returns 0 rows. |
| `SEC-TEST-13` | `public.host_payout_accounts` | User B | User A's bank account | **User B cannot read or alter User A's IFSC/Account (remediates SEC-006).** |

### Test Suite 3: Privilege Escalation & Role Integrity
| Test ID | Target Object | Attack Vector | Expected Behavior |
|---|---|---|---|
| `SEC-TEST-14` | `public.handle_new_user()` | Sign up with `{ options: { data: { role: 'admin' } } }` | **Role defaults to 'athlete'; admin role assignment rejected (remediates SEC-004).** |
| `SEC-TEST-15` | `public.profiles` | Authenticated User A executes `PATCH /rest/v1/profiles?id=eq.user_a` with `{ "role": "admin" }` | RLS rejects UPDATE (403/Forbidden or no-op). |
| `SEC-TEST-16` | `public.is_admin()` | Anonymous caller invokes `POST /rest/v1/rpc/is_admin` | Returns HTTP 401 / 404 (Anonymous execute revoked). |
| `SEC-TEST-17` | `public.is_admin()` | Authenticated regular user invokes `POST /rest/v1/rpc/is_admin` | Returns `false`. |

### Test Suite 4: Function Execution & Definer Boundaries
| Test ID | Function | Caller | Expected Result |
|---|---|---|---|
| `SEC-TEST-18` | `public.admin_moderate_pickup_game` | Unprivileged caller | Returns error: `"Administrator or moderator privileges required."` |
| `SEC-TEST-19` | `public.is_listing_moderator` | Anon caller | Returns HTTP 401: `"permission denied for function is_listing_moderator"`. |
| `SEC-TEST-20` | `public.review_listing_submission` | Anon caller | Returns HTTP 401: `"permission denied for function is_listing_moderator"`. |
| `SEC-TEST-21` | `public.publish_community_match_score` | Anon caller | **Denied; only verified match hosts or platform scorers can update scores (remediates SEC-007).** |
| `SEC-TEST-22` | `public.is_admin()`, `public.has_role()` | Catalog inspection | **Functions explicitly set `search_path = public, pg_temp` (remediates SEC-009).** |

### Test Suite 5: Storage Access Control
| Test ID | Bucket | Action | Caller | Expected Result |
|---|---|---|---|---|
| `SEC-TEST-23` | `cv-documents` | Download file `cv-documents/user_a/aadhaar.pdf` | `anon` | **HTTP 403 Forbidden / Not Found.** |
| `SEC-TEST-24` | `cv-documents` | Download file `cv-documents/user_a/aadhaar.pdf` | User B | **HTTP 403 Forbidden.** |
| `SEC-TEST-25` | `cv-documents` | Download file `cv-documents/user_a/aadhaar.pdf` | User A | HTTP 200 OK. |

---

## 3. Test Automation Execution

All automated security tests are executed via Vitest:
```bash
npx vitest run src/integrations/supabase/database-security-foundation.test.ts
```
Expected output: 100% passing tests with 0 unhandled security regressions.
