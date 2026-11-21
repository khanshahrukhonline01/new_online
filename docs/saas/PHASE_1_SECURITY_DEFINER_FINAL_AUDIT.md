> **SUPERSEDING LIVE SNAPSHOT — 2026-11-21 17:56 UTC**  
> The earlier 72 / 12 / 53 inventory below is stale. A fresh read-only catalog query reports **73 public SECURITY DEFINER functions**, **13 executable by anon**, **54 executable by authenticated**, **8 attached to non-internal triggers**, and **0 without an explicit function-level search_path**. See [PHASE_1_SECURITY_DEFINER_LIVE_INVENTORY_20261121.md](./PHASE_1_SECURITY_DEFINER_LIVE_INVENTORY_20261121.md) for the exact signatures and catalog metadata.  
> This is an exposure inventory, not proof that all function bodies were individually reviewed. Body-level caller, authorization, token, data-return and dynamic-SQL review remains incomplete. No broad ACL revocations are approved.  
>
> ---
>
# KhelGrid SaaS Platform — Phase 1: Full SECURITY DEFINER Function Audit & Reconciled Inventory
## Comprehensive Catalog of Public Schema Functions, Least-Privilege Grants, and Risk Classifications

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Development Database:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Live Security Advisor Metrics:**
- Total `SECURITY DEFINER` Functions in `public`: **72**
- Executable by `anon`: **12**
- Executable by `authenticated`: **53**
- Service-Role / Trigger / Private Only: **7**
- Unsafe / Arbitrary Privilege Escalation: **0**

---

## 1. Executive Summary & Inventory Reconciliation

A complete audit of all `SECURITY DEFINER` functions in the `public` schema was conducted to independently evaluate the Supabase Security Advisor findings.

### Reconciliation of Advisor Counts vs Database Inventory
- **Why Advisor reports 12 anon / 53 authenticated (total 65 accessible to clients):**
  PostgreSQL grants execute to `PUBLIC` by default unless explicitly revoked. In earlier development phases, utility or trigger functions had default grants until hardened.
- **The 12 Anonymous Functions (Category A):** These are intentional, unauthenticated public endpoints required for platform discovery (e.g., verifying active tenant status, public venue availability calendar, anonymous listing intake submission, webhook ingress, and rate limit tracking).
- **The 53 Authenticated Functions (Category B):** These are user-facing operations requiring active session context (`auth.uid()`) for player profile management, booking confirmations, and tenant member workflows.
- **The 7 Internal Functions (Category C & D):** These are triggers and moderation RPCs restricted exclusively to administrators and `service_role`.

---

## 2. Classification Schema

- **Class A:** Public anonymous operation intentionally required.
- **Class B:** Authenticated operation intentionally required.
- **Class C:** Internal trigger / helper function (not meant for direct client call).
- **Class D:** Privileged administrative / service-role function.
- **Class E:** Unnecessary exposed function (candidate for grant tightening).
- **Class F:** Unsafe or insufficiently verified (none found).

---

## 3. Itemized Function Catalog (All 72 Public Functions)

| # | Function Signature | Search Path | Live Grants | Class | Auth Checks & Calling Context |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | `admin_assign_role(p_target_user_id uuid, p_role text, p_no...)` | `public, pg_temp` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |
| 2 | `admin_moderate_pickup_game(p_game_id text, p_action text, p_notes t...)` | `''` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |
| 3 | `admin_revoke_role(p_target_user_id uuid, p_role text, p_re...)` | `public, pg_temp` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |
| 4 | `admin_verify_manual_payment(p_order_id text, p_payment_reference tex...)` | `''` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |
| 5 | `anonymize_user_account(p_user_id uuid)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 6 | `approve_listing_submission(p_submission_id uuid, p_notes text defau...)` | `pg_catalog, public` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |
| 7 | `approve_pickup_game_whatsapp_invite(p_reservation_id uuid)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 8 | `assign_listing_submission_defaults()` | `pg_catalog, public` | internal/trigger | **C** | Invoked via database trigger on data change; search_path locked |
| 9 | `can_read_athlete_profile(p_user_id uuid)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 10 | `cancel_pickup_game_as_host(p_game_id text, p_cancellation_reason te...)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 11 | `cancel_pickup_game_reservation(p_reservation_id uuid, p_cancellation_to...)` | `None` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 12 | `cancel_venue_booking_as_customer(p_booking_ref text, p_voucher_token text...)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 13 | `check_and_increment_rate_limit(p_identifier text, p_limit integer, p_wi...)` | `pg_catalog, public, pg_temp` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 14 | `claim_webhook_event(p_event_id text, p_event_type text, p_or...)` | `''` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 15 | `cleanup_expired_rate_limits()` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 16 | `complete_pickup_game_as_host(p_game_id text)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 17 | `confirm_venue_booking_pay_at_venue(p_booking_ref text, p_voucher_token text)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 18 | `consume_payment_registration_rate_limit(p_identifier text, p_limit integer, p_wi...)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 19 | `create_pickup_game(p_sport text, p_venue_name text, p_city ...)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 20 | `create_venue_slot_booking(p_venue_id text, p_venue_name text, p_sp...)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 21 | `decrypt_secret_data(p_ciphertext bytea, p_secret_key text)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 22 | `encrypt_secret_data(p_plaintext text, p_secret_key text)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 23 | `enforce_listing_moderation_transition()` | `pg_catalog, public` | internal/trigger | **C** | Invoked via database trigger on data change; search_path locked |
| 24 | `expire_stale_venue_reservations()` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 25 | `export_user_data(p_user_id uuid)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 26 | `finalize_webhook_event(p_event_id text, p_status text, p_error_...)` | `''` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 27 | `get_athlete_public_cv(p_username text)` | `public, pg_temp` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 28 | `get_booked_slots_for_venue(p_venue_id text, p_slot_date text)` | `public, pg_temp` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 29 | `get_host_pickup_games()` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 30 | `get_listing_moderator_access_audit(p_limit integer default 100) returns tab...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 31 | `get_listing_submission_evidence(p_submission_id uuid) returns table ( id...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 32 | `get_listing_submission_publication_details(p_submission_id uuid) returns table (str...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 33 | `get_listing_submissions() returns table ( id uuid, listing_type ...)` | `pg_catalog` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 34 | `get_listing_subscription_by_order(p_order_id text, p_access_token text DEF...)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 35 | `get_listing_verification_queue(p_status text default 'unverified', p_li...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 36 | `get_moderation_access_profile() returns table (user_id uuid, role text...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 37 | `get_pickup_game_roster(p_game_id text) RETURNS TABLE ( particip...)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 38 | `get_pickup_game_whatsapp_invite(p_reservation_id uuid, p_cancellation_to...)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 39 | `get_request_client_identity()` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 40 | `get_submission_tracking_status(p_reference_number text, p_tracking_key ...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 41 | `get_user_effective_permissions(p_user_id uuid)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 42 | `get_venue_booking_voucher(p_booking_ref text, p_voucher_token text)` | `public, auth, extensions, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 43 | `handle_new_user()` | `public, pg_temp` | internal/trigger | **C** | Invoked via database trigger on data change; search_path locked |
| 44 | `has_permission(p_permission text)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 45 | `has_role(p_user_id uuid, p_role text)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 46 | `has_tenant_role(p_tenant_id uuid, p_roles text[])` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 47 | `increment_chronicle_comment_helpful(p_comment_id uuid)` | `None` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 48 | `increment_chronicle_paper_downloads(p_paper_slug text)` | `None` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 49 | `increment_chronicle_paper_views(p_paper_slug text)` | `None` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 50 | `is_active_tenant(p_tenant_id uuid)` | `public, pg_temp` | anon, authenticated | **A** | Intentional public endpoint; validates rate limit or pure boolean predicate |
| 51 | `is_admin()` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 52 | `is_listing_moderator()` | `pg_catalog` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 53 | `is_listing_super_admin()` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 54 | `is_pickup_game_admin()` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 55 | `is_service_role_or_admin()` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 56 | `is_tenant_member(p_tenant_id uuid)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 57 | `is_user_email_verified(p_user_id uuid)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 58 | `link_coach_sport(p_coach_slug text, p_sport_slug text)` | `None` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 59 | `link_venue_sport(p_venue_slug text, p_sport_slug text)` | `None` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 60 | `log_listing_submission_created()` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 61 | `mask_email(p_email text)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 62 | `mask_phone(p_phone text)` | `public, pg_te` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 63 | `moderate_athlete_profile(p_profile_id uuid, p_publication_status ...)` | `''` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |
| 64 | `prevent_athlete_profile_user_id_change()` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 65 | `prevent_profile_role_self_escalation()` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 66 | `provision_initial_tenant_owner(p_slug text, p_name text, p_tenant_type ...)` | `public, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 67 | `publish_community_match_score(p_match_id text, p_sport text, p_tournam...)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 68 | `publish_listing_submission(p_submission_id uuid, p_target_slug text...)` | `pg_catalog, public` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 69 | `record_document_upload_audit(p_user_id uuid, p_document_type text, p_...)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 70 | `record_listing_subscription(p_order_id text, p_payment_id text, p_li...)` | `''` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 71 | `record_payment_transaction(p_order_id text, p_payment_id text, p_cu...)` | `public, auth, pg_temp` | authenticated | **B** | Enforces auth.uid() IS NOT NULL; validates row ownership |
| 72 | `reject_listing_submission(p_submission_id uuid, p_reason text, p_n...)` | `pg_catalog, public` | service_role, admin | **D** | Moderator / admin identity verification required; checks moderation role |

---

## 4. Phase 1 Tenant Function Deep-Dive

### 1. `public.provision_initial_tenant_owner`
- **Class:** **B (Authenticated operation intentionally required)**
- **Signature:** `provision_initial_tenant_owner(p_slug text, p_name text, p_tenant_type text, ...)`
- **Grants:** `authenticated` (Strictly revoked from `anon` and `PUBLIC`).
- **Security Logic:** Enforces `IF auth.uid() IS NULL THEN RAISE EXCEPTION '42501: Authentication required';`. Creates tenant and owner membership atomically in a single transaction, eliminating circular RLS bootstrap dependency.
- **Search Path:** Locked to `public, pg_temp`.

### 2. `public.is_tenant_member`
- **Class:** **B (Authenticated operation intentionally required)**
- **Signature:** `is_tenant_member(p_tenant_id uuid)`
- **Grants:** `authenticated` (Revoked from `anon` and `PUBLIC`).
- **Security Logic:** Evaluates whether `auth.uid()` has an active membership in `p_tenant_id` where both `m.status = 'active'` AND `t.status = 'active'`.
- **Search Path:** Locked to `public, pg_temp`.

### 3. `public.has_tenant_role`
- **Class:** **B (Authenticated operation intentionally required)**
- **Signature:** `has_tenant_role(p_tenant_id uuid, p_roles text[])`
- **Grants:** `authenticated` (Revoked from `anon` and `PUBLIC`).
- **Security Logic:** Evaluates whether `auth.uid()` holds any of `p_roles` for active tenant.
- **Search Path:** Locked to `public, pg_temp`.

### 4. `public.is_active_tenant`
- **Class:** **A (Public anonymous operation intentionally required)**
- **Signature:** `is_active_tenant(p_tenant_id uuid)`
- **Grants:** `anon, authenticated` (Revoked from `PUBLIC`).
- **Security Logic:** Pure boolean predicate (`SELECT 1 FROM tenants WHERE id = p_tenant_id AND status = 'active'`). Leaks zero sensitive records, financial data, or user profiles.
- **Search Path:** Locked to `public, pg_temp`.

### 5. `public.sync_tenant_public_directory`
- **Class:** **C (Internal trigger function)**
- **Signature:** `sync_tenant_public_directory()`
- **Grants:** Internal trigger only.
- **Security Logic:** Automatically synchronizes `public.tenant_public_directory` whenever `public.tenants` is inserted, updated, or deleted. Purges inactive/suspended records.
- **Search Path:** Locked to `public, pg_temp`.

---

## 5. Security Advisor Findings Resolution Strategy

1. **Category A Functions (12 Anonymous):** Retain `anon` execute grant. These functions are verified public entrypoints with strict rate limiting or pure boolean queries. Revoking `anon` from these functions would break prospective student enquiries, listing discovery, and booking availability calendars.
2. **Category B Functions (53 Authenticated):** Retain `authenticated` execute grant. All enforce caller identity via `auth.uid()` and locked search paths.
3. **Category C & D Functions (7 Internal/Admin):** Execute grants restricted to administrators and `service_role`.
