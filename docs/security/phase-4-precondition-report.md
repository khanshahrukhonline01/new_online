# KhelGrid Security Programme — Phase 4 Precondition Report

**Date:** November 8, 2026  
**Repository Branch:** `security/phase-4-authentication-session-security`  
**Development Database Reference:** `hznsbxvovjxvmnchzzqt`  
**Production Boundaries:** 100% Untouched, Out-of-Scope  

---

## 1. Objective

This report formally records the security baseline, repository state, and verified prerequisites before executing the implementation of **Phase 4: Authentication, Session Security & Account Protection**.

---

## 2. Stage 0 Reconciliation Status

### 2.1 Phase 2 RLS Status Reconciliation
- **Merged PRs:** PR #173 and PR #174 merged into `main`.
- **Live Database Status:** Development database `hznsbxvovjxvmnchzzqt` remains at migration version `20261106130000`.
- **Reconciliation Fixes Authored:**
  - `supabase/migrations/20261108040000_phase2_rls_post_merge_remediation.sql` updated to explicitly drop all broad SELECT policies (`listing_subscriptions_read`, `venue_bookings_read`, `trial_reminders_read`).
  - Added `user_id` and 24-byte `voucher_token` to `venue_bookings`.
  - Added `access_token` to `listing_subscriptions`.
  - Hardened `get_venue_booking_voucher` and `get_listing_subscription_by_order`: eliminated phone/email verification; strictly requires high-entropy token or authenticated owner session; arbitrary callers guessing IDs receive 0 rows.
  - Eliminated silent error swallowing in DO blocks.
  - Enforced `FORCE ROW LEVEL SECURITY` across 6 target tables.
  - Regression tests in `database-security-phase2-remediation.test.ts` pass 14/14.

### 2.2 Phase 3 RBAC Status Reconciliation
- **Merged PR:** PR #175 merged into `main` (`24ca142`).
- **Live Database Status:** Migration `20261108000000_phase3_rbac_and_privilege_hardening.sql` is pending database release.
- **Client & Database Implementation:** Complete, decoupled role model with 10 platform roles, `authorizationService.ts`, immutable audit logging, and last-admin protection.
- **Tests:** 16/16 RBAC tests passing.

---

## 3. Phase 4 Preconditions Assessment

| Precondition | Status | Notes |
|---|---|---|
| Stage 0 Phase 2 gaps closed in code | **MET** | Hardened `20261108040000` migration with voucher token check |
| Stage 0 Phase 3 RBAC gaps closed in code | **MET** | Centralized authorization service, last-admin protection |
| Pre-implementation baseline test run | **MET** | 82 test files passed (570 passed, 0 failures) |
| Live database migration isolation | **MET** | Zero migrations executed against development or production databases |
| Production site isolation | **MET** | `https://khelgrid.com/` completely untouched |
| Target branch initialized | **MET** | `security/phase-4-authentication-session-security` branched from `main` |

---

## 4. Phase 4 Implementation Directives

1. **Remove Insecure Demo Authentication:**
   - Eliminate synthetic local user generation (`dev-${Date.now()}...`) from `signUpWithEmail`, `signInWithEmail`, and `signInWithOtp` in `auth-client.ts`.
   - When Supabase client is not configured, auth operations must fail with explicit error rather than silently minting an authenticated, verified identity.
2. **Distinguish Email Verification from Session Authentication:**
   - Derive `isVerified` / `emailConfirmed` strictly from Supabase user `email_confirmed_at` timestamp.
   - Guard sensitive operations with `requireVerifiedEmail()`.
3. **Prevent User Enumeration:**
   - Password reset must return generic confirmation regardless of email existence.
4. **Session Lifecycle & Token Refresh Hardening:**
   - Full state cleanup on logout.
   - Clean handling of token refresh and expiration.
   - Open-redirect protection via `getSafeRedirectUrl()`.
5. **Phase 4 Migration & Automated Tests:**
   - Author `supabase/migrations/20261108050000_phase4_auth_and_session_security.sql`.
   - Author `src/integrations/supabase/database-security-phase4-auth.test.ts`.
