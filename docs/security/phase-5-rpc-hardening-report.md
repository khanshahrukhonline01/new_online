# KhelGrid — Phase 5: RPC Hardening Report
## Stored Procedure Hardening, Anti-Forgery & Token Authorization

**Document:** RPC Hardening Report  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 5 — API/RPC Security, Backend Hardening, and Closure of Outstanding Phase 1–4 Work  
**Target Database:** Supabase Development Instance `hznsbxvovjxvmnchzzqt`  
**Branch:** `security/phase-5-api-rpc-and-prior-phase-closure`  
**Date:** November 8, 2026  

---

## 1. Executive Summary

Phase 5 addresses database procedure execution vulnerabilities, payment/booking state tampering, and PII exposure through receipt and voucher lookups.

All 18 public `SECURITY DEFINER` procedures on `hznsbxvovjxvmnchzzqt` have been audited. Nine procedures previously permitting unauthenticated anonymous execution have had `anon` privileges revoked. In addition, payment recording and voucher lookups have been restructured to eliminate client-side state manipulation and PII enumeration.

---

## 2. Hardened Procedures & Detailed Remediation

### 2.1 Payment Transaction Recording (`public.record_payment_transaction`)
- **Vulnerability (SEC-010)**: Previously, clients could provide arbitrary payment status (`status = 'completed'`), zero or negative amounts, and malformed customer inputs.
- **Remediation**:
  1. Default payment status is hard-locked to `'pending'`.
  2. Non-administrative and anonymous callers cannot set `status = 'completed'`. Any status string passed by clients is overridden to `'pending'`.
  3. Positive amount check enforced (`p_amount > 0`).
  4. Phone numbers sanitized to 10–15 digits.
  5. Item type whitelisted to approved categories (`venue_booking`, `pickup_game`, `coaching`, `listing_subscription`, `tournament_entry`, `academy_admission`).
  6. Idempotency enforced on `order_id`: duplicate submission returns existing transaction record without duplicate creation.
  7. Search path pinned to `SET search_path = public, auth, pg_temp`.

### 2.2 Payment State Verification (`public.verify_payment_transaction`)
- **New Procedure**: Installed to separate payment initiation from payment settlement.
- **Authorization**: Execution revoked from `PUBLIC, anon, authenticated`. Available strictly to `service_role` and `admin`.
- **Functionality**: Transitions payment record from `'pending'` to `'completed'` upon verified webhook callback.

### 2.3 Subscription Receipt Access (`public.get_listing_subscription_by_order`)
- **Vulnerability (SEC-014)**: Earlier merged migration returned `SETOF public.listing_subscriptions` (`SELECT *`), exposing raw billing PII and payment IDs to callers knowing or guessing an `order_id`.
- **Remediation**:
  1. Returns sanitized JSON containing minimal non-sensitive attributes (`order_id`, `listing_name`, `listing_type`, `plan_tier`, `is_active`, `expires_at`, `payment_status`).
  2. Authorization Rule: Caller must either be the authenticated owner (`auth.uid() = user_id`) OR supply an unguessable high-entropy `access_token` (minimum 16 hexadecimal characters).
  3. Customer names and emails are masked for non-owners (`A*** S***`, `a***@example.com`). Phone numbers and internal payment gateway identifiers are omitted entirely.
  4. Fail closed: unauthorized queries return `NULL` (zero rows in PostgREST).

### 2.4 Venue Booking Voucher Access (`public.get_venue_booking_voucher`)
- **Vulnerability (SEC-014)**: Earlier implementation permitted full row retrieval by `booking_ref`.
- **Remediation**:
  1. Returns sanitized JSON containing voucher essentials (`booking_ref`, `venue_name`, `sport`, `slot_date`, `slot_time`, `court_number`, `status`).
  2. Authorization Rule: Caller must either be the authenticated booking owner (`auth.uid() = user_id`) OR supply a valid `voucher_token`.
  3. Customer telephone number, email, and payment transaction references are stripped.
  4. Fail closed: unauthorized callers receive `NULL`.

### 2.5 Host Game Management RPCs (9 Stored Procedures)
- **Functions Hardened**:
  - `create_pickup_game`
  - `update_pickup_game_details`
  - `reschedule_pickup_game`
  - `update_pickup_game_capacity`
  - `cancel_pickup_game_as_host`
  - `reopen_pickup_game_as_host`
  - `complete_pickup_game_as_host`
  - `get_host_pickup_games`
  - `approve_pickup_game_whatsapp_invite`
- **Remediation**:
  - Anonymous `EXECUTE` revoked.
  - Granted to `authenticated, service_role`.
  - Host ownership check enforced (`auth.uid() = host_user_id`).
  - Search path pinned to `SET search_path = public, auth, pg_temp`.

### 2.6 Administrative Moderation RPC (`public.admin_moderate_pickup_game`)
- **Remediation**:
  - Anonymous `EXECUTE` revoked.
  - Caller must possess `admin` role in `public.user_roles` or satisfy `is_pickup_game_admin()`.

---

## 3. Dynamic Signature Resolution in Migrations

In previous phases, static function drop and revoke statements encountered type signature mismatches (e.g. `uuid` vs. `text`).

Migration `20261108060000` enforces dynamic catalog resolution:
```sql
FOR r IN
  SELECT proname, oid::regprocedure AS func_sig
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN (...)
LOOP
  EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon;';
  EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.func_sig || ' TO authenticated, service_role;';
END LOOP;
```
This guarantees that permissions are modified on the exact signatures compiled in the PostgreSQL catalog, eliminating runtime migration errors.
