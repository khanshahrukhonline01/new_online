# KhelGrid Phase 1 — Live SECURITY DEFINER Function Exposure Inventory

**Snapshot:** 2026-11-21 UTC  
**Project:** `hznsbxvovjxvmnchzzqt` (development only)  
**Method:** Read-only catalog query against `pg_proc`, `pg_roles`, `pg_trigger`, and `has_function_privilege`.  
**Scope:** Catalog metadata and effective EXECUTE exposure only; not a completed function-body security review.

## Live counts

- Public SECURITY DEFINER functions: **73**.
- Effective EXECUTE by `anon`: **13**.
- Effective EXECUTE by `authenticated`: **54**.
- Functions attached to non-internal triggers: **8**.
- Functions with no explicit function-level `search_path`: **0**.
- Supabase Security Advisor at this snapshot: **13 anon / 54 authenticated**.

Effective role counts overlap. Do not add them to infer unique function count.

## Important caveat

The catalog query does not inspect function bodies, caller paths, data sensitivity, `auth.uid()` checks, dynamic SQL, or whether an RPC is intentionally public. No function is marked safe based on grants alone. Every entry remains **body review required**. Do not revoke other functions indiscriminately; preserve required free listing intake, booking, RSVP, cancellation, tracking and webhook flows until their callers and security checks are tested.

## Inventory

| # | Exact signature | Language | Owner | Function settings | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE | Trigger attached | Classification status |
|---:|---|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | `accept_tenant_invitation(text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 2 | `add_listing_submission_evidence(uuid,text,text,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 3 | `admin_moderate_pickup_game(text,text,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 4 | `admin_verify_manual_payment(text,text,bigint,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 5 | `approve_listing_submission(uuid,text,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 6 | `approve_pickup_game_whatsapp_invite(uuid)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 7 | `assign_listing_submission_defaults()` | plpgsql | postgres | `search_path=pg_catalog, public` | no | no | no | yes | C candidate; body review required |
| 8 | `can_read_athlete_profile(uuid)` | sql | postgres | `search_path=""` | yes | yes | yes | no | A candidate; body review required |
| 9 | `cancel_pickup_game_as_host(text,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 10 | `cancel_pickup_game_reservation(uuid,text)` | plpgsql | postgres | `search_path=""` | yes | yes | yes | no | A candidate; body review required |
| 11 | `check_and_increment_rate_limit(text,integer,integer)` | plpgsql | postgres | `search_path=pg_catalog, public, pg_temp` | no | no | yes | no | D candidate; body review required |
| 12 | `claim_webhook_event(text,text,text,text,jsonb)` | plpgsql | postgres | `search_path=""` | no | no | yes | no | D candidate; body review required |
| 13 | `complete_pickup_game_as_host(text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 14 | `consume_payment_registration_rate_limit(text,integer,integer)` | plpgsql | postgres | `search_path=""` | no | no | yes | no | D candidate; body review required |
| 15 | `create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 16 | `create_tenant_invitation(uuid,text,text,text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 17 | `enforce_listing_moderation_transition()` | plpgsql | postgres | `search_path=pg_catalog, public` | no | no | no | yes | C candidate; body review required |
| 18 | `finalize_webhook_event(text,text,text,jsonb)` | plpgsql | postgres | `search_path=""` | no | no | yes | no | D candidate; body review required |
| 19 | `generate_tenant_invoice_number(uuid,text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 20 | `get_athlete_public_cv(text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | no | yes | no | D candidate; body review required |
| 21 | `get_booked_slots_for_venue(text,text)` | sql | postgres | `search_path=public, pg_temp` | yes | yes | yes | no | A candidate; body review required |
| 22 | `get_host_pickup_games()` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 23 | `get_listing_moderator_access_audit(integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 24 | `get_listing_submission_evidence(uuid)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 25 | `get_listing_submission_publication_details(uuid)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 26 | `get_listing_verification_queue(text,integer,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 27 | `get_moderation_access_profile()` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 28 | `get_pickup_game_whatsapp_invite(uuid,text)` | plpgsql | postgres | `search_path=""` | yes | yes | yes | no | A candidate; body review required |
| 29 | `get_submission_tracking_status(text,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | yes | yes | yes | no | A candidate; body review required |
| 30 | `get_venue_booking_voucher(text,text)` | plpgsql | postgres | `search_path=public, auth, extensions, pg_temp` | yes | yes | yes | no | A candidate; body review required |
| 31 | `has_tenant_role(uuid,text[])` | sql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 32 | `is_active_tenant(uuid)` | sql | postgres | `search_path=public, pg_temp` | yes | yes | yes | no | A candidate; body review required |
| 33 | `is_guardian_of_student(uuid)` | sql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 34 | `is_pickup_game_admin()` | sql | postgres | `search_path=""` | no | yes | no | no | B candidate; body review required |
| 35 | `is_service_role_or_admin()` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 36 | `is_tenant_member(uuid)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 37 | `list_listing_moderator_accounts()` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 38 | `log_listing_submission_created()` | plpgsql | postgres | `search_path=pg_catalog, public` | no | no | no | yes | C candidate; body review required |
| 39 | `moderate_athlete_profile(uuid,text,text,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 40 | `prevent_athlete_profile_user_id_change()` | plpgsql | postgres | `search_path=public, auth, pg_temp` | no | no | yes | yes | C candidate; body review required |
| 41 | `provision_initial_tenant_owner(text,text,text,text,text,text,text,text,jsonb)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 42 | `publish_listing_submission(uuid,text,uuid,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 43 | `reconcile_invoice_on_transaction()` | plpgsql | postgres | `search_path=public, pg_temp` | yes | yes | yes | yes | C candidate; body review required |
| 44 | `record_batch_attendance(uuid,uuid,date,jsonb)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 45 | `record_fee_payment(uuid,uuid,uuid,integer,text,text,text,text,text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 46 | `record_listing_subscription(text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb,text)` | plpgsql | postgres | `search_path=""` | no | no | yes | no | D candidate; body review required |
| 47 | `record_payment_transaction(text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb)` | plpgsql | postgres | `search_path=""` | no | no | yes | no | D candidate; body review required |
| 48 | `reject_listing_submission(uuid,text,text,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 49 | `reopen_pickup_game_as_host(text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 50 | `request_listing_corrections(uuid,text,text,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 51 | `reschedule_pickup_game(text,text,text,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 52 | `reserve_venue_slot_atomic(text,text,text,integer,text,text,text,text,text)` | plpgsql | postgres | `search_path=public, extensions, auth, pg_temp` | yes | yes | yes | no | A candidate; body review required |
| 53 | `resubmit_listing_submission(text,text,text,text,text,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | yes | yes | yes | no | A candidate; body review required |
| 54 | `review_listing_submission_evidence(uuid,text,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 55 | `rls_auto_enable()` | plpgsql | postgres | `search_path=pg_catalog` | no | no | no | no | F — inspect; body review required |
| 56 | `rsvp_pickup_game(text,text,text,boolean)` | plpgsql | postgres | `search_path=""` | yes | yes | yes | no | A candidate; body review required |
| 57 | `save_listing_publication_details(uuid,jsonb,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 58 | `set_listing_moderator_access(uuid,text,boolean,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 59 | `set_listing_subscription_activation_window()` | plpgsql | postgres | `search_path=""` | no | no | yes | yes | C candidate; body review required |
| 60 | `settle_payment_transaction(text,text,text,text,bigint,text)` | plpgsql | postgres | `search_path=public, private, extensions, auth, pg_temp` | no | no | yes | no | D candidate; body review required |
| 61 | `settle_razorpay_payment_verified(text,text,text,bigint,text,text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | no | yes | no | D candidate; body review required |
| 62 | `start_listing_review(uuid,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 63 | `submit_listing_intake(text,text,text,text,text,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | yes | yes | yes | no | A candidate; body review required |
| 64 | `sync_tenant_public_directory()` | plpgsql | postgres | `search_path=public, pg_temp` | yes | yes | yes | yes | C candidate; body review required |
| 65 | `sync_verified_listing_publication()` | plpgsql | postgres | `search_path=pg_catalog, public` | no | no | yes | yes | C candidate; body review required |
| 66 | `unpublish_listing_submission(uuid,text,text,integer)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 67 | `update_pickup_game_capacity(text,integer,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 68 | `update_pickup_game_details(text,text,text,text,text)` | plpgsql | postgres | `search_path=""` | no | yes | yes | no | B candidate; body review required |
| 69 | `update_tenant_membership_role(uuid,text)` | plpgsql | postgres | `search_path=public, pg_temp` | no | yes | yes | no | B candidate; body review required |
| 70 | `verify_listing_submission(uuid,text,text)` | plpgsql | postgres | `search_path=pg_catalog, public` | no | yes | yes | no | B candidate; body review required |
| 71 | `verify_payment_signature_and_settle(text,text,text)` | plpgsql | postgres | `search_path=public, private, extensions, auth, pg_temp` | no | no | yes | no | D candidate; body review required |
| 72 | `verify_payment_transaction(text,text,text,bigint,text)` | plpgsql | postgres | `search_path=public, private, extensions, auth, pg_temp` | no | no | yes | no | D candidate; body review required |
| 73 | `verify_security_schema_migrations()` | plpgsql | postgres | `search_path=public, information_schema, pg_catalog, pg_temp` | no | no | yes | no | D candidate; body review required |

## Required next audit steps

1. Retrieve and inspect the complete `pg_get_functiondef` for every entry.
2. Trace each frontend, Edge Function, trigger and RLS caller.
3. Verify auth.uid(), token checks, authorization, fixed search paths, schema qualification and data returned.
4. Build per-function regression tests before any grant change.
5. Re-run Supabase Security Advisor after approved ACL migrations.
6. Reconcile this inventory against the exact Advisor snapshot timestamp; do not reuse these counts after a migration.

**Verdict: catalog inventory complete; full source/body security review NOT COMPLETE.**