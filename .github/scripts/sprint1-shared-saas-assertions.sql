-- =============================================================================
-- KhelGrid TOSM Sprint 1 — Shared SaaS Foundation PostgreSQL Acceptance Assertions
-- Runs safely inside an atomic rolled-back transaction (BEGIN; ... ROLLBACK;)
-- Covers all 9 Sprint 1 identities across Phases 1, 2, 4, 5 & 8.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_confirmed_at'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN email_confirmed_at timestamptz DEFAULT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN phone text DEFAULT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user uuid, p_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_user IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claims', '{}', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', p_user::text,
        'role', 'authenticated',
        'email', COALESCE(p_email, '')
      )::text,
      true
    );
    SET LOCAL ROLE authenticated;
  END IF;
END;
$$;

DO $$
DECLARE
  u_unconfirmed uuid := '90000000-0000-0000-0000-000000000002';
  u_athlete     uuid := '90000000-0000-0000-0000-000000000003';
  u_coach       uuid := '90000000-0000-0000-0000-000000000004';
  u_owner_a     uuid := '90000000-0000-0000-0000-000000000005';
  u_director_a  uuid := '90000000-0000-0000-0000-000000000006';
  u_staff_a     uuid := '90000000-0000-0000-0000-000000000007';
  u_revoked     uuid := '90000000-0000-0000-0000-000000000008';
  u_moderator   uuid := '90000000-0000-0000-0000-000000000009';
  u_invited     uuid := '90000000-0000-0000-0000-000000000010';

  v_t_alpha     uuid;
  v_t_alpha_dup uuid;
  v_t_coach     uuid;
  v_branch_1    uuid;
  v_m_dir_a     uuid;
  v_m_staff_a   uuid;
  v_m_revoked   uuid;
  v_invite_id   uuid;
  v_invite_hash text := repeat('a', 64);
  v_acad_id     uuid;

  v_cnt         integer;
  v_bool        boolean;
  v_row         public.tenants%ROWTYPE;
  v_sub_status  text;
  v_sub_plan    text;
  v_pay_enabled boolean;
  v_force_missing text;
  v_direct_ins_priv boolean;
  v_err         text;
BEGIN
  INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
    (u_unconfirmed, 'unconfirmed@khelgrid-test.local', NULL),
    (u_athlete,     'athlete@khelgrid-test.local',     now()),
    (u_coach,       'coach@khelgrid-test.local',       now()),
    (u_owner_a,     'owner-alpha@khelgrid-test.local', now()),
    (u_director_a,  'director-a@khelgrid-test.local',  now()),
    (u_staff_a,     'staff-a@khelgrid-test.local',     now()),
    (u_revoked,     'revoked@khelgrid-test.local',     now()),
    (u_moderator,   'moderator@khelgrid-test.local',   now()),
    (u_invited,     'invited-coach@khelgrid-test.local', now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at;

  INSERT INTO public.profiles (id, role, display_name) VALUES
    (u_unconfirmed, 'athlete',   'Unconfirmed User'),
    (u_athlete,     'athlete',   'Verified Athlete'),
    (u_coach,       'coach',     'Verified Coach'),
    (u_owner_a,     'academy',   'Owner Alpha'),
    (u_director_a,  'academy',   'Director Alpha'),
    (u_staff_a,     'coach',     'Branch Staff Alpha'),
    (u_revoked,     'coach',     'Revoked Member'),
    (u_moderator,   'moderator', 'Platform Moderator'),
    (u_invited,     'coach',     'Invited Coach')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

  -- Platform moderation privilege must ONLY be checked from public.user_roles, never profiles.role
  INSERT INTO public.user_roles (user_id, role, is_active, notes)
  VALUES (u_moderator, 'moderator', true, 'Sprint 1 test platform moderator')
  ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

  -- =========================================================================
  -- CHECK 1: Privilege & Trigger Preconditions (tenants INSERT revoked, FORCE RLS)
  -- =========================================================================
  SELECT has_table_privilege('authenticated', 'public.tenants', 'INSERT') INTO v_direct_ins_priv;
  IF v_direct_ins_priv THEN
    RAISE EXCEPTION 'FAIL (C1): authenticated still has INSERT privilege on public.tenants';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenants_auth_insert'
  ) THEN
    RAISE EXCEPTION 'FAIL (C1): legacy tenants_auth_insert policy still present';
  END IF;

  SELECT string_agg(c.relname, ', ') INTO v_force_missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'tenants', 'tenant_memberships', 'tenant_units', 'tenant_public_directory',
      'tenant_invitations', 'saas_subscriptions', 'saas_audit_logs',
      'tenant_audit_logs', 'profiles', 'academy_staff_branch_assignments'
    )
    AND NOT c.relforcerowsecurity;
  IF v_force_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL (C1): FORCE ROW LEVEL SECURITY missing on: %', v_force_missing;
  END IF;

  -- =========================================================================
  -- CHECK 2 (Identity 1 - Anonymous): fail closed on private RPCs & unapproved dir
  -- =========================================================================
  PERFORM pg_temp.act_as(NULL, NULL);

  BEGIN
    PERFORM public.provision_initial_tenant_owner('anon-hack', 'Anon Org', 'academy');
    RAISE EXCEPTION 'FAIL (ID1): anon should not execute provision_initial_tenant_owner';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    INSERT INTO public.tenants (slug, name, tenant_type, owner_id)
    VALUES ('anon-direct', 'Anon Direct', 'academy', u_owner_a);
    RAISE EXCEPTION 'FAIL (ID1): anon direct INSERT into tenants should fail';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  RESET ROLE;

  -- =========================================================================
  -- CHECK 3 (Identity 2 - Unconfirmed Email User): blocked from provisioning
  -- =========================================================================
  PERFORM pg_temp.act_as(u_unconfirmed, 'unconfirmed@khelgrid-test.local');

  v_err := NULL;
  BEGIN
    PERFORM public.provision_initial_tenant_owner('unconfirmed-acad', 'Unconfirmed Academy', 'academy');
    RAISE EXCEPTION 'FAIL (ID2): unconfirmed email user provisioned a tenant!';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_err := SQLERRM;
  END;
  IF COALESCE(v_err, '') NOT ILIKE '%Email verification is required%' THEN
    RAISE EXCEPTION 'FAIL (ID2): expected email confirmation rejection, got: %', v_err;
  END IF;

  BEGIN
    INSERT INTO public.tenants (slug, name, tenant_type, owner_id)
    VALUES ('unconfirmed-direct', 'Direct Bypass', 'academy', u_unconfirmed);
    RAISE EXCEPTION 'FAIL (ID2): direct INSERT into public.tenants succeeded for authenticated!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  RESET ROLE;

  -- =========================================================================
  -- CHECK 4 (Identity 5 - Owner Alpha): Provisioning validation, idempotency & free plan
  -- =========================================================================
  PERFORM pg_temp.act_as(u_owner_a, 'owner-alpha@khelgrid-test.local');

  BEGIN
    PERFORM public.provision_initial_tenant_owner('Bad Slug!', 'Valid Name', 'academy');
    RAISE EXCEPTION 'FAIL (ID5): invalid slug should raise 22023';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;

  BEGIN
    PERFORM public.provision_initial_tenant_owner('a', 'X', 'academy');
    RAISE EXCEPTION 'FAIL (ID5): short org name should raise 22023';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;

  SELECT public.provision_initial_tenant_owner(
    'sprint1-alpha-academy',
    'Sprint 1 Alpha Academy',
    'academy',
    'Bengaluru',
    'Karnataka',
    'Badminton',
    '9876543210',
    'owner-alpha@khelgrid-test.local',
    jsonb_build_object(
      'source', 'verified_partner_email_onboarding',
      'idempotency_key', 'idem-sprint1-alpha-001',
      'verification_status', 'verified',
      'directory_publication_status', 'approved',
      'is_admin', true
    )
  ) INTO v_t_alpha;

  -- Idempotent repeat callback must return exact same tenant ID & no extra tenants
  SELECT public.provision_initial_tenant_owner(
    'sprint1-alpha-academy',
    'Sprint 1 Alpha Academy',
    'academy',
    'Bengaluru',
    'Karnataka',
    'Badminton',
    '9876543210',
    'owner-alpha@khelgrid-test.local',
    jsonb_build_object(
      'source', 'verified_partner_email_onboarding',
      'idempotency_key', 'idem-sprint1-alpha-001'
    )
  ) INTO v_t_alpha_dup;

  IF v_t_alpha_dup <> v_t_alpha THEN
    RAISE EXCEPTION 'FAIL (ID5): idempotent provisioning created different tenant (% vs %)', v_t_alpha_dup, v_t_alpha;
  END IF;

  SELECT * INTO v_row FROM public.tenants WHERE id = v_t_alpha;
  IF v_row.verification_status <> 'unverified' OR v_row.directory_publication_status <> 'unpublished' THEN
    RAISE EXCEPTION 'FAIL (ID5): spoofed verification/publication leaked: ver=%, dir=%', v_row.verification_status, v_row.directory_publication_status;
  END IF;
  IF v_row.metadata ? 'is_admin' OR v_row.metadata ? 'verification_status' OR v_row.metadata ? 'directory_publication_status' THEN
    RAISE EXCEPTION 'FAIL (ID5): untrusted metadata privilege keys were not stripped: %', v_row.metadata;
  END IF;

  RESET ROLE;

  SELECT s.plan_code, s.status, s.payment_collection_enabled
  INTO v_sub_plan, v_sub_status, v_pay_enabled
  FROM public.saas_subscriptions s
  WHERE s.subject_id = v_t_alpha;
  IF v_sub_plan <> 'org_free' OR v_sub_status <> 'free_active' OR v_pay_enabled IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL (ID5/P8): unexpected default subscription: plan=%, status=%, pay=%', v_sub_plan, v_sub_status, v_pay_enabled;
  END IF;

  -- =========================================================================
  -- CHECK 5 (Identity 4 - Verified Coach): slug conflict check + second tenant
  -- =========================================================================
  PERFORM pg_temp.act_as(u_coach, 'coach@khelgrid-test.local');

  BEGIN
    PERFORM public.provision_initial_tenant_owner('sprint1-alpha-academy', 'Fake Collision Academy', 'academy');
    RAISE EXCEPTION 'FAIL (ID4): duplicate taken slug should raise 23505';
  EXCEPTION WHEN SQLSTATE '23505' THEN NULL; END;

  SELECT public.provision_initial_tenant_owner(
    'sprint1-coach-studio',
    'Sprint 1 Coach Studio',
    'coach',
    'Mumbai',
    'Maharashtra',
    'Athletics',
    '9876543211',
    'coach@khelgrid-test.local'
  ) INTO v_t_coach;

  RESET ROLE;

  -- =========================================================================
  -- CHECK 6 (Phase 2 Directory Gate & Identity 9 Moderator vs Non-Moderators)
  -- =========================================================================
  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (P2): unverified tenant appeared in tenant_public_directory!';
  END IF;
  RESET ROLE;

  PERFORM pg_temp.act_as(u_owner_a, 'owner-alpha@khelgrid-test.local');

  BEGIN
    UPDATE public.tenants SET verification_status = 'verified' WHERE id = v_t_alpha;
    RAISE EXCEPTION 'FAIL (P2): owner self-verified tenant!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    UPDATE public.tenants SET directory_publication_status = 'approved' WHERE id = v_t_alpha;
    RAISE EXCEPTION 'FAIL (P2): owner self-approved directory listing!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    UPDATE public.tenants SET owner_id = u_director_a WHERE id = v_t_alpha;
    RAISE EXCEPTION 'FAIL (P5): owner directly mutated owner_id bypassing transfer RPC!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    UPDATE public.tenants SET status = 'suspended' WHERE id = v_t_alpha;
    RAISE EXCEPTION 'FAIL (P5): owner directly suspended active tenant bypassing RPC!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    PERFORM public.admin_moderate_tenant_verification(v_t_alpha, 'verified');
    RAISE EXCEPTION 'FAIL (P2): non-moderator executed admin_moderate_tenant_verification!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  RESET ROLE;

  PERFORM pg_temp.act_as(u_moderator, 'moderator@khelgrid-test.local');

  BEGIN
    PERFORM public.admin_set_tenant_directory_publication(v_t_alpha, 'approved', 'Premature');
    RAISE EXCEPTION 'FAIL (P2): moderator approved unverified tenant for directory!';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;

  -- Step A: Verify ONLY -> STILL 0 rows in directory!
  PERFORM public.admin_moderate_tenant_verification(v_t_alpha, 'verified', 'Accreditation checked');
  RESET ROLE;

  SELECT * INTO v_row FROM public.tenants WHERE id = v_t_alpha;
  IF v_row.verification_status <> 'verified' OR v_row.directory_publication_status <> 'unpublished' THEN
    RAISE EXCEPTION 'FAIL (P2): verification modified directory_publication_status unexpectedly: % / %', v_row.verification_status, v_row.directory_publication_status;
  END IF;

  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (P2): verified but UNAPPROVED tenant entered tenant_public_directory!';
  END IF;
  RESET ROLE;

  -- Step B: Approve publication -> now appears publicly!
  PERFORM pg_temp.act_as(u_moderator, 'moderator@khelgrid-test.local');
  PERFORM public.admin_set_tenant_directory_publication(v_t_alpha, 'approved', 'Public listing approved');
  RESET ROLE;

  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'FAIL (P2): verified+approved tenant missing from tenant_public_directory (cnt=%)', v_cnt;
  END IF;
  RESET ROLE;

  -- Suspension immediately purges directory AND blocks owner client update
  PERFORM pg_temp.act_as(u_moderator, 'moderator@khelgrid-test.local');
  PERFORM public.admin_set_tenant_operational_status(v_t_alpha, 'suspended', 'Compliance hold');
  RESET ROLE;

  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (P2): suspended tenant remained in tenant_public_directory!';
  END IF;
  RESET ROLE;

  PERFORM pg_temp.act_as(u_owner_a, 'owner-alpha@khelgrid-test.local');
  BEGIN
    UPDATE public.tenants SET status = 'active' WHERE id = v_t_alpha;
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'FAIL (P5): owner self-unsuspended tenant (% rows modified)!', v_cnt;
    END IF;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  RESET ROLE;

  SELECT status INTO v_sub_status FROM public.tenants WHERE id = v_t_alpha;
  IF v_sub_status <> 'suspended' THEN
    RAISE EXCEPTION 'FAIL (P5): tenant status changed after owner unsuspend attempt: %', v_sub_status;
  END IF;

  -- Moderator reactivates tenant -> restores directory listing since still verified + approved
  PERFORM pg_temp.act_as(u_moderator, 'moderator@khelgrid-test.local');
  PERFORM public.admin_set_tenant_operational_status(v_t_alpha, 'active', 'Hold lifted');
  RESET ROLE;

  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'FAIL (P2): reactivated verified+approved tenant did not republish (cnt=%)', v_cnt;
  END IF;
  RESET ROLE;

  -- =========================================================================
  -- CHECK 7 (Identities 6, 7, 8 & Cross-Tenant Isolation + Role Escalation + Invites)
  -- =========================================================================
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_t_alpha, u_director_a, 'director', 'active')
  RETURNING id INTO v_m_dir_a;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_t_alpha, u_staff_a, 'manager', 'active')
  RETURNING id INTO v_m_staff_a;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_t_alpha, u_revoked, 'coach', 'active')
  RETURNING id INTO v_m_revoked;

  INSERT INTO public.tenant_units (tenant_id, name, unit_type, city)
  VALUES (v_t_alpha, 'Main Koramangala Centre', 'branch', 'Bengaluru')
  RETURNING id INTO v_branch_1;

  INSERT INTO public.academy_staff_branch_assignments (tenant_id, membership_id, unit_id, assigned_by)
  VALUES (v_t_alpha, v_m_staff_a, v_branch_1, u_owner_a);

  PERFORM pg_temp.act_as(u_director_a, 'director-a@khelgrid-test.local');

  BEGIN
    PERFORM public.update_tenant_membership_role(v_m_dir_a, 'owner');
    RAISE EXCEPTION 'FAIL (ID6): director self-escalated to owner via RPC!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    UPDATE public.tenant_memberships SET role = 'owner' WHERE id = v_m_dir_a;
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'FAIL (ID6): director self-escalated via direct table UPDATE (% rows)!', v_cnt;
    END IF;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    UPDATE public.tenant_memberships SET role = 'owner' WHERE id = v_m_staff_a;
    RAISE EXCEPTION 'FAIL (ID6): director promoted another member to owner via direct UPDATE!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    PERFORM public.create_tenant_invitation(v_t_alpha, 'hacker@khelgrid-test.local', 'owner');
    RAISE EXCEPTION 'FAIL (ID6): owner invite should be rejected!';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;

  SELECT count(*) INTO v_cnt FROM public.tenants WHERE id = v_t_coach;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (ID6): cross-tenant disclosure of Coach Studio!';
  END IF;

  RESET ROLE;

  PERFORM pg_temp.act_as(u_staff_a, 'staff-a@khelgrid-test.local');

  SELECT count(*) INTO v_cnt FROM public.tenants WHERE id = v_t_alpha;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'FAIL (ID7): branch manager could not read own tenant (cnt=%)', v_cnt;
  END IF;
  SELECT count(*) INTO v_cnt FROM public.tenants WHERE id = v_t_coach;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (ID7): branch manager saw cross-tenant Coach Studio!';
  END IF;

  RESET ROLE;

  PERFORM pg_temp.act_as(u_revoked, 'revoked@khelgrid-test.local');
  SELECT public.has_tenant_permission(v_t_alpha, 'athletes:manage') INTO v_bool;
  IF NOT v_bool THEN
    RAISE EXCEPTION 'FAIL (ID8): active member lacked athletes:manage before revocation';
  END IF;
  RESET ROLE;

  UPDATE public.tenant_memberships SET status = 'suspended' WHERE id = v_m_revoked;
  PERFORM pg_temp.act_as(u_revoked, 'revoked@khelgrid-test.local');
  SELECT public.has_tenant_permission(v_t_alpha, 'athletes:manage') INTO v_bool;
  IF v_bool THEN
    RAISE EXCEPTION 'FAIL (ID8): suspended member still had has_tenant_permission=true!';
  END IF;
  SELECT count(*) INTO v_cnt FROM public.tenants WHERE id = v_t_alpha;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (ID8): suspended member still saw Tenant Alpha!';
  END IF;
  RESET ROLE;

  UPDATE public.tenant_memberships SET status = 'active', deleted_at = now() WHERE id = v_m_revoked;
  PERFORM pg_temp.act_as(u_revoked, 'revoked@khelgrid-test.local');
  SELECT public.has_tenant_permission(v_t_alpha, 'athletes:manage') INTO v_bool;
  IF v_bool THEN
    RAISE EXCEPTION 'FAIL (ID8): soft-deleted membership (deleted_at IS NOT NULL) returned true!';
  END IF;
  RESET ROLE;

  -- =========================================================================
  -- CHECK 8 (Identity 3 Verified Athlete + Profiles Lock + Academy Lock + Invites)
  -- =========================================================================
  PERFORM pg_temp.act_as(u_athlete, 'athlete@khelgrid-test.local');

  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = u_athlete;
    RAISE EXCEPTION 'FAIL (ID3/P5): athlete escalated profiles.role to admin!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    UPDATE public.profiles SET role = 'moderator' WHERE id = u_athlete;
    RAISE EXCEPTION 'FAIL (ID3/P5): athlete escalated profiles.role to moderator!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u_athlete, 'admin', true);
    RAISE EXCEPTION 'FAIL (ID3/P5): athlete inserted admin into user_roles!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

  SELECT count(*) INTO v_cnt FROM public.tenants WHERE id IN (v_t_alpha, v_t_coach);
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (ID3): verified athlete read private tenants directly (cnt=%)', v_cnt;
  END IF;

  RESET ROLE;

  INSERT INTO public.tenant_invitations (tenant_id, invited_email, role, token_hash, invited_by, expires_at)
  VALUES (v_t_alpha, 'invited-coach@khelgrid-test.local', 'coach', v_invite_hash, u_owner_a, now() + interval '2 days')
  RETURNING id INTO v_invite_id;

  PERFORM pg_temp.act_as(u_athlete, 'athlete@khelgrid-test.local');
  BEGIN
    PERFORM public.accept_tenant_invitation(v_invite_hash);
    RAISE EXCEPTION 'FAIL (P5): wrong user accepted email-bound tenant invitation!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  RESET ROLE;

  PERFORM pg_temp.act_as(u_unconfirmed, 'unconfirmed@khelgrid-test.local');
  BEGIN
    PERFORM public.accept_tenant_invitation(v_invite_hash);
    RAISE EXCEPTION 'FAIL (P5): unconfirmed user accepted tenant invitation!';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  RESET ROLE;

  PERFORM pg_temp.act_as(u_invited, 'invited-coach@khelgrid-test.local');
  PERFORM public.accept_tenant_invitation(v_invite_hash);
  SELECT count(*) INTO v_cnt FROM public.tenant_memberships WHERE tenant_id = v_t_alpha AND user_id = u_invited AND status = 'active';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'FAIL (P5): valid invite acceptance did not activate membership';
  END IF;
  RESET ROLE;

  IF to_regclass('public.academy_profiles') IS NOT NULL THEN
    INSERT INTO public.academy_profiles (tenant_id, slug, display_name, verification_status, is_publicly_listed)
    VALUES (v_t_alpha, 'sprint1-alpha-acad-profile', 'Sprint 1 Alpha Academy', 'unverified', false)
    RETURNING id INTO v_acad_id;

    PERFORM pg_temp.act_as(u_owner_a, 'owner-alpha@khelgrid-test.local');

    BEGIN
      UPDATE public.academy_profiles SET directory_academy_id = gen_random_uuid() WHERE id = v_acad_id;
      RAISE EXCEPTION 'FAIL (P5): owner tampered academy_profiles.directory_academy_id!';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

    BEGIN
      UPDATE public.academy_profiles SET is_publicly_listed = true WHERE id = v_acad_id;
      RAISE EXCEPTION 'FAIL (P5): unverified academy enabled is_publicly_listed!';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;

    RESET ROLE;
  END IF;

  -- =========================================================================
  -- CHECK 9: Archival & soft deletion immediately purge directory & revoke perms
  -- =========================================================================
  PERFORM pg_temp.act_as(u_moderator, 'moderator@khelgrid-test.local');
  PERFORM public.admin_set_tenant_operational_status(v_t_alpha, 'archived', 'Closing tenant');
  RESET ROLE;

  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (P2): archived tenant remained in tenant_public_directory!';
  END IF;
  RESET ROLE;

  PERFORM pg_temp.act_as(u_moderator, 'moderator@khelgrid-test.local');
  PERFORM public.admin_set_tenant_operational_status(v_t_alpha, 'active', 'Reopen before soft delete test');
  RESET ROLE;

  UPDATE public.tenants SET deleted_at = now() WHERE id = v_t_alpha;

  PERFORM pg_temp.act_as(NULL, NULL);
  SELECT count(*) INTO v_cnt FROM public.tenant_public_directory WHERE id = v_t_alpha;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL (P2): soft-deleted tenant remained in tenant_public_directory!';
  END IF;
  RESET ROLE;

  PERFORM pg_temp.act_as(u_director_a, 'director-a@khelgrid-test.local');
  SELECT public.has_tenant_permission(v_t_alpha, 'org:team') INTO v_bool;
  IF v_bool THEN
    RAISE EXCEPTION 'FAIL (P4): director retained permission on soft-deleted tenant!';
  END IF;
  RESET ROLE;

  RAISE NOTICE 'ALL SPRINT 1 SHARED SAAS FOUNDATION POSTGRES 16 ACCEPTANCE CHECKS PASSED (9 IDENTITIES / 21 ASSERTIONS)';
END $$;
