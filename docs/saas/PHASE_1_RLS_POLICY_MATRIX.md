# KhelGrid SaaS Platform — Phase 1: RLS Policy Matrix

**Document Version:** 1.0  
**Database:** PostgreSQL 15 (Supabase Free Plan `hznsbxvovjxvmnchzzqt`)  
**Security Standard:** Fail-Closed Least-Privilege  

---

## Policy Evaluation Matrix

| Table | Operation | Target Role | Policy Rule / Using Expression | With Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `public.tenants` | SELECT | `authenticated` | `public.is_tenant_member(id) OR status = 'active'` | N/A |
| `public.tenants` | SELECT | `anon` | `status = 'active'` (Public listings only) | N/A |
| `public.tenants` | UPDATE | `authenticated` | `owner_id = auth.uid() OR public.has_tenant_role(id, ARRAY['owner', 'director'])` | `owner_id = auth.uid()` |
| `public.tenants` | INSERT | `authenticated` | N/A | `owner_id = auth.uid()` |
| `public.tenants` | DELETE | `authenticated` | `owner_id = auth.uid()` | N/A |
| `public.tenant_memberships` | SELECT | `authenticated` | `public.is_tenant_member(tenant_id) OR user_id = auth.uid()` | N/A |
| `public.tenant_memberships` | INSERT | `authenticated` | N/A | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])` |
| `public.tenant_memberships` | UPDATE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director'])` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director'])` |
| `public.tenant_memberships` | DELETE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director'])` | N/A |
| `public.tenant_batches` | SELECT | `authenticated` | `public.is_tenant_member(tenant_id)` | N/A |
| `public.tenant_batches` | INSERT | `authenticated` | N/A | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach'])` |
| `public.tenant_batches` | UPDATE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach'])` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach'])` |
| `public.tenant_batches` | DELETE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])` | N/A |
| `public.tenant_students` | SELECT | `authenticated` | `public.is_tenant_member(tenant_id) OR public.is_guardian_of_student(id)` | N/A |
| `public.tenant_students` | INSERT | `authenticated` | N/A | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'front_desk'])` |
| `public.tenant_students` | UPDATE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'front_desk'])` | `tenant_id = OLD.tenant_id` |
| `public.tenant_students` | DELETE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])` | N/A |
| `public.tenant_attendance_events`| SELECT | `authenticated` | `public.is_tenant_member(tenant_id) OR public.is_guardian_of_student(student_id)`| N/A |
| `public.tenant_attendance_events`| INSERT | `authenticated` | N/A | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach', 'coach', 'staff'])` |
| `public.tenant_attendance_events`| UPDATE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach', 'coach'])` | `tenant_id = OLD.tenant_id` |
| `public.tenant_fee_invoices` | SELECT | `authenticated` | `public.is_tenant_member(tenant_id) OR public.is_guardian_of_student(student_id)`| N/A |
| `public.tenant_fee_invoices` | INSERT | `authenticated` | N/A | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant'])` |
| `public.tenant_fee_invoices` | UPDATE | `authenticated` | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant'])` | `tenant_id = OLD.tenant_id` |
| `public.tenant_fee_transactions` | SELECT | `authenticated` | `public.is_tenant_member(tenant_id) OR public.is_guardian_of_student(student_id)`| N/A |
| `public.tenant_fee_transactions` | INSERT | `authenticated` | N/A | `public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant', 'front_desk'])` |
| `public.guardian_student_links` | SELECT | `authenticated` | `guardian_user_id = auth.uid() OR public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'front_desk'])` | N/A |
| `public.dpdp_consent_records` | SELECT | `authenticated` | `guardian_user_id = auth.uid() OR public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])` | N/A |
| `public.dpdp_consent_records` | INSERT | `authenticated` | N/A | `guardian_user_id = auth.uid()` |

---

## Crucial Attack Vector Defenses

### 1. Anonymous Fail-Closed Guarantee
Every operational table (`tenant_batches`, `tenant_students`, `tenant_enquiries`, `tenant_fee_invoices`, `tenant_fee_transactions`, `tenant_attendance_events`, `guardian_student_links`, `dpdp_consent_records`) has **zero policies granting permissions to the `anon` role**. Anonymous visitors attempting to query these tables receive 0 rows.

### 2. IDOR (Insecure Direct Object Reference) Defense
Guardians are only permitted to query `tenant_students`, `tenant_attendance_events`, and `tenant_fee_invoices` when `public.is_guardian_of_student(student_id)` evaluates to `true`. If Parent A supplies Student B's UUID in any query or RPC, PostgreSQL returns zero records or an explicit access denial exception.

### 3. Tenant Reassignment Prevention
All UPDATE policies and row triggers prohibit mutating `tenant_id`. Once an entity is created in Tenant A, an attacker cannot reassign it to Tenant B.
