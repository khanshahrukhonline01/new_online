# KhelGrid Security Programme — Phase 10: Backup, Disaster Recovery & Restoration Verification

> **Document ID:** SEC-P10-BCP-002  
> **Status:** Operational Verification Protocol & Isolated Restore Validated  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** PostgreSQL 17 / Supabase  

---

## 1. Objectives, RPO, and RTO

A backup file that has never been restored is not a verified backup. KhelGrid enforces a strict test-restore verification standard for all database backups.

### Recovery Objectives:
- **Recovery Point Objective (RPO):** < 15 minutes (ensured via continuous Write-Ahead Log (WAL) archiving).
- **Recovery Time Objective (RTO):** < 1 hour for full database restoration to cold standby.

---

## 2. Executed Isolated Restore Exercise (`SEC-TEST-ISO-05`)

To prove restoration capability without altering or endangering live environments, an isolated PostgreSQL restoration test was executed in `src/integrations/supabase/database-security-isolated-postgres.test.ts`:

1. **Primary Database Initialization**: Populated relational schema and records across geographic directories.
2. **Logical Snapshot Extraction**: Generated clean relational table snapshot.
3. **Standby Provisioning**: Instantiated a cold, isolated PostgreSQL database instance.
4. **Data Restoration & Integrity Assertion**: Executed restore script into the standby instance.
5. **Read-Back Verification**: Verified that 100% of rows and columns were restored identically with correct relational ordering.

---

## 3. Disaster Recovery Scenarios & Procedures

### Scenario A: Unintended DDL or Malicious Mutation
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
