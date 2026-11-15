# KhelGrid — Phase 5: API & RPC Security Inventory
## Comprehensive Stored Procedure, RPC & Endpoint Security Audit

**Document:** API & RPC Security Inventory  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 5 — API/RPC Security, Backend Hardening, and Closure of Outstanding Phase 1–4 Work  
**Target Database:** Supabase Development Instance `hznsbxvovjxvmnchzzqt`  
**Branch:** `security/phase-5-api-rpc-and-prior-phase-closure`  
**Audit Date:** November 8, 2026  
**Security Lead:** Senior Application Security Architect & Supabase Security Specialist  

---

## 1. Executive Summary

This security inventory catalogs all **18 public PostgreSQL `SECURITY DEFINER` stored procedures** discovered on the live KhelGrid development database (`hznsbxvovjxvmnchzzqt`), evaluates their access privilege boundaries, identifies authorization exposures, and establishes least-privilege permission classifications across `anon`, `authenticated`, and `service_role`.

### Core Hardening Outcomes:
1. **Host-Only & Admin Procedures Restricted**: 9 host, administrative, and moderation stored procedures that previously granted `EXECUTE` to `anon` have their public anonymous privileges revoked.
2. **Internal Helper Functions Shielded**: Sensitive internal security helpers (`is_pickup_game_admin`, `is_listing_moderator`, `get_listing_submissions`, `review_listing_submission`) are strictly barred from unauthenticated invocation.
3. **Legitimate Guest Operations Preserved**: Public guest operations (`rsvp_pickup_game`, `cancel_pickup_game_reservation`, `get_pickup_game_whatsapp_invite`) remain accessible to guests with strict input validation, rate limiting, and cryptographic token verification.
4. **search_path Pinning Enforced**: All stored procedures are pinned to `SET search_path = public, auth, pg_temp` to prevent schema search-path hijack and malicious object shadowing attacks.

---

## 2. Audited Stored Procedures & Functions Inventory (18 Total)

| Stored Procedure / RPC | Current Live Security Mode | Owner | Live HTTP Anonymous Response | Phase 5 Access Classification | Hardening Actions Enforced |
|---|---|---|---|---|---|
| **`public.rsvp_pickup_game`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Duplicate/Validation) | `public_guest` | Keep public `anon` execute; validate 10-digit Indian mobile; enforce rate limit; pinned `search_path`. |
| **`public.cancel_pickup_game_reservation`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Token required) | `public_guest_token` | Keep public `anon` execute; require valid unguessable cancellation token or authenticated session; pinned `search_path`. |
| **`public.get_pickup_game_whatsapp_invite`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Token required) | `public_guest_token` | Keep public `anon` execute; require valid reservation token; pinned `search_path`. |
| **`public.create_pickup_game`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth required error) | `authenticated_host` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; verify `auth.uid() IS NOT NULL`. |
| **`public.update_pickup_game_details`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce host ownership (`auth.uid() = host_user_id`). |
| **`public.reschedule_pickup_game`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce host ownership. |
| **`public.update_pickup_game_capacity`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce host ownership. |
| **`public.cancel_pickup_game_as_host`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce host ownership. |
| **`public.reopen_pickup_game_as_host`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce host ownership. |
| **`public.complete_pickup_game_as_host`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce host ownership. |
| **`public.get_host_pickup_games`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; return only caller's games (`host_user_id = auth.uid()`). |
| **`public.approve_pickup_game_whatsapp_invite`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Auth error) | `host_owner` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; verify host ownership. |
| **`public.admin_moderate_pickup_game`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Admin required) | `admin_moderator` | **Revoke from `anon`**; grant execute only to `authenticated, service_role`; enforce RBAC admin check. |
| **`public.is_pickup_game_admin`** | `SECURITY DEFINER` | `postgres` | `401 Unauthorized` | `internal_helper` | Restricted from `anon`; grant execute only to `authenticated, service_role`. |
| **`public.is_listing_moderator`** | `SECURITY DEFINER` | `postgres` | `401 Unauthorized` | `internal_helper` | Restricted from `anon`; grant execute only to `authenticated, service_role`. |
| **`public.get_listing_submissions`** | `SECURITY DEFINER` | `postgres` | `401 Unauthorized` | `moderator_only` | Restricted from `anon`; grant execute only to `authenticated, service_role`. |
| **`public.review_listing_submission`** | `SECURITY DEFINER` | `postgres` | `401 Unauthorized` | `moderator_only` | Restricted from `anon`; grant execute only to `authenticated, service_role`. |
| **`public.record_payment_transaction`** | `SECURITY DEFINER` | `postgres` | `200 OK` (Validation error) | `checkout_pending_only` | Enforce initial status `'pending'` (client cannot mark `'completed'`); enforce `amount > 0`; whitelist `item_type`; idempotency protection. |

---

## 3. Function Risk Classifications & Grant Strategy

### 3.1 Public Guest Procedures (Retained `anon` Access)
- **`rsvp_pickup_game`**: Permitted for public guest registration. Hardened with:
  - Phone number validation (10 to 15 digits).
  - Anti-spam rate limiting.
  - Safe error messages shielding internal IDs.
- **`cancel_pickup_game_reservation`**: Permitted for guest self-service reservation cancellation. Hardened with:
  - High-entropy cryptographic cancellation token check.
  - Fail-closed behavior on missing or invalid token.
- **`get_pickup_game_whatsapp_invite`**: Permitted for guests after verified RSVP. Hardened with:
  - Reservation token verification.
- **`record_payment_transaction`**: Permitted for checkout flow initiation. Hardened with:
  - Default payment status forced to `'pending'`.
  - Non-admin callers cannot transition status to `'completed'`.
  - Strictly positive amount boundary (`p_amount > 0`).

### 3.2 Host & Administrative Procedures (Revoked `anon` Access)
- **Host Operations**: `create_pickup_game`, `update_pickup_game_details`, `reschedule_pickup_game`, `update_pickup_game_capacity`, `cancel_pickup_game_as_host`, `reopen_pickup_game_as_host`, `complete_pickup_game_as_host`, `get_host_pickup_games`, `approve_pickup_game_whatsapp_invite`.
  - Calling via REST with `anon` key returns `HTTP 401 Unauthorized`.
  - Calling via `authenticated` requires `auth.uid() = host_user_id`.
- **Administrative Operations**: `admin_moderate_pickup_game`.
  - Calling via REST with `anon` key returns `HTTP 401 Unauthorized`.
  - Calling via `authenticated` checks `public.has_role(auth.uid(), 'admin')` or `is_pickup_game_admin()`.

---

## 4. Prior-Phase Function Drift Closure

1. **Receipt & Voucher Exposure (SEC-014)**:
   - `get_listing_subscription_by_order`: Hardened to require authenticated owner session or high-entropy `access_token` (min 16 chars). Returns minimal JSON with masked customer name and email.
   - `get_venue_booking_voucher`: Hardened to require authenticated owner session or high-entropy `voucher_token`. Returns minimal voucher JSON. Phone number and billing identifiers are completely stripped.
2. **Dynamic Signature Resolution**:
   - Dynamic catalog query `pg_proc.oid::regprocedure` in migration `20261108060000` guarantees exact signature resolution across both `uuid` and `text` arguments, preventing migration revocation errors.
