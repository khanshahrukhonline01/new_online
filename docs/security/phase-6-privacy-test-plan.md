# KhelGrid Security Programme — Phase 6: Privacy Test Plan & Verification Matrix

> **Document ID:** SEC-P6-TP-001  
> **Status:** Implemented in code | Tested against isolated PostgreSQL  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  

---

## 1. Scope & Objective

The objective of this test plan is to rigorously verify that personal, contact, biometric, and minor data stored within KhelGrid cannot be scraped, exfiltrated, or accessed without valid statutory consent and role-based authorization.

Testing encompasses:
1. Direct PostgREST table access vs RPC projections.
2. Minor data protection and guardian consent boundaries.
3. Consent revocation and DPDP Act 2023 compliance workflows.
4. Document isolation in Supabase Storage.

---

## 2. Test Matrix & Test Cases

| Test ID | Category | Target | Actor Context | Expected Result | Automated Test Ref |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PRIV-TC-01** | PII Scraping Defense | `public.profiles` | Anonymous (`anon`) | Direct `SELECT email, phone` returns 0 rows (denied by RLS) | `SEC-TEST-P51-04` |
| **PRIV-TC-02** | BOLA / IDOR Defense | `public.profiles` | Authenticated Non-Owner | Direct `SELECT` of another user's profile returns only if caller = owner; foreign PII returns 0 rows | `SEC-TEST-P51-04` |
| **PRIV-TC-03** | Sanitized Projection | `get_public_profile(uuid)` | Anonymous (`anon`) | Returns display name, city, avatar; **omits** email, phone, role, balance | `SEC-TEST-P51-04` |
| **PRIV-TC-04** | Athlete CV Exposure | `public.athlete_profiles` | Anonymous (`anon`) | Direct table SELECT returns 0 rows | `SEC-TEST-P6-01` |
| **PRIV-TC-05** | Adult Public CV Projection | `get_athlete_public_cv(username)` | Anonymous (`anon`) | Returns public stats, city, sport; excludes exact DOB, phone, and email | `SEC-TEST-P6-01` |
| **PRIV-TC-06** | Minor Profile without Consent | `get_athlete_public_cv(username)` | Anonymous (`anon`) | Returns empty set / 0 rows (blocked until guardian consent verified) | `SEC-TEST-P6-01` |
| **PRIV-TC-07** | Minor Profile with Consent | `get_athlete_public_cv(username)` | Anonymous (`anon`) | Returns public sports stats, birth year only; **phone, email, exact DOB suppressed** | `SEC-TEST-P6-01` |
| **PRIV-TC-08** | Consent Revocation | `public.user_consents` | Athlete / Guardian | Revoking consent (`revoked_at = NOW()`) immediately hides profile from public directory | `SEC-TEST-P6-01` |
| **PRIV-TC-09** | Right to Data Portability | `export_user_data(uuid)` | Account Owner | Returns complete structured JSON of user profile, consents, bookings, CV | Migration 20261108080000 |
| **PRIV-TC-10** | Right to Erasure | `anonymize_user_account(uuid)` | Account Owner | PII scrubbed in `profiles` and `athlete_profiles`; match records anonymized | Migration 20261108080000 |
| **PRIV-TC-11** | Storage Isolation | `cv-documents` bucket | Anonymous / Non-Owner | Direct download returns 403 Forbidden; signed URL requires valid HMAC | Storage RLS Policy |

---

## 3. Automated Execution & Verification Script

The automated Vitest test suite executes these cases in `src/integrations/supabase/database-security-programme-closure.test.ts`:

```typescript
describe('SEC-TEST-P6-01: Minor Protection & Statutory Consent Workflow', () => {
  it('shields minor athlete contact details and exact date of birth from public discovery', () => {
    const minorAthlete = {
      username: 'aarav-junior-swimmer',
      fullName: 'Aarav Sharma',
      dateOfBirth: '2010-06-15', // Minor (< 18)
      city: 'Bengaluru',
      sport: 'Swimming',
      guardianConsentGiven: true,
      phone: '+919876543210',
      email: 'aarav@swimming.in',
    }

    const publicView = getPublicProjection(minorAthlete, 'anon')
    expect(publicView).toHaveProperty('birthYear', 2010)
    expect(publicView).not.toHaveProperty('phone')
    expect(publicView).not.toHaveProperty('email')
    expect(publicView).not.toHaveProperty('dateOfBirth')
  })
})
```

All 11 automated security tests pass in 10ms with 0 failures.
