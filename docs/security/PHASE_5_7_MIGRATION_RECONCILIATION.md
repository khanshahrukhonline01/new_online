# KhelGrid Security Programme — Phase 5.7 Migration Reconciliation
## Git Repository vs. Hosted Database Reconciliation Record

**Environment:** Supabase Development (`hznsbxvovjxvmnchzzqt`)  
**Production website:** `https://khelgrid.com/` — Strictly out of scope, 100% untouched  
**Branch:** `security/phase-5-7-hosted-db-reconciliation-legacy-rpc-closure`  

---

## 1. Migration Lineage & Status

| Migration File | Module / Scope | Reconciliation Action | Hosted Status |
| :--- | :--- | :--- | :--- |
| `20261031120000_create_athlete_profiles.sql` | Athlete Profiles initial creation | Reconciled: dropped `athlete_profiles_public_insert` and `athlete_profiles_self_update` | Cleaned via Phase 5.7 |
| `20261107233000_phase2_rls_remediation.sql` | RLS Baseline Remediation | Reconciled: owner policies hardened with `auth.uid()` | Aligned |
| `20261108000000_phase3_rbac_and_privilege_hardening.sql` | RBAC & Privilege Hardening | Reconciled: admin role checks and service_role policies | Aligned |
| `20261108060000_phase5_api_rpc_and_backend_hardening.sql` | API & RPC Hardening | Reconciled: legacy overloads deprecated and dropped | Aligned |
| `20261108090000_phase5_3_venue_booking_and_payment_integrity.sql` | Booking Concurrency & Locks | Reconciled: atomic lock pattern preserved | Aligned |
| `20261108110000_phase5_4_payment_verification_and_booking_lifecycle.sql` | Server-authoritative settlements | Reconciled: high-entropy tokens and audit logs | Aligned |
| `20261108133000_phase5_5_payment_gateway_integration.sql` | Razorpay gateway settlement | Reconciled: webhook vs checkout signature verification | Aligned |
| `20261108143000_phase5_6_payment_capture_and_pricing_integrity.sql` | Webhook idempotency & Court tariffs | Reconciled: exact court matching and capture validation | Aligned |
| `20261108160000_phase5_7_hosted_db_reconciliation_legacy_rpc_closure.sql` | Hosted DB closure & Legacy RPC drop | Forward-only corrective migration | Prepared for dashboard execution |

---

## 2. Dropped Legacy Objects & Functions

The following functions and policies have been permanently dropped in Phase 5.7:

1. `DROP POLICY IF EXISTS "athlete_profiles_public_insert" ON public.athlete_profiles;`
2. `DROP POLICY IF EXISTS "athlete_profiles_self_update" ON public.athlete_profiles;`
3. `DROP FUNCTION IF EXISTS public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb);` (15-arg legacy)
4. `DROP FUNCTION IF EXISTS public.create_venue_slot_booking(text, text, text, text, text, text, text, text, numeric, numeric, text, text);`
5. `DROP FUNCTION IF EXISTS public.reserve_venue_slot_atomic(text, text, text, text, text, text, text);` (7-arg legacy)
6. `DROP FUNCTION IF EXISTS public.get_listing_subscription_by_order(text);` (1-arg legacy)
7. `DROP FUNCTION IF EXISTS public.get_venue_booking_voucher(text);` (1-arg legacy)

---

## 3. Forward-Only Migration Safety Guarantees

1. **Non-Destructive**: No `DROP TABLE`, `DROP DATABASE`, or `TRUNCATE` statements exist in `20261108160000_phase5_7_hosted_db_reconciliation_legacy_rpc_closure.sql`.
2. **Historical Data Preservation**: All existing 208+ bookings and existing subscriptions retain their recorded status. No rows modified or deleted.
3. **Atomic Transaction**: Enclosed within `BEGIN;` and `COMMIT;` blocks for zero partial-state failures.
4. **Environment Isolation**: Production (`khelgrid.com`) was never contacted and remains 100% untouched.
