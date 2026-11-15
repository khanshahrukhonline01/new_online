# KhelGrid Security Programme — Phase 10: Deployment Security Runbook

> **Document ID:** SEC-P10-RUN-001  
> **Status:** Operational Runbook Ready  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Development Project Reference:** `hznsbxvovjxvmnchzzqt`  
> **Production Website:** `https://khelgrid.com/` (Strictly Isolated / Untouched)  

---

## 1. Principles of Secure Deployment

1. **Strict Environment Separation**:
   - Development database (`hznsbxvovjxvmnchzzqt`) and Production environments are physically decoupled.
   - Development credentials never grant access to production resources.
   - Migrations are tested in isolated environments before application to development, and tested in development before production scheduling.
2. **Explicit Human Gate for Migration Execution**:
   - Automated scripts do not blindly apply DDL to live databases.
   - All migrations are reviewed, bundled in transactional blocks (`BEGIN; ... COMMIT;`), and applied under supervised operations.
3. **Rollback & State Preconditions**:
   - Every deployment must be preceded by a point-in-time backup or schema snapshot.
   - If an error occurs during execution, the transactional block automatically rolls back (`ROLLBACK`), leaving the database state pristine.

---

## 2. Development Database Deployment Procedure

### Pre-Deployment Verification Checklist:
- [ ] Ensure local repository branch is `security/phase-6-privacy-and-security-programme-closure`.
- [ ] Confirm all Vitest suites pass: `npm test`.
- [ ] Confirm TypeScript compiles without error: `npx tsc -b`.
- [ ] Inspect the consolidated deployment package: `supabase/deployments/phase-2-to-8-master-consolidated-deployment.sql`.
- [ ] Verify that the destination project ref matches `hznsbxvovjxvmnchzzqt`.

### Step-by-Step Deployment Instructions:
1. **Access Development Supabase Dashboard**:
   - Navigate to `https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt`.
2. **Open SQL Editor**:
   - Click on the **SQL Editor** tab on the left navigation bar.
   - Click **+ New query**.
3. **Load Consolidated Deployment SQL**:
   - Copy the complete contents of `supabase/deployments/phase-2-to-8-master-consolidated-deployment.sql`.
   - Paste into the SQL Editor.
4. **Execute Transaction**:
   - Click **Run** (or press `Ctrl+Enter`).
   - Monitor the output console. The script is wrapped in `BEGIN; ... COMMIT;`.
   - Verify that all statements complete with `Success. No rows returned` or the expected table outputs.
5. **Verify Post-Deployment State**:
   - In SQL Editor, run:
     ```sql
     -- Verify migration records
     SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;

     -- Verify RLS is enabled on all tables
     SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

     -- Verify policies exist
     SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
     ```

---

## 3. Supabase Auth Dashboard Hardening Steps

The following settings cannot be altered via SQL migration and must be verified in the Supabase Dashboard:

1. **Leaked-Password Protection**:
   - Navigate to **Authentication** -> **Attack Protection**.
   - Enable **Password Leak Protection** (checks passwords against HaveIBeenPwned database).
2. **Rate Limiting**:
   - Under **Attack Protection**, set Email Rate Limit to 30 emails/hour.
   - Set Sign-in Rate Limit to 30 requests/minute.
3. **Session Timeout & Refresh Token Rotation**:
   - Set JWT Expiry to 3600 seconds (1 hour).
   - Set Refresh Token Expiry to 604800 seconds (7 days).
   - Enable **Reuse Interval** (enforces single-use refresh token rotation).

---

## 4. Rollback Protocol

If an issue arises after applying migrations:
1. If the SQL query fails mid-execution, PostgreSQL automatically issues a `ROLLBACK`.
2. If post-migration verification reveals application defects:
   - Run the designated down-migration script: `supabase/deployments/phase-2-to-8-rollback.sql`.
   - Restore database from the pre-deployment snapshot if necessary.
   - Notify the engineering lead and record the incident.
