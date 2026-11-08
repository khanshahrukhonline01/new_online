# KhelGrid Security Programme — Phase 5.7 Deployment Runbook
## Dashboard SQL Execution & Verification Runbook

**Environment:** Supabase Development (`hznsbxvovjxvmnchzzqt`)  
**Production website:** `https://khelgrid.com/` — Strictly out of scope, 100% untouched  
**Artifact:** `supabase/migrations/20261108160000_phase5_7_hosted_db_reconciliation_legacy_rpc_closure.sql`  

---

## 1. Pre-Deployment Checklist

1. [ ] Confirm active project reference in Supabase dashboard is `hznsbxvovjxvmnchzzqt`.
2. [ ] Confirm production (`khelgrid.com`) is isolated and NOT selected.
3. [ ] Confirm database snapshot / backup is available if required.
4. [ ] Review migration script to verify `BEGIN;` and `COMMIT;` boundaries.

---

## 2. Step-by-Step Dashboard Execution

1. Navigate to the **Supabase Dashboard**: `https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql`.
2. Click **New query**.
3. Name the query: `Phase 5.7 Hosted DB Reconciliation & Legacy RPC Closure`.
4. Paste the entire content of:
   `supabase/migrations/20261108160000_phase5_7_hosted_db_reconciliation_legacy_rpc_closure.sql`
5. Click **Run** (Ctrl + Enter).
6. Verify output message reports: `Success. No rows returned` or transaction committed.

---

## 3. Post-Deployment Verification Query

Run this query in SQL Editor immediately after deployment:

```sql
SELECT public.verify_security_schema_migrations();
```

### Expected JSON Output:

```json
{
  "phase": "5.7",
  "status": "fully_reconciled",
  "checks": {
    "athlete_profiles_permissive_insert_dropped": true,
    "athlete_profiles_permissive_update_dropped": true,
    "listing_subscription_payment_status_default": "'pending'::text",
    "venue_booking_payment_status_default": "'pending'::text",
    "legacy_15_arg_subscription_rpc_dropped": true,
    "legacy_1_arg_subscription_by_order_rpc_dropped": true
  },
  "verified_at": "..."
}
```

---

## 4. Rollback Plan

If any unexpected error occurs during execution, the transaction will automatically rollback due to PostgreSQL `BEGIN ... COMMIT` block.

If manual rollback is required:
1. Re-grant policies if needed using `phase-2-to-8-master-consolidated-deployment.sql`.
2. No data loss can occur as Phase 5.7 is forward-only and non-destructive.
