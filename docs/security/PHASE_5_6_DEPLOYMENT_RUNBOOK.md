# KhelGrid Security Programme — Phase 5.6
## Deployment & Operational Verification Runbook

> **Document ID:** SEC-RUNBOOK-PHASE-5-6  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
> **Production Target:** `https://khelgrid.com/` — Strictly Out of Scope / 100% Untouched  
> **Date:** November 8, 2026  

---

## 1. Safety Mandates & Authorizations

1. **Explicit Admin Authorization Required**: No migration or Edge Function deployment may be executed without explicit operator review and sign-off.
2. **Development Target Only**: The development database is `hznsbxvovjxvmnchzzqt`. Never configure or connect credentials for production.
3. **No Migration History Fabrication**: Migration scripts must not execute manual `INSERT` statements into `supabase_migrations.schema_migrations`.
4. **Zero Row Deletions**: Preserve all 208 venue bookings, 3 athlete profiles, 3 reminders, and 508 listing subscriptions.

---

## 2. Pre-Deployment Baseline Verification Checklist

Run these read-only SQL queries in the Supabase Dashboard SQL Editor for `hznsbxvovjxvmnchzzqt`:

### Check 1: Verify Current Migration Version
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;
```

### Check 2: Verify Target Record Counts
```sql
SELECT
  (SELECT count(*) FROM public.venue_bookings) AS venue_bookings_count,
  (SELECT count(*) FROM public.listing_subscriptions) AS subscriptions_count,
  (SELECT count(*) FROM public.athlete_profiles) AS athlete_profiles_count,
  (SELECT count(*) FROM public.trial_reminders) AS trial_reminders_count;
```
*Expected: 208 bookings, 508 subscriptions, 3 athlete profiles, 3 trial reminders.*

### Check 3: Check Schema Readiness
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'venues'
  AND column_name = 'slot_hourly_fee';
```

---

## 3. Database Migration Execution Instructions

### Forward-Only Migration File
`supabase/migrations/20261108140000_phase5_6_capture_assurance_and_pricing_integrity.sql`

1. Open Supabase Dashboard -> Project `hznsbxvovjxvmnchzzqt` -> **SQL Editor**.
2. Copy and paste the complete content of `20261108140000_phase5_6_capture_assurance_and_pricing_integrity.sql`.
3. Execute the script within a single transaction block (`BEGIN ... COMMIT;`).

### Master Consolidated Package
`supabase/deployments/phase-2-to-8-master-consolidated-deployment.sql`
- Contains all consolidated changes from Phase 2 through Phase 5.6.

---

## 4. Post-Deployment Verification Queries

### Verify 1: Migration Verification Function
Execute the read-only verification procedure:
```sql
SELECT public.verify_security_schema_migrations();
```
*Expected output: JSON report confirming all Phase 5.6 capabilities (`capture_assurance`, `webhook_reliability`, `venue_pricing_integrity`, `settlement_target_locks`) are verified (`status: "OK"`).*

### Verify 2: Procedure Privilege Grants
```sql
SELECT
  p.proname,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  r.rolname as granted_to
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN information_schema.routine_privileges rp ON rp.routine_name = p.proname
LEFT JOIN pg_roles r ON r.rolname = rp.grantee
WHERE n.nspname = 'public'
  AND p.proname IN ('settle_payment_transaction', 'claim_webhook_event', 'finalize_webhook_event', 'reserve_venue_slot_atomic');
```
*Confirm that `settle_payment_transaction`, `claim_webhook_event`, and `finalize_webhook_event` are granted strictly to `service_role` and revoked from `PUBLIC, anon, authenticated`.*

---

## 5. Edge Function Deployment Instructions

Deploy updated Edge Functions to development project `hznsbxvovjxvmnchzzqt`:

```bash
# Verify environment secrets
supabase secrets list --project-ref hznsbxvovjxvmnchzzqt

# Required secrets:
# RAZORPAY_KEY_ID
# RAZORPAY_KEY_SECRET
# RAZORPAY_WEBHOOK_SECRET
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY

# Deploy verify-razorpay-payment
supabase functions deploy verify-razorpay-payment --project-ref hznsbxvovjxvmnchzzqt

# Deploy razorpay-webhook
supabase functions deploy razorpay-webhook --project-ref hznsbxvovjxvmnchzzqt
```

---

## 6. Rollback & Disaster Recovery Plan

If unexpected behavior occurs during staged deployment:
1. **Transaction Abort**: The migration is enclosed in `BEGIN ... COMMIT;`. Any syntax error or exception during execution rolls back all changes automatically.
2. **Reconciliation Queue**: Any payments that encounter orphaned target rows or expired slots are quarantined in `public.khelgrid_payments` with `status = 'reconciliation_required'` without corrupting active booking states.
3. **Audit Trail**: Every webhook attempt is recorded in `public.payment_webhook_events` for manual forensic inspection.
