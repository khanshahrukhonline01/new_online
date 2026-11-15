# KhelGrid Security Programme — Phase 2: Live Database Verification Checklist

**Purpose:** Comprehensive checklist for database administrators to verify the security state of Supabase development database `hznsbxvovjxvmnchzzqt` prior to and following execution of migration `20261108040000_phase2_rls_post_merge_remediation.sql`.

---

## 1. Pre-Deployment Baseline Verification (Current Live State)

Before running the migration, verify the current state:

- [ ] **Catalog Migration Version:**
  ```sql
  SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
  ```
  *Expected current top version:* `20261106130000_add_listing_subscription_plans.sql`.

- [ ] **Broad Policies on Active Tables:**
  ```sql
  SELECT tablename, policyname, roles, cmd, qual, with_check 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename IN ('listing_subscriptions', 'venue_bookings', 'trial_reminders');
  ```
  *Identified Finding:* Overly permissive policies (`USING (true)`) exist on development database pending remediation.

- [ ] **Zero-Policy Tables Check:**
  ```sql
  SELECT c.relname, c.relrowsecurity, count(p.policyname) AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
  WHERE n.nspname = 'public'
    AND c.relname IN ('pickup_game_participants', 'pickup_game_rsvp_rate_limits')
  GROUP BY c.relname, c.relrowsecurity;
  ```
  *Identified Finding:* `relrowsecurity = true` with `policy_count = 0`.

- [ ] **Host Procedures Anonymous Privilege Check:**
  ```sql
  SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') AS anon_can_execute
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('cancel_pickup_game_as_host', 'approve_pickup_game_whatsapp_invite', 'admin_moderate_pickup_game');
  ```
  *Identified Finding:* `anon_can_execute = true` on several host-only procedures.

---

## 2. Post-Deployment Verification Queries (Post-Migration `20261108040000`)

Following controlled application of `20261108040000_phase2_rls_post_merge_remediation.sql`, execute the following audit queries:

### 2.1 Verify Schema Hardening (Columns & Indices)
```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'venue_bookings' AND column_name IN ('user_id', 'voucher_token'))
    OR (table_name = 'listing_subscriptions' AND column_name IN ('access_token'))
  );
```
- [ ] `public.venue_bookings.user_id` exists (type `uuid`).
- [ ] `public.venue_bookings.voucher_token` exists (type `text`).
- [ ] `public.listing_subscriptions.access_token` exists (type `text`).

### 2.2 Verify RLS Policies
```sql
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('listing_subscriptions', 'venue_bookings', 'trial_reminders', 'pickup_game_participants', 'pickup_game_rsvp_rate_limits')
ORDER BY tablename, policyname;
```
- [ ] `listing_subscriptions_read` dropped; `listing_subscriptions_owner_read` exists for `authenticated`.
- [ ] `venue_bookings_read` dropped; `venue_bookings_owner_read` exists for `authenticated`.
- [ ] `trial_reminders_read` dropped; `trial_reminders_owner_read` exists for `authenticated`.
- [ ] `trial_reminders_authenticated_update` dropped; `trial_reminders_owner_update` exists with `auth.uid() = user_id` for both USING and WITH CHECK.
- [ ] `pickup_game_participants_anon_deny` exists for `anon` with `USING (false)`.
- [ ] `pickup_game_rate_limits_deny_all` exists for `anon, authenticated` with `USING (false)`.

### 2.3 Verify FORCE ROW LEVEL SECURITY
```sql
SELECT relname, relforcerowsecurity 
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace 
  AND relname IN (
    'listing_subscriptions', 
    'venue_bookings', 
    'trial_reminders', 
    'khelgrid_payments', 
    'pickup_game_participants', 
    'pickup_game_rsvp_rate_limits'
  );
```
- [ ] All 6 tables report `relforcerowsecurity = true`.

### 2.4 Verify RPC Permissions & Function Signatures
```sql
SELECT proname, 
       pg_get_function_arguments(oid) AS arguments,
       has_function_privilege('anon', oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', oid, 'EXECUTE') AS auth_can_execute
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'get_venue_booking_voucher',
    'get_listing_subscription_by_order',
    'get_booked_slots_for_venue',
    'cancel_pickup_game_as_host',
    'approve_pickup_game_whatsapp_invite',
    'admin_moderate_pickup_game'
  );
```
- [ ] `get_venue_booking_voucher(p_booking_ref text, p_voucher_token text)`: `anon=true`, `authenticated=true`.
- [ ] `get_listing_subscription_by_order(p_order_id text, p_access_token text)`: `anon=true`, `authenticated=true`.
- [ ] `get_booked_slots_for_venue(p_venue_id text, p_slot_date text)`: `anon=true`, `authenticated=true`.
- [ ] `cancel_pickup_game_as_host`: `anon_can_execute = false`, `auth_can_execute = true`.
- [ ] `approve_pickup_game_whatsapp_invite`: `anon_can_execute = false`, `auth_can_execute = true`.
- [ ] `admin_moderate_pickup_game`: `anon_can_execute = false`, `auth_can_execute = true`.

### 2.5 Verify Token-Based Voucher Access Simulation
```sql
-- Querying with invalid token must return 0 rows:
SELECT * FROM public.get_venue_booking_voucher('VB-SAMPLE-REF', 'invalid_token_123456');
-- Querying without token as anonymous must return 0 rows:
SELECT * FROM public.get_venue_booking_voucher('VB-SAMPLE-REF', NULL);
```
- [ ] Both queries return 0 rows.
- [ ] Zero unmasked customer telephone numbers or email addresses returned.
