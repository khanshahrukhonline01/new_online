# KhelGrid Security Programme — Phase 4: Session Security & Token Lifecycle Design

**Document ID:** SEC-DOC-P4-02  
**Status:** Implemented in Repository  
**Author:** KhelGrid Application Security & Architecture  
**Date:** November 8, 2026  

---

## 1. Executive Summary

This document specifies the session lifecycle, cryptographic token handling, refresh rotation, and revocation mechanisms governing user sessions across KhelGrid.

---

## 2. Token Hierarchy & Storage Mechanics

```
               [ User Credentials / OTP Verification ]
                                  |
                                  v
                    +---------------------------+
                    |    Supabase Auth Server   |
                    +---------------------------+
                      /                       \
        Access Token (JWT)              Refresh Token (Opaque)
        - Short-lived (1 hour)          - Long-lived (7 days)
        - Contains user ID & claims     - Single-use rotatable
        - Cryptographically signed      - Managed by GoTrue client
                     |                              |
                     v                              v
           [ Web Application ]            [ Local Storage / Memory ]
           - Memory Cache                 - Auto-refresh handler
           - Authorization header         - Purged on signOut()
```

### 2.1 Access Tokens (JWT)
- **Format:** JSON Web Token signed with project HMAC secret or asymmetric key.
- **Payload Claims:**
  - `sub`: Unique `auth.users.id` UUID.
  - `role`: Default database role (`authenticated`).
  - `aud`: `authenticated`.
  - `exp`: Unix timestamp (1 hour from issuance).
- **Security Limitation:** JWTs are stateless and self-contained; they cannot be immediately invalidated until expiration without a centralized token blocklist. Consequently, critical mutations (e.g. role modification, payout credential configuration) validate against live PostgreSQL state via RLS and RPC triggers rather than relying solely on JWT claims.

### 2.2 Refresh Tokens
- **Mechanism:** Opaque string exchanged with the Supabase Auth server for a new JWT and a new rotated refresh token.
- **Rotation & Reuse Detection:** Supabase Auth rotates the refresh token upon every exchange. If an old refresh token is reused, the Auth server assumes token theft, revoking all tokens descending from that lineage.

---

## 3. Session Lifecycle State Machine

```
              +----------------------+
              |     UNAUTHENTICATED  |
              +----------------------+
                         |
                  Login / OTP Verify
                         |
                         v
              +----------------------+
              |  SESSION_ACTIVE      |<-----------+
              +----------------------+            |
                 /         |          \           |
                /          |           \          |
   Token Expiring          |            \         |
      (1 hour)          Logout        Revocation  |
         /                 |              \       |
        v                  v               v      |
  +-----------+     +-------------+    +--------+ |
  | REFRESH   |     | SIGNED_OUT  |    | DENIED | |
  +-----------+     +-------------+    +--------+ |
        |                  |                |     |
        +---- Success -----+                |     |
        |                                   |     |
        +---- Failure --------------------->+-----+
```

### 3.1 Session Restoration
1. On page load, `onAuthChange` initializes by reading `getStoredAuthUser()`.
2. The Supabase Auth client inspects stored tokens. If valid, it triggers `TOKEN_REFRESHED` or `INITIAL_SESSION`.
3. If token refresh fails (e.g. network partition, expired refresh token), the client dispatches `SIGNED_OUT`, triggering `setStoredAuthUser(null)` and cleaning local storage.

### 3.2 Secure Logout Sequence
When the user clicks "Log Out" or invokes `signOut()`:
1. `client.auth.signOut()` is executed, sending a revocation request to Supabase Auth.
2. `window.localStorage.removeItem(KHELGRID_AUTH_STORAGE_KEY)` removes cached profile data.
3. `window.localStorage.removeItem(KHELGRID_AUTH_SESSION_KEY)` removes cached session keys.
4. `inMemoryUser` is set to `null`.
5. A `khelgrid:auth-changed` event is dispatched with `{ user: null }` to ensure all UI widgets reset to unauthenticated visitor state.

---

## 4. Re-Authentication for High-Impact Workflows

For sensitive administrative and commercial operations:
- Payout account configuration (`configure_host_payout_account`).
- Platform role assignment (`admin_assign_role`).
- Account deletion / DPDP erasure requests (`request_user_data_erasure`).

These operations enforce:
1. Active authenticated session (`auth.uid() IS NOT NULL`).
2. Server-side role or ownership validation inside the database transaction.
3. Anti-tampering check: client cannot provide caller identity; PostgreSQL resolves it from `auth.uid()`.
