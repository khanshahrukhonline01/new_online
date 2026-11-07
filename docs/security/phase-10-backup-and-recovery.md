# KhelGrid Security Programme — Phase 10: Backup, Disaster Recovery & Restoration Verification

> **Document ID:** SEC-P10-BCP-001  
> **Status:** Operational Verification Protocol Ready  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** PostgreSQL 17 / Supabase  

---

## 1. Objectives, RPO, and RTO

A backup file that has never been restored is not a verified backup. KhelGrid enforces a strict test-restore verification standard for all database backups.

### Recovery Objectives:
- **Recovery Point Objective (RPO):** < 15 minutes (ensured via continuous Write-Ahead Log (WAL) archiving).
- **Recovery Time Objective (RTO):** < 1 hour for full database restoration to cold standby.

---

## 2. Backup Architecture & Storage Isolation

1. **Daily Full Logical Snapshot**:
   - `pg_dump` snapshot generated daily at 02:00 UTC.
   - Encrypted with AES-256 before transfer to secondary disaster recovery cloud storage.
2. **Continuous WAL Archiving**:
   - PostgreSQL Write-Ahead Logs streamed continuously to durable object storage.
   - Permits Point-in-Time Recovery (PITR) to any second within the retention window.
3. **Backup Encryption & Access Isolation**:
   - Backup buckets are physically decoupled from the primary application credentials.
   - Primary application service role keys cannot delete or overwrite backups (enforcing WORM: Write Once, Read Many).

---

## 3. Mandatory Restoration Testing Protocol

To verify backup integrity without risking development or production systems:

### Automated Monthly Test Restore Procedure:
1. **Provision Ephemeral Isolated Container**:
   ```bash
   docker run --name pg-test-restore -e POSTGRES_PASSWORD=restore_test_pw -d postgres:17-alpine
   ```
2. **Transfer Latest Encrypted Dump**:
   - Download the latest snapshot from disaster recovery storage.
   - Decrypt with the offline disaster recovery key.
3. **Execute Full Restore**:
   ```bash
   docker exec -i pg-test-restore psql -U postgres -d postgres < latest_khelgrid_backup.sql
   ```
4. **Automated Verification Queries**:
   - Verify table counts, row counts, and relational integrity:
     ```sql
     -- Verify essential tables exist
     SELECT count(*) FROM public.venues;
     SELECT count(*) FROM public.venue_bookings;
     SELECT count(*) FROM public.profiles;
     SELECT count(*) FROM public.athlete_profiles;

     -- Verify schema migrations table is intact
     SELECT count(*) FROM supabase_migrations.schema_migrations;
     ```
5. **Run RLS & Permission Sanity Check**:
   - Execute test queries under `anon` role to ensure RLS policies survived the restore process intact.
6. **Teardown**:
   - Destroy the ephemeral container:
     ```bash
     docker stop pg-test-restore && docker rm pg-test-restore
     ```
7. **Document & Log**:
   - Record restore duration, file size, row counts, and checksums in the disaster recovery log.

---

## 4. Disaster Recovery Scenarios & Procedures

### Scenario A: Unintended DDL or Malicious Table Deletion
1. Identify the exact UTC timestamp immediately preceding the event.
2. Request Point-in-Time Recovery (PITR) via Supabase Dashboard or CLI:
   `supabase projects restore --target-time "2026-11-08 02:15:00+00"`
3. The platform boots an instance restored to that exact second.
4. Verify data integrity and re-route PostgREST connections.

### Scenario B: Cloud Provider Regional Outage
1. Deploy cold standby infrastructure in secondary cloud region (e.g., AWS Mumbai -> AWS Singapore).
2. Restore latest logical snapshot into secondary PostgreSQL instance.
3. Update environment variables in Vercel to point to secondary database host.
4. Run regression test suite (`npm test`) against standby database.
5. Switch DNS / Vercel production deployment.
