# KhelGrid — Phase 5: Deployment Verification & Operations Guide
## Migration Validation, Deployment Status & Release Instructions

**Document:** Deployment Verification & Operations Guide  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 5 — API/RPC Security, Backend Hardening, and Closure of Outstanding Phase 1–4 Work  
**Target Development Supabase Project:** `hznsbxvovjxvmnchzzqt`  
**Production Target:** `https://khelgrid.com/` (STRICTLY OUT-OF-SCOPE / UNTOUCHED)  
**Branch:** `security/phase-5-api-rpc-and-prior-phase-closure`  
**Date:** November 8, 2026  

---

## 1. Environment & Target Verification

- **Development Instance Reference**: `hznsbxvovjxvmnchzzqt`
- **Development Database URL**: `https://hznsbxvovjxvmnchzzqt.supabase.co`
- **Hosting Environment**: Supabase Free Tier + Vercel Free Tier
- **Production Status**: **100% UNTOUCHED**. No connections, migrations, or deployments were performed on production systems.

---

## 2. Migration Dependency & Validation Status

Isolated validation of all four pending security migrations was performed prior to deployment consideration:

| Migration File | Stage | Purpose | Validation Result |
|---|---|---|:---:|
| `20261108040000_phase2_rls_post_merge_remediation.sql` | Phase 2 | Remediate broad SELECT policies on `listing_subscriptions`, `venue_bookings`, `trial_reminders`; enforce FORCE RLS. | **PASSED (100% Syntax & Check Balance)** |
| `20261108000000_phase3_rbac_and_privilege_hardening.sql` | Phase 3 | Install `user_roles`, `role_permissions`, `user_role_audit_logs`, admin assignment RPCs. | **PASSED (100% Syntax & Check Balance)** |
| `20261108050000_phase4_auth_and_session_security.sql` | Phase 4 | Install `profiles` anti-escalation trigger, `is_user_email_verified`, `auth_security_events`. | **PASSED (100% Syntax & Check Balance)** |
| `20261108060000_phase5_api_rpc_and_backend_hardening.sql` | Phase 5 | Audit & harden all 18 stored procedures; revoke anon execute on 9 host/admin RPCs; payment integrity; rate limits. | **PASSED (100% Syntax & Check Balance)** |

### Dependency Sequence
1. **Migration 1**: `20261108040000` sets up `user_id`, `voucher_token`, and strict table-level RLS.
2. **Migration 2**: `20261108000000` creates `user_roles` and RBAC helpers (`has_role`, `has_permission`).
3. **Migration 3**: `20261108050000` installs profile triggers which query `public.user_roles`.
4. **Migration 4**: `20261108060000` locks down RPC permissions and enforces rate limits.

---

## 3. Deployment Feasibility Assessment

### 3.1 Credential Audit
Direct CLI deployment via `npx supabase db push` requires either:
- A personal access token exported as `SUPABASE_ACCESS_TOKEN` (`AccessTokenRequiredError`), OR
- A direct PostgreSQL connection string (`postgresql://postgres:...@db.hznsbxvovjxvmnchzzqt.supabase.co:5432/postgres`).

Neither credential is stored in `.env` (which contains only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to comply with credential isolation rules).

### 3.2 Deployment Instructions for Project Administrator
To apply the validated security migrations to development project `hznsbxvovjxvmnchzzqt`:

1. Sign in to the [Supabase Dashboard](https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt).
2. Confirm the active project reference is **`hznsbxvovjxvmnchzzqt`**.
3. Open **SQL Editor** -> **New Query**.
4. Open the consolidated deployment script:
   `supabase/deployments/phase-2-to-5-consolidated-deployment.sql`
5. Paste the entire SQL script into the query editor and click **Run**.
6. Inspect the execution output. It will confirm:
   - All RLS policies replaced with owner-only policies.
   - `user_roles`, `role_permissions`, and `auth_security_events` tables created.
   - Anonymous execute revoked on host and moderation procedures.
   - FORCE ROW LEVEL SECURITY enabled across all sensitive tables.

---

## 4. Post-Deployment Verification Checklist

After running the consolidated deployment package in the development SQL Editor:
- [ ] Query `public.venue_bookings` with anonymous key: returns `HTTP 200 []` (0 rows) instead of customer records.
- [ ] Query `public.listing_subscriptions` with anonymous key: returns `HTTP 200 []` (0 rows).
- [ ] Query `public.trial_reminders` with anonymous key: returns `HTTP 200 []` (0 rows).
- [ ] Call `public.get_host_pickup_games` with anonymous key: returns `HTTP 401 Unauthorized`.
- [ ] Call `public.admin_moderate_pickup_game` with anonymous key: returns `HTTP 401 Unauthorized`.
- [ ] Call `public.record_payment_transaction` with status `'completed'`: record created with status `'pending'`.
- [ ] Call `public.get_venue_booking_voucher` with invalid token: returns `null` (zero rows).
- [ ] Verify Supabase Security Advisor in the Dashboard: 0 critical warnings.
