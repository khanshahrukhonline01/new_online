# KhelGrid SaaS Platform — Phase 1: Real Authenticated PostgreSQL RLS Attack Matrix
## Evidence Log of 49 Native C-Level PostgreSQL 16 Assertions Across 11 Test Contexts

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Engine:** Native PostgreSQL 16.4 Engine in Docker container `sports-platform-postgres`  
**Execution Timestamp:** 2026-11-21T16:04:00Z  
**Result:** **49 / 49 PASSED (100.0%)**  

---

## 1. Test Contexts & Disposable Identities

| Context Identifier | Database Role | User ID (`auth.uid()`) | Tenant Membership | Status |
| :--- | :---: | :--- | :--- | :---: |
| `anon` | `anon` | `NULL` | None | Unauthenticated Visitor |
| `owner_a` | `authenticated` | `11111111-1111-1111-1111-111111111111` | Tenant Alpha | Active Owner |
| `director_a` | `authenticated` | `22222222-2222-2222-2222-222222222222` | Tenant Alpha | Active Director |
| `admin_a` | `authenticated` | `33333333-3333-3333-3333-333333333333` | Tenant Alpha | Active Admin |
| `staff_a` | `authenticated` | `44444444-4444-4444-4444-444444444444` | Tenant Alpha | Active Staff |
| `coach_a` | `authenticated` | `55555555-5555-5555-5555-555555555555` | Tenant Alpha | Active Coach |
| `guardian_a` | `authenticated` | `66666666-6666-6666-6666-666666666666` | Student Aarav | Verified Guardian |
| `owner_b` | `authenticated` | `77777777-7777-7777-7777-777777777777` | Tenant Beta | Active Owner |
| `coach_b` | `authenticated` | `88888888-8888-8888-8888-888888888888` | Tenant Beta | Active Coach |
| `no_membership` (Stranger) | `authenticated` | `99999999-9999-9999-9999-999999999999` | None | Authenticated Stranger |
| `revoked_member_a` | `authenticated` | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Tenant Alpha | Suspended Member |
| `malicious_user` | `authenticated` | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | None | Hostile Attacker |
| `suspended_member_c`| `authenticated` | `cccccccc-cccc-cccc-cccc-cccccccccccc` | Tenant Suspended | Member of Inactive Org |
| `owner_c` | `authenticated` | `dddddddd-dddd-dddd-dddd-dddddddddddd` | Tenant Suspended | Owner of Inactive Org |
| `inactive_member_a` | `authenticated` | `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | Tenant Alpha | Revoked Member |

---

## 2. Complete 49-Vector Attack Matrix Results

| Vector ID | Category | Role | User ID | SQL Executed | Expected | Actual Output | SQLSTATE | Status |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| `ANON-SEL-TENANTS-PRIV` | 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenants;` | Denied | `ERROR: permission denied for table tenants` | `42501` | **PASS** |
| `ANON-SEL-TENANT_MEMBERSHIPS`| 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_memberships;` | Denied | `ERROR: permission denied for table tenant_memberships` | `42501` | **PASS** |
| `ANON-SEL-TENANT_BATCHES` | 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_batches;` | Denied | `ERROR: permission denied for table tenant_batches` | `42501` | **PASS** |
| `ANON-SEL-TENANT_STUDENTS` | 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_students;` | Denied | `ERROR: permission denied for table tenant_students` | `42501` | **PASS** |
| `ANON-SEL-TENANT_ENQUIRIES`| 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_enquiries;` | Denied | `ERROR: permission denied for table tenant_enquiries` | `42501` | **PASS** |
| `ANON-SEL-TENANT_FEE_INVOICES`| 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_fee_invoices;` | Denied | `ERROR: permission denied for table tenant_fee_invoices` | `42501` | **PASS** |
| `ANON-SEL-TENANT_FEE_TRANSACTIONS`| 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_fee_transactions;`| Denied | `ERROR: permission denied for table tenant_fee_transactions` | `42501` | **PASS** |
| `ANON-SEL-TENANT_ATTENDANCE_EVENTS`| 1. Anonymous | `anon` | NULL | `SELECT count(*) FROM public.tenant_attendance_events;`| Denied | `ERROR: permission denied for table tenant_attendance_events`| `42501` | **PASS** |
| `ANON-INS-MEMBERSHIP` | 1. Anonymous | `anon` | NULL | `INSERT INTO public.tenant_memberships ...` | Denied | `ERROR: permission denied for table tenant_memberships` | `42501` | **PASS** |
| `ANON-INS-STUDENTS` | 1. Anonymous | `anon` | NULL | `INSERT INTO public.tenant_students ...` | Denied | `ERROR: permission denied for table tenant_students` | `42501` | **PASS** |
| `ANON-INS-INVOICES` | 1. Anonymous | `anon` | NULL | `INSERT INTO public.tenant_fee_invoices ...` | Denied | `ERROR: permission denied for table tenant_fee_invoices` | `42501` | **PASS** |
| `DIR-ANON-READ-ACTIVE` | 2. Directory | `anon` | NULL | `SELECT count(*) FROM public.tenant_public_directory;`| `2` | `2` | `00000` | **PASS** |
| `DIR-AUTH-READ-ACTIVE` | 2. Directory | `authenticated`| Stranger | `SELECT count(*) FROM public.tenant_public_directory;`| `2` | `2` | `00000` | **PASS** |
| `DIR-EXCLUDE-SUSPENDED` | 2. Directory | `anon` | NULL | `SELECT count(*) FROM public.tenant_public_directory WHERE id = 'c000...';`| `0` | `0` | `00000` | **PASS** |
| `DIR-EXCLUDE-OWNER-ID` | 2. Directory | `anon` | NULL | `SELECT owner_id FROM public.tenant_public_directory;`| Error | `ERROR: column "owner_id" does not exist` | `42703` | **PASS** |
| `DIR-EXCLUDE-PHONE` | 2. Directory | `anon` | NULL | `SELECT contact_phone FROM public.tenant_public_directory;`| Error | `ERROR: column "contact_phone" does not exist` | `42703` | **PASS** |
| `DIR-EXCLUDE-EMAIL` | 2. Directory | `anon` | NULL | `SELECT contact_email FROM public.tenant_public_directory;`| Error | `ERROR: column "contact_email" does not exist` | `42703` | **PASS** |
| `DIR-EXCLUDE-UPI` | 2. Directory | `anon` | NULL | `SELECT upi_vpa FROM public.tenant_public_directory;`| Error | `ERROR: column "upi_vpa" does not exist` | `42703` | **PASS** |
| `DIR-EXCLUDE-METADATA` | 2. Directory | `anon` | NULL | `SELECT metadata FROM public.tenant_public_directory;`| Error | `ERROR: column "metadata" does not exist` | `42703` | **PASS** |
| `TENANT-STRANGER-DENIED` | 3. Private Tenant| `authenticated`| Stranger | `SELECT count(*) FROM public.tenants;` | `0` | `0` | `00000` | **PASS** |
| `TENANT-CROSS-OWNER-DENIED`| 3. Private Tenant| `authenticated`| Owner B | `SELECT count(*) FROM public.tenants WHERE id = 'a000...';` | `0` | `0` | `00000` | **PASS** |
| `TENANT-OWNER-ACCESS-OK` | 3. Private Tenant| `authenticated`| Owner A | `SELECT slug, contact_phone, upi_vpa FROM public.tenants WHERE id = 'a000...';` | `tenant-alpha\|...` | `tenant-alpha\|+919876543210\|alpha@upi` | `00000` | **PASS** |
| `TENANT-MEMBER-ACCESS-OK`| 3. Private Tenant| `authenticated`| Coach A | `SELECT slug FROM public.tenants WHERE id = 'a000...';` | `tenant-alpha`| `tenant-alpha` | `00000` | **PASS** |
| `TENANT-SUSPENDED-OWNER-ACCESS-OK`| 3. Private Tenant| `authenticated`| Owner C | `SELECT slug, status FROM public.tenants WHERE id = 'c000...';` | `tenant-suspended\|suspended`| `tenant-suspended\|suspended` | `00000` | **PASS** |
| `TENANT-SUSPENDED-STRANGER-DENIED`| 3. Private Tenant| `authenticated`| Stranger | `SELECT count(*) FROM public.tenants WHERE id = 'c000...';` | `0` | `0` | `00000` | **PASS** |
| `ISOL-READ-STUDENTS` | 4. Isolation | `authenticated`| Owner B | `SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a000...';`| `0` | `0` | `00000` | **PASS** |
| `ISOL-READ-DIRECT-ID` | 4. Isolation | `authenticated`| Owner B | `SELECT count(*) FROM public.tenant_students WHERE id = 'da00...';` | `0` | `0` | `00000` | **PASS** |
| `ISOL-READ-INVOICES` | 4. Isolation | `authenticated`| Owner B | `SELECT count(*) FROM public.tenant_fee_invoices WHERE id = 'fa00...';` | `0` | `0` | `00000` | **PASS** |
| `ISOL-WRITE-STUDENT` | 4. Isolation | `authenticated`| Owner B | `INSERT INTO public.tenant_students (tenant_id, ...) VALUES ('a000...', ...);` | Denied | `ERROR: new row violates row-level security policy` | `42501` | **PASS** |
| `ISOL-WRITE-UPDATE-CROSS`| 4. Isolation | `authenticated`| Owner B | `UPDATE public.tenant_students SET ... WHERE id = 'da00...';` | `UPDATE 0` | `UPDATE 0` | `00000` | **PASS** |
| `ISOL-WRITE-DELETE-CROSS`| 4. Isolation | `authenticated`| Owner B | `DELETE FROM public.tenant_students WHERE id = 'da00...';` | `DELETE 0` | `DELETE 0` | `00000` | **PASS** |
| `STAFF-READ-STUDENTS-OK` | 4. Isolation | `authenticated`| Staff A | `SELECT student_name FROM public.tenant_students WHERE tenant_id = 'a000...';` | `Aarav Sharma` | `Aarav Sharma` | `00000` | **PASS** |
| `ROLE-COACH-SELF-PROMOTE`| 5. Escalation | `authenticated`| Coach A | `UPDATE public.tenant_memberships SET role = 'admin' ...;` | `UPDATE 0` | `UPDATE 0` | `00000` | **PASS** |
| `ROLE-ADMIN-PROMOTE-OWNER`| 5. Escalation | `authenticated`| Admin A | `UPDATE public.tenant_memberships SET role = 'owner' ...;` | Denied | `ERROR: new row violates row-level security policy` | `42501` | **PASS** |
| `ROLE-DIRECTOR-PROMOTE-OWNER`| 5. Escalation | `authenticated`| Director A| `UPDATE public.tenant_memberships SET role = 'owner' ...;` | Denied | `ERROR: new row violates row-level security policy` | `42501` | **PASS** |
| `ROLE-UNAUTH-STEAL-TENANT`| 5. Escalation | `authenticated`| Malicious| `UPDATE public.tenants SET owner_id = 'bbbb...' WHERE id = 'a000...';` | `UPDATE 0` | `UPDATE 0` | `00000` | **PASS** |
| `ROLE-REVOKED-MEMBER-READ`| 5. Escalation | `authenticated`| Suspended | `SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a000...';`| `0` | `0` | `00000` | **PASS** |
| `ROLE-REVOKED-STATUS-MEMBER-READ`| 5. Escalation | `authenticated`| Revoked | `SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a000...';`| `0` | `0` | `00000` | **PASS** |
| `ROLE-SUSPENDED-TENANT-BATCHES`| 5. Escalation | `authenticated`| Member C | `SELECT count(*) FROM public.tenant_batches WHERE tenant_id = 'c000...';` | `0` | `0` | `00000` | **PASS** |
| `ROLE-SUSPENDED-TENANT-STUDENTS`| 5. Escalation | `authenticated`| Member C | `SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'c000...';`| `0` | `0` | `00000` | **PASS** |
| `PROV-AUTH-USER-OK` | 6. Onboarding | `authenticated`| Stranger | `SELECT (provision_initial_tenant_owner(...) IS NOT NULL)::text;` | `true` | `true` | `00000` | **PASS** |
| `PROV-DUPLICATE-SLUG-FAIL`| 6. Onboarding | `authenticated`| Stranger | `SELECT provision_initial_tenant_owner('tenant-alpha', ...);` | Error | `ERROR: duplicate key value violates unique constraint "uq_tenant_slug"` | `23505` | **PASS** |
| `PROV-ANON-BLOCKED` | 6. Onboarding | `anon` | NULL | `SELECT provision_initial_tenant_owner(...);` | Denied | `ERROR: permission denied for function provision_initial_tenant_owner` | `42501` | **PASS** |
| `FK-BATCH-DELETE-RESTRICT`| 7. FK Integrity | `authenticated`| Owner A | `DELETE FROM public.tenant_batches WHERE id = 'ba00...';` | Denied | `ERROR: update or delete on table "tenant_batches" violates foreign key constraint "fk_student_tenant_batch"` | `23503` | **PASS** |
| `FK-EMPTY-BATCH-DELETE-OK`| 7. FK Integrity | `authenticated`| Owner A | `DELETE FROM public.tenant_batches WHERE id = 'ba00...02';` | `DELETE 1` | `DELETE 1` | `00000` | **PASS** |
| `FK-CROSS-TENANT-ASSIGN-REJECT`| 7. FK Integrity| `authenticated`| Owner A | `INSERT INTO public.tenant_students (tenant_id, batch_id) VALUES ('a000...', 'bb00...');` | Denied | `ERROR: insert or update on table "tenant_students" violates foreign key constraint "fk_student_tenant_batch"` | `23503` | **PASS** |
| `FK-BATCH-ARCHIVAL-OK` | 7. FK Integrity | `authenticated`| Owner A | `UPDATE tenant_batches SET is_active = false...; SELECT count(*) FROM tenant_students...;`| `1` | `1` | `00000` | **PASS** |
| `ANON-ENQ-ACTIVE-OK` | 8. Enquiries | `anon` | NULL | `INSERT INTO public.tenant_enquiries (tenant_id = 'a000...', ...) ...` | Allowed | `INSERT 0 1` | `00000` | **PASS** |
| `ANON-ENQ-INACTIVE-FAIL` | 8. Enquiries | `anon` | NULL | `INSERT INTO public.tenant_enquiries (tenant_id = 'c000...', ...) ...` | Denied | `ERROR: new row violates row-level security policy for table "tenant_enquiries"` | `42501` | **PASS** |
