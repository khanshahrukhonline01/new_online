# KhelGrid — Phase 1: Database Security Test Plan
## Reconciled Security Test Plan (Post-Merge Audit Edition)

**Document**: Database Security Test Plan  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation (Reconciled Baseline)  
**Auditor**: Senior Database Security Engineer & Security Auditor  
**Reconciliation Date**: November 7, 2026  
**Environment**: Development Database (`hznsbxvovjxvmnchzzqt`)  

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
| `SEC-TEST-14` | `public.trial_reminders` | User B | User A's reminder | **User B cannot update or overwrite User A's trial reminder.** |

### Test Suite 3: Privilege Escalation & Role Integrity
| Test ID | Target Object | Attack Vector | Expected Behavior |
|---|---|---|---|
| `SEC-TEST-15` | `public.handle_new_user()` | Sign up with `{ options: { data: { role: 'admin' } } }` | **Role defaults to 'athlete'; admin role assignment rejected (remediates SEC-004).** |
| `SEC-TEST-16` | `public.profiles` | Authenticated User A executes `PATCH /rest/v1/profiles?id=eq.user_a` with `{ "role": "admin" }` | RLS rejects UPDATE (403/Forbidden or no-op). |
| `SEC-TEST-17` | `public.is_admin()` | Anonymous caller invokes `POST /rest/v1/rpc/is_admin` | Returns HTTP 401 / 404 (Anonymous execute revoked). |
| `SEC-TEST-18` | `public.is_admin()` | Authenticated regular user invokes `POST /rest/v1/rpc/is_admin` | Returns `false`. |

### Test Suite 4: Function Execution & Definer Boundaries
| Test ID | Function | Caller | Expected Result |
|---|---|---|---|
| `SEC-TEST-19` | `public.admin_moderate_pickup_game` | Unprivileged caller | Returns error: `"Administrator or moderator privileges required."` |
| `SEC-TEST-20` | `public.is_listing_moderator` | Anon caller | Returns HTTP 401: `"permission denied for function is_listing_moderator"`. |
| `SEC-TEST-21` | Host functions (`cancel_pickup_game_as_host`, etc.) | Anon caller | Execution rejected / revoked. |
| `SEC-TEST-22` | `get_listing_subscription_by_order` | Caller | Returns minimal projection only; zero unmasked PII. |
| `SEC-TEST-23` | `get_venue_booking_voucher` | Caller | Returns minimal projection only; zero unmasked customer PII. |
| `SEC-TEST-24` | `pickup_game_participants` | Anon caller | Direct query rejected (0 rows or 401); cancellation token inaccessible. |
| `SEC-TEST-25` | `pickup_game_rsvp_rate_limits` | Client | Direct queries rejected; internal table only. |
