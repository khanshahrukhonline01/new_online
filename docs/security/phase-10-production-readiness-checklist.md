# KhelGrid Security Programme — Phase 10: Production Readiness Checklist & Gate Review

> **Document ID:** SEC-P10-PRC-001  
> **Status:** Code Implemented | Development Staged | Production Execution Explicitly Blocked  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Production Target:** `https://khelgrid.com/` (Untouched)  

---

## 1. Production Deployment Policy

**CRITICAL POLICY ENFORCEMENT:**  
Under the rules of the KhelGrid Security Programme, **production database migrations and production deployment are strictly prohibited during development tasks**.

This checklist defines the technical gates that must be satisfied in the development environment (`hznsbxvovjxvmnchzzqt`) and reviewed by senior security engineers before production deployment may be scheduled under separate explicit approval.

---

## 2. Technical Readiness Checklist

```
+-------------------------------------------------------------------------------------------------------+
|                                  PRODUCTION READINESS GATES & STATUS                                  |
+----+----------------------------------------------+---------------------------+-----------------------+
| #  | Gate Requirement                             | Development Status        | Production Status     |
+----+----------------------------------------------+---------------------------+-----------------------+
| 01 | Migration files syntax & transaction tested  | PASSED (100% clean)       | Pending Deployment    |
| 02 | RLS enabled and forced on all public tables  | Implemented in code       | Pending Deployment    |
| 03 | Zero permissive public SELECT on PII tables  | Implemented in code       | Pending Deployment    |
| 04 | Zero-policy tables eliminated                | Implemented in code       | Pending Deployment    |
| 05 | Default public EXECUTE revoked on 16 RPCs    | Implemented in code       | Pending Deployment    |
| 06 | Role escalation trigger verified             | Implemented in code       | Pending Deployment    |
| 07 | STABLE -> VOLATILE RPC fix verified on PG17  | Implemented in code       | Pending Deployment    |
| 08 | Rate limiting resists order rotation         | Implemented in code       | Pending Deployment    |
| 09 | Caller identity checks inspect auth.role()   | Implemented in code       | Pending Deployment    |
| 10 | Payment verification enforces HMAC & replay  | Implemented in code       | Pending Deployment    |
| 11 | 192-bit token entropy enforced on vouchers   | Implemented in code       | Pending Deployment    |
| 12 | Minor athlete consent & PII masking enforced | Implemented in code       | Pending Deployment    |
| 13 | Concurrency lock prevents double booking     | Implemented in code       | Pending Deployment    |
| 14 | Listing anti-self-approval rule enforced     | Implemented in code       | Pending Deployment    |
| 15 | Storage bucket RLS isolates cv-documents     | Implemented in code       | Pending Deployment    |
| 16 | Leaked-password protection documented        | Action Plan Documented    | Manual Dashboard Gate |
| 17 | Full Vitest suite passing (0 failures)       | PASSED (630 / 630 tests)  | N/A                   |
| 18 | TypeScript clean (0 errors)                  | PASSED (tsc -b clean)     | N/A                   |
| 19 | Production build succeeds without error      | PASSED (npm run build)    | N/A                   |
| 20 | Disaster recovery & restoration runbook      | PASSED (Runbook ready)    | Operational Standby   |
+----+----------------------------------------------+---------------------------+-----------------------+
```

---

## 3. Explicit Human Sign-Off Requirements Prior to Production Release

Before executing the master migration against the production Supabase database:
1. **Pre-Deployment Backup**: Complete logical dump and point-in-time snapshot of production PostgreSQL.
2. **Maintenance Window**: Schedule a 30-minute off-peak maintenance window (e.g., 03:00–03:30 IST).
3. **Dual Authorization**: Both the Lead Database Architect and the Chief Information Security Officer (CISO) must sign off on the execution plan.
4. **Post-Deployment Smoke Test**: Execute verification suite against production read replicas immediately following deployment.
