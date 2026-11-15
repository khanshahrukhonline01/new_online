# KhelGrid Security Programme — Phase 10: Monitoring, Governance & Incident Response

> **Document ID:** SEC-P10-MON-001  
> **Status:** Operational Plan Ready  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Regulatory Alignment:** DPDP Act 2023 (Breach Notification Protocols)  

---

## 1. Security Monitoring & Audit Cadence

Continuous monitoring is vital to detect suspicious activity, credential stuffing, scraping attempts, and privilege misuse.

### 1.1 Automated Monitoring Channels
1. **Supabase Security Advisor**:
   - Automated weekly review of database linter findings.
   - Zero tolerance for unresolved `security_definer_view` or missing RLS warnings.
2. **PostgREST HTTP Gateway Telemetry**:
   - Monitor 4xx and 5xx error spikes (indicating brute-force or injection probes).
   - Real-time alerts when `public.api_rate_limits` logs rapid IP-level throttling events.
3. **Database Audit Logs (`public.security_audit_logs` & `public.listing_moderation_audit_logs`)**:
   - Automated triggers log all administrative role assignments, listing status overrides, and user data export requests.

---

## 2. Incident Classification & Response Procedures

```
+-------------------------------------------------------------------------------------------------------+
|                                  INCIDENT SEVERITY & RESPONSE MATRIX                                  |
+----------+----------------------------------------------+---------------+-----------------------------+
| Severity | Description                                  | Response SLA  | Incident Lead               |
+----------+----------------------------------------------+---------------+-----------------------------+
| SEV-1    | Critical data breach, PII exposure, unauth   | < 15 minutes  | Head of Security & CTO      |
|          | payment manipulation, or database compromise |               |                             |
+----------+----------------------------------------------+---------------+-----------------------------+
| SEV-2    | High risk: rate limit evasion, single-user   | < 2 hours     | Application Security Lead   |
|          | account takeover, broken minor consent check |               |                             |
+----------+----------------------------------------------+---------------+-----------------------------+
| SEV-3    | Medium: booking slot glitch, moderation lag, | < 12 hours    | Platform Operations Lead    |
|          | benign error in non-sensitive table          |               |                             |
+----------+----------------------------------------------+---------------+-----------------------------+
| SEV-4    | Low / Informational: typo, non-security bug  | Next sprint   | Engineering Team            |
+----------+----------------------------------------------+---------------+-----------------------------+
```

### 2.1 Five-Phase Incident Response Lifecycle
1. **Identification**: Detection via alerts, user reports, or audit logs. Initial triage and severity assignment.
2. **Containment**:
   - For compromised accounts: Revoke user session tokens via Supabase Auth Admin API.
   - For compromised IP blocks: Blacklist IP at gateway / WAF level.
   - For critical vulnerability: Activate read-only emergency maintenance mode.
3. **Eradication**: Identify root cause, apply hotfix or down-migration, verify patch in isolated environment.
4. **Recovery**: Restore verified state from point-in-time recovery (PITR) backup if data corruption occurred. Validate integrity and resume traffic.
5. **Post-Mortem & Reporting**: Document incident timeline, root cause, impact, and preventive remediation within 48 hours.

---

## 3. DPDP Act 2023 Data Breach Notification Protocol

Under **Section 8(6) of the Digital Personal Data Protection Act, 2023**, upon identifying a personal data breach, the data fiduciary must notify both the Data Protection Board of India (DPBI) and affected individuals.

### Breach Escalation Steps:
1. **Triage & Scope Determination (Within 6 Hours)**:
   - Determine whether personal data (especially minor athlete records, Aadhaar, phone, or financial data) was compromised.
   - Enumerate affected account IDs.
2. **Statutory Notification (Within 72 Hours)**:
   - Submit formal breach report to the Data Protection Board of India detailing nature of breach, affected data categories, potential consequences, and remedial measures taken.
3. **User Communication**:
   - Dispatch plain-language notifications via verified email/SMS to affected athletes and guardians with actionable advice (e.g. password reset instructions).

---

## 4. Access Revocation Protocol

When an employee, moderator, or third-party contractor departs or transitions roles:
1. **Database Role Revocation**:
   ```sql
   DELETE FROM public.user_roles WHERE user_id = '<user_uuid>';
   ```
2. **Immediate Session Invalidation**:
   - Invalidate all active JWT and refresh tokens via Supabase Auth API:
     `supabase.auth.admin.signOut('<user_uuid>', 'global')`.
3. **Repository & Service Credentials**:
   - Revoke GitHub organization membership and deploy keys.
   - Rotate Supabase service role keys if credentials were held by departing personnel.
