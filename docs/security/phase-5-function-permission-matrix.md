# KhelGrid — Phase 5: Function Permission Matrix
## Granular Role & RPC Access Control Matrix

**Document:** Function Permission Matrix  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 5 — API/RPC Security, Backend Hardening, and Closure of Outstanding Phase 1–4 Work  
**Target Database:** Supabase Development Instance `hznsbxvovjxvmnchzzqt`  
**Branch:** `security/phase-5-api-rpc-and-prior-phase-closure`  
**Date:** November 8, 2026  

---

## 1. Overview

This matrix defines the exact execution rights for all public and internal PostgreSQL functions across the four primary caller security principals:
- `anon`: Unauthenticated anonymous guest users (connecting via PostgREST with the Supabase anon key).
- `authenticated`: Signed-in users possessing a valid JWT session issued by Supabase Auth (`auth.uid() IS NOT NULL`).
- `admin`: Authenticated users assigned the platform `admin` role in `public.user_roles`.
- `service_role`: Trusted backend workers, Edge Functions, and migration operators utilizing the secret service key.

---

## 2. Granular RPC Permission Matrix

| Stored Procedure / RPC | `anon` | `authenticated` (Regular User) | `authenticated` (Host / Owner) | `authenticated` (Moderator) | `authenticated` (Admin) | `service_role` | Justification & Safeguards |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **`rsvp_pickup_game`** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Public guest RSVP allowed; rate limited per phone; duplicates prevented. |
| **`cancel_pickup_game_reservation`** | ✅ (Token) | ✅ (Owner / Token) | ✅ | ✅ | ✅ | ✅ | Guest cancellation requires cryptographic token; authenticated requires owner or token. |
| **`get_pickup_game_whatsapp_invite`** | ✅ (Token) | ✅ (Owner / Token) | ✅ | ✅ | ✅ | ✅ | Shielded: requires reservation token. Zero leakage to unverified callers. |
| **`create_pickup_game`** | ❌ (Revoked) | ✅ | ✅ | ✅ | ✅ | ✅ | **Anon revoked**. Must be signed in; sets `host_user_id = auth.uid()`. |
| **`update_pickup_game_details`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced (`auth.uid() = host_user_id`). |
| **`reschedule_pickup_game`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced. |
| **`update_pickup_game_capacity`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced. |
| **`cancel_pickup_game_as_host`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced. |
| **`reopen_pickup_game_as_host`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced. |
| **`complete_pickup_game_as_host`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced. |
| **`get_host_pickup_games`** | ❌ (Revoked) | ❌ (Empty) | ✅ (Own Games) | ❌ | ✅ | ✅ | **Anon revoked**. Returns games where `host_user_id = auth.uid()`. |
| **`approve_pickup_game_whatsapp_invite`** | ❌ (Revoked) | ❌ (Denied) | ✅ (Owner Only) | ❌ | ✅ | ✅ | **Anon revoked**. Host ownership check enforced. |
| **`admin_moderate_pickup_game`** | ❌ (Revoked) | ❌ (Denied) | ❌ (Denied) | ✅ | ✅ | ✅ | **Anon revoked**. Requires `is_pickup_game_admin()` or `admin` role. |
| **`is_pickup_game_admin`** | ❌ (Revoked) | ❌ | ❌ | ❌ | ✅ | ✅ | Internal helper. Revoked from anon; restricted to authenticated admins/service. |
| **`is_listing_moderator`** | ❌ (Revoked) | ❌ | ❌ | ✅ | ✅ | ✅ | Internal helper. Revoked from anon; restricted to authenticated moderators/service. |
| **`get_listing_submissions`** | ❌ (Revoked) | ❌ (Denied) | ❌ (Denied) | ✅ | ✅ | ✅ | Moderation intake queue. Accessible only by verified moderators. |
| **`review_listing_submission`** | ❌ (Revoked) | ❌ (Denied) | ❌ (Denied) | ✅ | ✅ | ✅ | Moderation decision execution. Accessible only by verified moderators. |
| **`record_payment_transaction`** | ✅ (Pending) | ✅ (Pending) | ✅ (Pending) | ✅ (Pending) | ✅ (Completed) | ✅ (Completed) | Client can only record `'pending'` payment intent; positive amount check; idempotency. |
| **`verify_payment_transaction`** | ❌ (Revoked) | ❌ (Denied) | ❌ (Denied) | ❌ (Denied) | ✅ | ✅ | **Restricted to Admin & Service Role**. Transitions status to `'completed'`. |
| **`get_listing_subscription_by_order`** | ✅ (Token) | ✅ (Owner / Token) | ✅ | ✅ | ✅ | ✅ | Requires owner (`auth.uid() = user_id`) OR token. Returns zero-PII projection. |
| **`get_venue_booking_voucher`** | ✅ (Token) | ✅ (Owner / Token) | ✅ | ✅ | ✅ | ✅ | Requires owner (`auth.uid() = user_id`) OR voucher token. Returns zero-PII voucher. |
| **`get_booked_slots_for_venue`** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Public slot availability lookup; returns only slot times and court numbers. |
| **`admin_assign_role`** | ❌ (Revoked) | ❌ (Denied) | ❌ (Denied) | ❌ (Denied) | ✅ | ✅ | Admin-only role assignment with immutable audit logging. |
| **`admin_revoke_role`** | ❌ (Revoked) | ❌ (Denied) | ❌ (Denied) | ❌ (Denied) | ✅ (Protected) | ✅ | Admin-only role revocation; enforces last-admin platform safeguard. |
| **`has_role`** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Stable role check helper. Returns boolean without exposing user tables. |
| **`has_permission`** | ❌ (Revoked) | ✅ | ✅ | ✅ | ✅ | ✅ | Authenticated permission evaluation helper. |
| **`is_user_email_verified`** | ❌ (Revoked) | ✅ | ✅ | ✅ | ✅ | ✅ | Authenticated verification status checker. Queries `auth.users` securely. |
| **`get_public_profile`** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Public discovery profile projection. Strips phone number and email address. |

---

## 3. Enforcement Architecture

1. **Gateway Rejection (PostgreSQL Grant Level)**:
   Procedures with revoked `anon` EXECUTE fail immediately at the PostgREST gateway with `HTTP 401 Unauthorized` before executing any PL/pgSQL logic.
2. **Context-Aware PL/pgSQL Authorization**:
   Inside procedures that permit `authenticated` calls, explicit checks verify `auth.uid() = host_user_id` or `public.has_role(auth.uid(), 'admin')`.
3. **Fail-Closed Token Gate**:
   Receipt and voucher lookups fail closed (returning `NULL`, resulting in zero rows) whenever neither caller ownership nor an unguessable high-entropy token (minimum 16 hexadecimal characters) matches.
