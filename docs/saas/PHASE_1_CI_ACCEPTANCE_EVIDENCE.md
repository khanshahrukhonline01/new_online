# KhelGrid SaaS Platform — Phase 1: CI Pipeline Acceptance Evidence
## Dedicated PostgreSQL Integration Job, Test Automation, and Reproducibility Protocol

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Workflow File:** `.github/workflows/ci.yml`  
**Status:** **CONFIGURED & VERIFIED (Dual Engine Support: Native PostgreSQL 16 / Docker & CI PostgreSQL 17)**  

---

## 1. Executive Summary

To prevent regression and guarantee that every future commit respects Phase 1 multi-tenant security boundaries, a dedicated automated test pipeline has been integrated into GitHub Actions (`.github/workflows/ci.yml`).

The CI automation comprises two layers of database validation:
1. **Catalog Integrity & Schema Verification (`quality` job)**:
   - Executes `.github/scripts/phase-1-init-auth.sql` to bootstrap Supabase auth structures.
   - Deploys Phase 1 migration files.
   - Runs `.github/scripts/phase-1-multi-tenant-rls-assertions.sql` (11 comprehensive catalog assertions verifying table existence, RLS enablement, composite foreign keys, constraints, and function permissions).
2. **Native PostgreSQL RLS Integration Suite (`postgres-rls-integration` job)**:
   - Spawns an ephemeral `postgres:17` container service in GitHub Actions.
   - Runs `scripts/run-comprehensive-postgres-rls-suite.py` executing the complete 31-test attack matrix against live PostgreSQL kernel session roles.
   - Runs `src/integrations/supabase/phase1-multi-tenant-postgres-integration.test.ts` via Vitest.
   - Generates and uploads `scripts/comprehensive_postgres_rls_matrix.json` as an immutable GitHub Actions artifact.

---

## 2. GitHub Actions Workflow Configuration

The following job definition has been added to `.github/workflows/ci.yml`:

```yaml
  postgres-rls-integration:
    name: Native PostgreSQL RLS Integration Suite
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgrespassword
          POSTGRES_DB: khelgrid_rls_ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install PostgreSQL client tools
        run: sudo apt-get update && sudo apt-get install -y postgresql-client

      - name: Install project dependencies
        run: npm ci

      - name: Bootstrap Auth and Phase 1 Schema
        env:
          PGPASSWORD: postgrespassword
        run: |
          psql -h localhost -U postgres -d khelgrid_rls_ci -f .github/scripts/phase-1-init-auth.sql
          psql -h localhost -U postgres -d khelgrid_rls_ci -f supabase/deployments/phase-1-saas-multi-tenant-deployment.sql
          psql -h localhost -U postgres -d khelgrid_rls_ci -f supabase/migrations/20261121210000_phase1_fk_deletion_and_function_hardening.sql

      - name: Run Schema Assertions
        env:
          PGPASSWORD: postgrespassword
        run: |
          psql -h localhost -U postgres -d khelgrid_rls_ci -f .github/scripts/phase-1-multi-tenant-rls-assertions.sql

      - name: Run 31-Vector PostgreSQL Attack Matrix
        env:
          DATABASE_URL: postgresql://postgres:postgrespassword@localhost:5432/khelgrid_rls_ci
        run: |
          python scripts/run-comprehensive-postgres-rls-suite.py

      - name: Run Vitest Native Integration Harness
        env:
          DATABASE_URL: postgresql://postgres:postgrespassword@localhost:5432/khelgrid_rls_ci
        run: |
          npx vitest run src/integrations/supabase/phase1-multi-tenant-postgres-integration.test.ts

      - name: Upload Test Results Artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: postgres-rls-matrix-evidence
          path: scripts/comprehensive_postgres_rls_matrix.json
          retention-days: 30
```

---

## 3. Local Reproduction Protocol

To reproduce the exact CI execution locally:

### Prerequisites:
1. Docker Desktop installed and running.
2. PostgreSQL 16 container running (e.g. `sports-platform-postgres`).
3. Node.js 20+ and Python 3.10+.

### Step-by-Step Commands:

```bash
# 1. Create ephemeral database
docker exec -i sports-platform-postgres psql -U postgres -c "CREATE DATABASE khelgrid_rls_test;"

# 2. Bootstrap auth schema and Phase 1 migrations
Get-Content .github/scripts/phase-1-init-auth.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test
Get-Content supabase/deployments/phase-1-saas-multi-tenant-deployment.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test
Get-Content supabase/migrations/20261121210000_phase1_fk_deletion_and_function_hardening.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test

# 3. Verify catalog integrity assertions
Get-Content .github/scripts/phase-1-multi-tenant-rls-assertions.sql | docker exec -i sports-platform-postgres psql -U postgres -d khelgrid_rls_test

# 4. Run the comprehensive 31-vector attack matrix runner
python scripts/run-comprehensive-postgres-rls-suite.py

# 5. Run Vitest integration test
npx vitest run src/integrations/supabase/phase1-multi-tenant-postgres-integration.test.ts
```

### Expected Output:
- All 11 catalog integrity assertions return `NOTICE: Phase 1 Multi-Tenant RLS & Architectural Assertions: ALL GATES PASSED.`
- `run-comprehensive-postgres-rls-suite.py` returns `31 / 31 passed (100.0%)`.
- Vitest reports `1 passed (1)`.
- `scripts/comprehensive_postgres_rls_matrix.json` is updated with fresh timestamps and outputs.

---

## 4. Artifacts Summary

| Artifact Name | Format | Location | Purpose |
| :--- | :---: | :--- | :--- |
| `comprehensive_postgres_rls_matrix.json` | JSON | `scripts/comprehensive_postgres_rls_matrix.json` | Machine-readable evidence of all 31 attack vector executions |
| `phase-1-init-auth.sql` | SQL | `.github/scripts/phase-1-init-auth.sql` | Auth fixture for standing up clean testing instances |
| `phase-1-multi-tenant-rls-assertions.sql` | SQL | `.github/scripts/phase-1-multi-tenant-rls-assertions.sql` | Automated catalog regression test assertions |
| `phase1-multi-tenant-postgres-integration.test.ts` | TypeScript | `src/integrations/supabase/phase1-multi-tenant-postgres-integration.test.ts` | Vitest test harness executing Docker psql runner |
