import { describe, expect, it } from 'vitest'

describe('KhelGrid SaaS Platform — Phase 2 Database Consolidation & Soft Deletion', () => {
  const getMigrationSql = async () => {
    // @ts-expect-error - node built-in
    const fs = await import('node:fs')
    // @ts-expect-error - node built-in
    const path = await import('node:path')
    const migrationPath = path.resolve('supabase/migrations/20261122100000_phase2_schema_consolidation_and_soft_deletion.sql')
    return { fs, migrationPath, sql: fs.readFileSync(migrationPath, 'utf-8') }
  }

  it('verifies Phase 2 migration file exists and is valid SQL wrapped in a transaction', async () => {
    const { fs, migrationPath, sql } = await getMigrationSql()
    expect(fs.existsSync(migrationPath)).toBe(true)
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain('COMMIT;')
    expect(sql.trim().endsWith('COMMIT;')).toBe(true)
  })

  it('declares soft-deletion and archival columns on core tenant tables', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain('ALTER TABLE public.tenants ADD COLUMN deleted_at timestamptz DEFAULT NULL;')
    expect(sql).toContain('ALTER TABLE public.tenants ADD COLUMN archived_at timestamptz DEFAULT NULL;')
    expect(sql).toContain('ALTER TABLE public.tenant_memberships ADD COLUMN deleted_at timestamptz DEFAULT NULL;')
    expect(sql).toContain('ALTER TABLE public.tenant_batches ADD COLUMN deleted_at timestamptz DEFAULT NULL;')
    expect(sql).toContain('ALTER TABLE public.tenant_batches ADD COLUMN archived_at timestamptz DEFAULT NULL;')
    expect(sql).toContain('ALTER TABLE public.tenant_students ADD COLUMN deleted_at timestamptz DEFAULT NULL;')

    // Partial indexes on alive records
    expect(sql).toContain('idx_tenants_active_alive')
    expect(sql).toContain('idx_tenant_memberships_active_alive')
    expect(sql).toContain('idx_tenant_batches_alive')
    expect(sql).toContain('idx_tenant_students_alive')
  })

  it('hardens is_tenant_member, has_tenant_role, and is_active_tenant to fail closed on deleted_at', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain('m.deleted_at IS NULL')
    expect(sql).toContain('t.deleted_at IS NULL')
    expect(sql).toContain('is_tenant_member(p_tenant_id uuid)')
    expect(sql).toContain('has_tenant_role(p_tenant_id uuid, p_roles text[])')
    expect(sql).toContain('is_active_tenant(p_tenant_id uuid)')

    // Pinned search_path security definer
    expect(sql).toContain('SET search_path = public, pg_temp')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.has_tenant_role(uuid, text[]) FROM PUBLIC;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.is_active_tenant(uuid) FROM PUBLIC;')
  })

  it('updates projection synchronization trigger to immediately purge soft-deleted tenants', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain("IF NEW.status = 'active' AND NEW.deleted_at IS NULL THEN")
    expect(sql).toContain('DELETE FROM public.tenant_public_directory WHERE id = NEW.id;')
    expect(sql).toContain('SET search_path = pg_catalog, pg_temp')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.sync_tenant_public_directory() FROM PUBLIC, anon, authenticated;')
  })

  it('enforces soft-deletion RLS policies excluding deleted records from active queries', async () => {
    const { sql } = await getMigrationSql()
    // Students SELECT policy with soft-delete filter
    expect(sql).toContain('CREATE POLICY "tenant_students_member_select"')
    expect(sql).toContain('deleted_at IS NULL OR')
    expect(sql).toContain("public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])")

    // Batches SELECT policy with soft-delete filter
    expect(sql).toContain('CREATE POLICY "tenant_batches_select"')

    // Memberships SELECT policy with soft-delete filter
    expect(sql).toContain('CREATE POLICY "tenant_memberships_select"')

    // Tenants SELECT policy with soft-delete filter
    expect(sql).toContain('CREATE POLICY "tenants_member_select"')
  })

  it('installs authoritative operational RPCs with least-privilege security definer grants', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.soft_delete_tenant_student')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.restore_tenant_student')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.soft_delete_tenant_batch')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.convert_enquiry_to_student')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_tenant_invitation')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.accept_tenant_invitation')

    expect(sql).toContain('REVOKE ALL ON FUNCTION public.soft_delete_tenant_student(uuid, uuid) FROM PUBLIC;')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.soft_delete_tenant_student(uuid, uuid) TO authenticated;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.restore_tenant_student(uuid, uuid) FROM PUBLIC;')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.restore_tenant_student(uuid, uuid) TO authenticated;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) FROM PUBLIC;')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) TO authenticated;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.create_tenant_invitation(uuid, text, text) FROM PUBLIC;')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.create_tenant_invitation(uuid, text, text) TO authenticated;')
  })

  it('hardens accept_tenant_invitation against null-email bypass and unique_tenant_user conflicts', async () => {
    const { sql } = await getMigrationSql()
    // Strict fail-closed email validation
    expect(sql).toContain('v_membership.invited_email IS NULL OR lower(trim(v_membership.invited_email)) <> lower(trim(v_user_email))')
    expect(sql).toContain("RAISE EXCEPTION 'Invitation email does not match authenticated user email';")

    // Unique constraint collision safety
    expect(sql).toContain('SELECT 1 FROM public.tenant_memberships')
    expect(sql).toContain('WHERE tenant_id = v_membership.tenant_id')
    expect(sql).toContain('AND user_id = auth.uid()')
    expect(sql).toContain('AND id <> p_membership_id')
  })

  it('installs append-only tenant audit logs table with RLS and immutable RPC', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.tenant_audit_logs')
    expect(sql).toContain('ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('CREATE POLICY "tenant_audit_logs_select"')
    expect(sql).toContain('REVOKE ALL ON public.tenant_audit_logs FROM PUBLIC, anon, authenticated;')
    expect(sql).toContain('GRANT SELECT ON public.tenant_audit_logs TO authenticated;')

    // Append-only RPC
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.log_tenant_audit_event')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.log_tenant_audit_event(uuid, text, text, uuid, jsonb) FROM PUBLIC;')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.log_tenant_audit_event(uuid, text, text, uuid, jsonb) TO authenticated;')
  })
})
