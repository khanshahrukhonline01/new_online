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

  it('verifies Phase 2 migration file exists and is valid SQL', async () => {
    const { fs, migrationPath, sql } = await getMigrationSql()
    expect(fs.existsSync(migrationPath)).toBe(true)
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain('COMMIT;')
  })

  it('declares soft-deletion and archival columns on core tenant tables', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain("ALTER TABLE public.tenants ADD COLUMN deleted_at timestamptz DEFAULT NULL;")
    expect(sql).toContain("ALTER TABLE public.tenants ADD COLUMN archived_at timestamptz DEFAULT NULL;")
    expect(sql).toContain("ALTER TABLE public.tenant_memberships ADD COLUMN deleted_at timestamptz DEFAULT NULL;")
    expect(sql).toContain("ALTER TABLE public.tenant_batches ADD COLUMN deleted_at timestamptz DEFAULT NULL;")
    expect(sql).toContain("ALTER TABLE public.tenant_students ADD COLUMN deleted_at timestamptz DEFAULT NULL;")
  })

  it('hardens is_tenant_member, has_tenant_role, and is_active_tenant to fail closed on deleted_at', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain("m.deleted_at IS NULL")
    expect(sql).toContain("t.deleted_at IS NULL")
    expect(sql).toContain("is_tenant_member(p_tenant_id uuid)")
    expect(sql).toContain("has_tenant_role(p_tenant_id uuid, p_roles text[])")
    expect(sql).toContain("is_active_tenant(p_tenant_id uuid)")
  })

  it('updates projection synchronization trigger to immediately purge soft-deleted tenants', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain("IF NEW.status = 'active' AND NEW.deleted_at IS NULL THEN")
    expect(sql).toContain("DELETE FROM public.tenant_public_directory WHERE id = NEW.id;")
  })

  it('installs authoritative operational RPCs with least-privilege security definer grants', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.soft_delete_tenant_student")
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.soft_delete_tenant_batch")
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.convert_enquiry_to_student")
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.create_tenant_invitation")
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.accept_tenant_invitation")

    expect(sql).toContain("REVOKE ALL ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) FROM PUBLIC;")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) TO authenticated;")
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.create_tenant_invitation(uuid, text, text) FROM PUBLIC;")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.create_tenant_invitation(uuid, text, text) TO authenticated;")
  })

  it('installs append-only tenant audit logs table with RLS', async () => {
    const { sql } = await getMigrationSql()
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.tenant_audit_logs")
    expect(sql).toContain("ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;")
    expect(sql).toContain("CREATE POLICY \"tenant_audit_logs_select\"")
    expect(sql).toContain("REVOKE ALL ON public.tenant_audit_logs FROM PUBLIC, anon;")
    expect(sql).toContain("GRANT SELECT ON public.tenant_audit_logs TO authenticated;")
  })
})

