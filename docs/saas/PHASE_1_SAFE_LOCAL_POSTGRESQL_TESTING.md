# KhelGrid SaaS Platform — Phase 1: Safe Local PostgreSQL Testing Protocol
## Non-Destructive Local Test Architecture, Target Safeguards, and Free-Tier Execution Guide

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Test Runner:** `scripts/run-comprehensive-postgres-rls-suite.py`  
**Pipeline Orchestrator:** `scripts/verify-phase1-local.mjs`  
**Status:** **Implemented, Verified, and Zero-Risk (Zero TRUNCATE Commands)**  

---

## 1. Remediation of Destructive Test Operations

In earlier iterations of the Phase 1 test runner, destructive table-clearing operations were present:
```sql
-- PROHIBITED DESTRUCTIVE OPERATIONS PREVIOUSLY IDENTIFIED:
TRUNCATE auth.users CASCADE;
TRUNCATE public.tenants CASCADE;
```

If accidentally pointed at a shared or development database, these commands would wipe pre-existing accounts and organizations.

### The Fix
1. **Complete Removal:** All `TRUNCATE` and `DROP` commands have been eliminated from `scripts/run-comprehensive-postgres-rls-suite.py`.
2. **Strict Targeted Cleanup:**
   Data cleanup is scoped exclusively to disposable test fixtures using explicit ID allowlists:
   ```sql
   DELETE FROM public.tenant_attendance_events WHERE tenant_id IN ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', ...) OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('11111111-1111-1111-1111-111111111111', ...));
   DELETE FROM public.tenants WHERE id IN ('a0000000-0000-0000-0000-000000000001', ...) OR slug IN ('tenant-alpha', 'tenant-beta', 'tenant-suspended', 'new-academy-99') OR owner_id IN ('11111111-1111-1111-1111-111111111111', ...);
   DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', ...);
   ```
   No real user records, catalogue listings (`academies`, `venues`, `coaches`), or bookings can ever be affected.

---

## 2. Nine-Point Database Safety & Isolation Verification

Before executing any SQL, `scripts/run-comprehensive-postgres-rls-suite.py` performs rigorous pre-flight safety checks:

```python
APPROVED_TEST_DATABASES = {'khelgrid_rls_test', 'khelgrid_rls_ci'}
PROHIBITED_HOST_PATTERNS = [
    r'supabase\.(co|in|net)',
    r'hznsbxvovjxvmnchzzqt',
    r'aws\.com',
    r'pooler\.supabase\.com',
    r'neon\.tech',
    r'elephantsql\.com',
    r'render\.com',
    r'railway\.app'
]
LOCAL_HOST_PATTERNS = [
    r'^localhost$',
    r'^127\.0\.0\.1$',
    r'^::1$',
    r'^postgres$',
    r'^host\.docker\.internal$'
]
```

### Safety Rules Enforced:
1. **Remote Host Rejection:** Rejects any `DATABASE_URL` containing cloud domains (`supabase.co`, `aws.com`, `neon.tech`, etc.).
2. **Development Reference Rejection:** Explicitly rejects the remote development project identifier `hznsbxvovjxvmnchzzqt`.
3. **Local Loopback Enforcement:** Verifies that connection hostnames match strictly local loopback addresses (`localhost`, `127.0.0.1`, or local Docker alias `postgres`).
4. **Database Name Whitelist:** Target database name must be explicitly in `{'khelgrid_rls_test', 'khelgrid_rls_ci'}`. Refuses to run against `postgres`, `template1`, `production`, etc.
5. **Live Probe Query:** Queries the connected database engine:
   ```sql
   SELECT current_database(), current_user;
   ```
   and double-checks that the returned active database name matches the approved whitelist.
6. **Docker Status Check:** If `DATABASE_URL` is omitted, verifies that the local Docker container `sports-platform-postgres` is active and responsive.
7. **Zero Blind Resets:** Never executes `supabase db reset` or unguided migrations.
8. **Fail-Closed on Unmet Preconditions:** If Docker or local PostgreSQL is unreachable, terminates with exit code 1 and prints an actionable `[FATAL BLOCKED]` status message.
9. **Zero Secret Logging:** Never logs passwords, connection strings with credentials, or API keys to disk.

---

## 3. Local Test Commands

### 3.1 Run PostgreSQL RLS Attack Matrix:
```bash
npm run test:phase1:postgres
```
- **What it does:** Verifies host safety, seeds 11 disposable test identities, executes all 44 native PostgreSQL RLS attack vectors via real session switching (`SET ROLE`, `set_config`), cleans up test rows, and outputs structured evidence to `scripts/comprehensive_postgres_rls_matrix.json`.
- **Duration:** ~12–15 seconds.

### 3.2 Run Full Local CI Validation Pipeline:
```bash
npm run verify:phase1
```
- **What it does:** Runs all 7 quality and security gates locally without consuming GitHub Actions minutes:
  1. ESLint (`npm run lint`)
  2. TypeScript strict compilation (`npm run typecheck`)
  3. Unit RLS simulation in `pg-mem` (`phase1-multi-tenant-isolation.test.ts`)
  4. Native PostgreSQL 16 engine integration suite (44 vectors)
  5. SQL migration safety scanner (verifies zero destructive DDL)
  6. Vite production application build (`npm run build`)
  7. Supabase security regression suite
- **Duration:** ~1 minute 15 seconds.
- **Evidence Produced:**
  - `docs/saas/evidence/phase1_local_verification_report.txt`
  - `docs/saas/evidence/postgres_rls_attack_matrix.json`

---

## 4. Setup Instructions When Docker is Stopped

If Docker Desktop is stopped or `sports-platform-postgres` is not running, the test runner terminates safely:

```text
[FATAL BLOCKED] Local Docker container 'sports-platform-postgres' is not running.
To run local tests, start Docker Desktop and ensure 'sports-platform-postgres' is up.
```

### Steps to Restore the Local Test Environment:
1. Start **Docker Desktop** from the Windows Start Menu or taskbar.
2. Ensure the PostgreSQL 16 container is running:
   ```powershell
   docker start sports-platform-postgres
   ```
   *(If standing up from scratch: `docker run --name sports-platform-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgis/postgis:16-3.4`)*
3. Create the test database (if not existing):
   ```powershell
   docker exec -i sports-platform-postgres psql -U postgres -c "CREATE DATABASE khelgrid_rls_test;"
   ```
4. Bootstrap auth schema and Phase 1 migrations:
   ```powershell
   Get-Content .github/scripts/phase-1-init-auth.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test
   Get-Content supabase/deployments/phase-1-saas-multi-tenant-deployment.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test
   Get-Content supabase/migrations/20261121210000_phase1_fk_deletion_and_function_hardening.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test
   Get-Content supabase/migrations/20261121220000_phase1_tenant_information_disclosure_remediation.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test
   ```
5. Run the suite:
   ```powershell
   npm run verify:phase1
   ```
