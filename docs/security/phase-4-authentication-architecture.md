# KhelGrid Security Programme — Phase 4: Authentication Architecture

**Document ID:** SEC-DOC-P4-01  
**Status:** Implemented in Repository (PR Prepared)  
**Target Architecture:** React + Vite + TypeScript + Supabase Auth  
**Author:** KhelGrid Application Security & Architecture  
**Date:** November 8, 2026  

---

## 1. Architectural Overview & Security Boundary

The KhelGrid authentication architecture integrates client-side React components with Supabase Auth (GoTrue) and PostgreSQL Row Level Security (RLS). 

In Phase 4, the authentication subsystem was comprehensively refactored to eliminate client-side bypasses, enforce strict separation between session authentication and email verification, and terminate all insecure mock fallbacks.

```
       +-----------------------------------------------------------+
       |                  Browser Discovery Shell                  |
       |  (Public Browsing: Academies, Coaches, Venues, Fixtures)  |
       +-----------------------------------------------------------+
                                     |
                                     v
                       +---------------------------+
                       |    AuthModal / Forms      |
                       | (Validation & Sanitizing) |
                       +---------------------------+
                                     |
                                     v
                       +---------------------------+
                       |   auth-client.ts Engine   |
                       |  - Input Validation       |
                       |  - No Demo Account Mint   |
                       |  - Anti-Enumeration       |
                       |  - Open-Redirect Guard    |
                       +---------------------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
   +-------------------------+               +-------------------------+
   |   Supabase Auth API     |               |   Public PostgreSQL     |
   | (GoTrue HTTPS Endpoint) |               | (RLS & Atomic Triggers) |
   | - Argon2/Bcrypt Hash    |               | - profiles table        |
   | - JWT Issuance          |               | - user_roles table      |
   | - Refresh Tokens        |               | - Anti-tamper triggers  |
   +-------------------------+               +-------------------------+
```

### 1.1 Fundamental Principles
1. **Zero Client Trust:** Route guards, client state, and browser storage do not serve as security perimeters. PostgreSQL RLS policies and stored procedures enforce authoritative access boundaries.
2. **Elimination of Fake Demo Identities:** No environment or network state can trigger the synthetic generation of authenticated user identities (`dev-*`). Failed authentication remains failed.
3. **Identity vs. Capability Decoupling:** Authentication verifies identity (`auth.users.id`). Authorization capabilities are resolved strictly through relational RBAC tables (`public.user_roles`).
4. **Email Verification State Gating:** An active JWT session does not imply email verification. Sensitive mutations require verified status (`email_confirmed_at IS NOT NULL`).

---

## 2. Authentication Subsystem Components

### 2.1 Supabase Auth Client Integration (`src/integrations/supabase/auth-client.ts`)
The unified client library manages authentication operations:
- `signUpWithEmail(input)`: Validates email, password length, and full name. Automatically strips self-elevation role requests (e.g., `'admin'`, `'moderator'`) and defaults unverified users to `isVerified: false`.
- `signInWithEmail(input)`: Authenticates via Supabase Auth. Returns generic failure responses without disclosing user registration status.
- `signOut()`: Terminates the remote session via `client.auth.signOut()`, purges `localStorage` items (`khelgrid_auth_user`, `khelgrid_auth_session`), clears in-memory state, and broadcasts an empty user event.
- `sendPasswordReset(email)`: Dispatches password reset instructions with safe redirect validation and returns generic enumeration-safe confirmations.
- `updatePassword(newPassword)`: Validates password strength and updates the active user's credentials.
- `updateUserProfile(updates)`: Shields critical fields (`role`, `isVerified`, `id`, `email`) from client-side alteration, persisting only permitted profile attributes.

### 2.2 Open-Redirect Protection (`getSafeRedirectUrl`)
To protect against phishing and open-redirect vulnerabilities during OAuth or recovery handoffs, `getSafeRedirectUrl` verifies that redirect destinations:
- Begin with a single leading `/`.
- Do not begin with `//` (preventing protocol-relative redirect attacks).
- Do not contain `:` (blocking `javascript:`, `data:`, `vbscript:` URI schemes).
- Do not contain backslashes `\` (blocking Windows UNC or scheme evasion).

---

## 3. Threat Modeling & Mitigations

| Threat | Vulnerability Vector | Phase 4 Architectural Mitigation |
|---|---|---|
| **Synthetic Identity Minting** | Unconfigured client fell back to local fake user with `isVerified: true`. | Completely removed demo fallback in `auth-client.ts`. If Supabase is unconfigured, operations fail with explicit error. |
| **Account Enumeration** | Different error messages for existing vs non-existent accounts. | `sendPasswordReset` and `signInWithEmail` return generic enumeration-safe responses. |
| **Role Self-Escalation** | Client passing `role: 'admin'` during registration or profile update. | `signUpWithEmail` forces non-athlete roles to `'athlete'`. PostgreSQL trigger `trg_prevent_profile_role_self_escalation` aborts unauthorized role updates. |
| **Premature Operation by Unverified User** | System allowing unconfirmed accounts to perform sensitive mutations. | `requireVerifiedEmail()` checks `isVerified` derived from `email_confirmed_at`. |
| **Open Redirection** | Malicious redirect query parameters during password reset. | `getSafeRedirectUrl` strictly permits relative local routes only. |
| **Stale Session Token Retention** | Partial client-side logout leaving cached profiles in storage. | `signOut()` purges memory, local storage, and invokes Supabase remote session invalidation. |

---

## 4. Supabase Dashboard Recommended Security Configuration

Catalog inspection identified that Supabase Security Advisor flagged leaked-password protection. The following dashboard configurations are recommended:

1. **Leaked-Password Protection:**
   - Navigate to: **Supabase Dashboard > Authentication > Attack Protection**.
   - Enable **Leaked Password Protection** (powered by HaveIBeenPwned database).
2. **Password Policy Minimums:**
   - Minimum character length: **8 characters**.
   - Require lower, upper, digits, and special characters.
3. **Session Lifetimes:**
   - Access token expiry (JWT): **3600 seconds (1 hour)**.
   - Refresh token lifetime: **604800 seconds (7 days)**.
   - Refresh token reuse detection: **Enabled** (revokes all descendant tokens upon reuse).
4. **Redirect URL Whitelist:**
   - `https://khelgrid.com/**`
   - `http://localhost:5173/**`
   - Wildcards on arbitrary domains strictly prohibited.
