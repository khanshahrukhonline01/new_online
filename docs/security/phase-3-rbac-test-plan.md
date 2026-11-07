# KhelGrid — Phase 3: RBAC & Authorization Test Plan
## Security Verification & Regression Test Specifications

**Document:** Phase 3 RBAC Test Plan  
**Programme:** KhelGrid 10-Phase Security and Authorization Programme  
**Module:** Phase 3 — Role-Based Access Control (RBAC)  
**Lead Security Architect:** Antigravity  
**Audit & Test Date:** November 8, 2026  

---

## 1. Test Architecture & Methodology

The Phase 3 test harness executes automated unit and integration tests using Vitest to verify that:
1. **Unauthenticated callers** cannot execute privileged role operations or access private resources.
2. **Standard authenticated users** cannot escalate their privileges, self-assign roles, or modify records belonging to other users.
3. **Decoupled role assignments** correctly govern access based on the least-privilege matrix.
4. **Ownership boundaries** prevent cross-user data tampering even if two users share the same role.
5. **Administrative RPCs** enforce caller session validation, strict allowlists, last-admin protection, and audit logging.

---

## 2. Test Specifications & Verification Matrix

| Test ID | Domain | Assertion / Attack Scenario | Expected Outcome | Result |
| :--- | :--- | :--- | :--- | :---: |
| `SEC-TEST-P3R-01` | Role Assignment | Unauthenticated visitor invokes role management helpers | **Denied (`canManageRoles = false`, `hasPermission = false`)** | **PASS** |
| `SEC-TEST-P3R-02` | Self-Elevation | Athlete, coach, or host attempts to self-assign `'admin'` or `'moderator'` | **Denied (All role checks return `false`)** | **PASS** |
| `SEC-TEST-P3R-03` | Cross-User Mutation | Authenticated User A attempts to update or delete User B's roles | **Denied (`canAccessResource = false`)** | **PASS** |
| `SEC-TEST-P3R-04` | Role Revocation | Revoking `'moderator'` role from a user | **Authorization immediately terminates (`canModerateListing = false`)** | **PASS** |
| `SEC-TEST-P3R-05` | Admin RPC Contracts | Invoking `adminAssignRole` and `adminRevokeRole` in unconfigured environment | **Fails gracefully; returns explicit contract payload** | **PASS** |
| `SEC-TEST-P3R-06` | Visitor Restriction | Visitor attempts profile creation, application submission, or payment queries | **Denied (Only `catalogue:browse` allowed)** | **PASS** |
| `SEC-TEST-P3R-07` | Athlete Ownership | Athlete attempts to update another athlete's profile | **Denied (Only own profile can be edited)** | **PASS** |
| `SEC-TEST-P3R-08` | Coach Ownership | Coach attempts to update another coach's profile | **Denied (Strict owner matching enforced)** | **PASS** |
| `SEC-TEST-P3R-09` | Academy Scope | Academy attempts to approve its own directory listing | **Denied (`canModerateListing = false`)** | **PASS** |
| `SEC-TEST-P3R-10` | Venue Ownership | Venue host attempts to manage a venue owned by another host | **Denied (`canManageVenue = false`)** | **PASS** |
| `SEC-TEST-P3R-11` | Moderator Boundary | Moderator attempts to execute administrative role assignments | **Denied (`canManageRoles = false`)** | **PASS** |
| `SEC-TEST-P3R-12` | Admin Authority | Administrator executes documented system operations | **Authorized across all administrative domains** | **PASS** |
| `SEC-TEST-P3R-13` | Payment Ledger | Cross-user query against payment transaction ledger | **Denied (`canAccessResource = false`)** | **PASS** |
| `SEC-TEST-P3R-14` | Scorekeeper Boundary | Bystander athlete attempts to update live match score | **Denied (Requires match creator, coach, or admin)** | **PASS** |
| `SEC-TEST-P3R-15` | Fail-Closed Policy | Null / empty context evaluated for privileged action | **Fails closed (`hasPermission = false`)** | **PASS** |
| `SEC-TEST-P3R-16` | Matrix Completeness | All 10 defined platform roles evaluated against matrix | **Valid arrays; 100% matrix completeness** | **PASS** |

---

## 3. Test Execution Command & Evidence

```bash
npm test -- --run src/integrations/supabase/database-security-phase3-rbac.test.ts
```

```text
 ✓ src/integrations/supabase/database-security-phase3-rbac.test.ts (16 tests) 682ms
   ✓ KhelGrid Phase 3: Centralized RBAC & Authorization Controls Test Suite > Role Assignment Boundaries & Self-Elevation Denial > SEC-TEST-P3R-05: admin role assignment and revocation RPC contracts fail gracefully in test environment

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Duration  1.87s
```
