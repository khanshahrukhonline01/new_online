-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 2: Academy Financial Ledger & Role Hardening
-- Migration: 20261127000000_phase2_academy_finance_ledger_hardening.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt / Local PostgreSQL 16 Suite
--
-- Security Hardening:
-- 1. Enforces strict append-only financial integrity on tenant_fee_transactions
--    and non-deletable invoice integrity on tenant_fee_invoices by revoking
--    DELETE and TRUNCATE from PUBLIC, anon, and authenticated roles.
-- 2. Restricts financial reads & mutations strictly to Owner, Academy Admin,
--    Finance Manager, and Accountant (removing front_desk admissions role).
-- 3. Splits FOR ALL financial policies into explicit INSERT + UPDATE policies.
-- ==============================================================================

BEGIN;

REVOKE DELETE, TRUNCATE ON public.tenant_fee_transactions FROM PUBLIC, anon, authenticated;
REVOKE DELETE, TRUNCATE ON public.tenant_fee_invoices FROM PUBLIC, anon, authenticated;

-- Invoices Policies
DROP POLICY IF EXISTS "tenant_invoices_member_select" ON public.tenant_fee_invoices;
CREATE POLICY "tenant_invoices_member_select" ON public.tenant_fee_invoices
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.view')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
    OR EXISTS (
      SELECT 1 FROM public.tenant_students s
      WHERE s.id = student_id AND (s.guardian_user_id = auth.uid() OR s.athlete_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tenant_invoices_manage" ON public.tenant_fee_invoices;
DROP POLICY IF EXISTS "tenant_invoices_insert" ON public.tenant_fee_invoices;
CREATE POLICY "tenant_invoices_insert" ON public.tenant_fee_invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  );

DROP POLICY IF EXISTS "tenant_invoices_update" ON public.tenant_fee_invoices;
CREATE POLICY "tenant_invoices_update" ON public.tenant_fee_invoices
  FOR UPDATE TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  );

-- Transactions Policies (Strictly Append-Only / Status Reconciled)
DROP POLICY IF EXISTS "tenant_transactions_member_select" ON public.tenant_fee_transactions;
CREATE POLICY "tenant_transactions_member_select" ON public.tenant_fee_transactions
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.view')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
    OR EXISTS (
      SELECT 1 FROM public.tenant_students s
      WHERE s.id = student_id AND (s.guardian_user_id = auth.uid() OR s.athlete_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tenant_transactions_manage" ON public.tenant_fee_transactions;
DROP POLICY IF EXISTS "tenant_transactions_insert" ON public.tenant_fee_transactions;
CREATE POLICY "tenant_transactions_insert" ON public.tenant_fee_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  );

DROP POLICY IF EXISTS "tenant_transactions_refund_update" ON public.tenant_fee_transactions;
CREATE POLICY "tenant_transactions_refund_update" ON public.tenant_fee_transactions
  FOR UPDATE TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  )
  WITH CHECK (
    (
      public.has_tenant_permission(tenant_id, 'academy:finance.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
    )
    AND status IN ('settled', 'cash_in_hand', 'refunded')
  );

COMMIT;
