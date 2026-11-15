# KhelGrid Security Programme — Phase 4: Authentication Flow Inventory

**Document ID:** SEC-DOC-P4-03  
**Status:** Audited & Remediated  
**Author:** KhelGrid Application Security & Architecture  
**Date:** November 8, 2026  

---

## 1. Authentication Flow Inventory Matrix

| Flow ID | Flow Name | Trigger Point | Authentication Method | Authorization Boundary | Failure Behavior |
|---|---|---|---|---|---|
| **AUTH-01** | Standard Email Registration | `AuthModal` (Create Account tab) | Supabase Auth `signUp()` | Password >= 6 chars; user metadata role forced to `'athlete'`; email confirmation pending | Returns error message; no fake demo user |
| **AUTH-02** | Magic Link Registration / Login | `AuthModal` (Send Magic Link) | Supabase Auth `signInWithOtp()` | Requires valid email; sends time-limited OTP token; redirects to site origin | Returns error message or prompts check inbox |
| **AUTH-03** | Standard Password Login | `AuthModal` (Sign In tab) | Supabase Auth `signInWithPassword()` | Credentials validated by Supabase Auth; profile loaded from `profiles` table | Generic "Invalid email or password"; anti-enumeration |
| **AUTH-04** | Password Reset Request | `AuthModal` (Recovery tab) | Supabase Auth `resetPasswordForEmail()` | Open-redirect validation via `getSafeRedirectUrl()`; token expires in 15 mins | Generic "If an account exists..." response |
| **AUTH-05** | Resend Verification Email | `AuthModal` (Expired link tab) | Supabase Auth `resend({ type: 'signup' })` | Rate-limited (max 1 per minute); sends fresh confirmation link | Handles HTTP 429 rate limit gracefully |
| **AUTH-06** | Password Update | Profile / Security Settings | Supabase Auth `updateUser({ password })` | Requires active session; password >= 6 chars | Returns error; maintains current credentials |
| **AUTH-07** | User Logout | User dropdown / Settings | Supabase Auth `signOut()` | Revokes remote tokens; purges memory, local storage, broadcasts null event | Cleans all client-side state unconditionally |
| **AUTH-08** | URL Hash Callback Processing | Page load (`parseAuthUrlCallback`) | URL Hash inspection (`#access_token=...`) | Parses `type=recovery` or `type=signup` or error codes (`otp_expired`); sanitizes URL | Clears sensitive tokens from address bar via `clearAuthUrlHash` |
| **AUTH-09** | Profile Modification | Profile edit form | PostgreSQL trigger `trg_prevent_profile_role_self_escalation` | Non-admin cannot alter `role`, `id`, or `is_verified` | Database exception raised; client update aborted |
| **AUTH-10** | Admin Role Assignment | Admin Moderation Desk | PostgreSQL RPC `admin_assign_role` | Caller must be verified system administrator (`has_role(auth.uid(), 'admin')`) | Database exception: "Access denied" |

---

## 2. Insecure Fallback Audit Findings

During the Phase 4 audit, two legacy demo fallback paths were identified and eliminated:

1. **Unconfigured Dev Mode Fallback in `signUpWithEmail`:**
   - *Previous behavior:* When `!client`, generated `dev-${Date.now().toString(36)}` with `isVerified: true` and saved it to `localStorage`.
   - *Remediation:* Removed completely. When Supabase is unconfigured, returns `{ success: false, message: 'Authentication service is not configured. Please verify your Supabase credentials.' }`.
2. **Unconfigured Dev Mode Fallback in `signInWithEmail`:**
   - *Previous behavior:* When `!client`, generated `dev-${cleanEmail.replace(/[^a-z0-9]/g, '')}` with `isVerified: true`.
   - *Remediation:* Removed completely. Returns `{ success: false, message: 'Authentication service is not configured. Please verify your Supabase credentials.' }`.

---

## 3. Route Guard Security Assessment

The application uses client-side route guards in React to manage UI navigation:
- `ProtectedRoute`: Checks `getStoredAuthUser()`. If null, redirects to `/login`.
- `AdminRoute`: Checks `hasRole(user, ['admin'])`. If false, redirects to `/`.

**Security Note:** These route guards provide user convenience, not database protection. Direct REST API calls or SQL queries cannot bypass database policies:
- All sensitive tables enforce Row Level Security (`FORCE ROW LEVEL SECURITY`).
- Anonymous requests cannot read booking PII, subscriptions, reminders, or rate limits.
- Stored procedures enforce `auth.uid()` checks internally.
