# KhelGrid Security Programme — Phase 4: Password Recovery Architecture

**Document ID:** SEC-DOC-P4-04  
**Status:** Implemented in Repository  
**Author:** KhelGrid Application Security & Architecture  
**Date:** November 8, 2026  

---

## 1. Overview & Threat Vectors

Password recovery is a frequent target for attackers seeking account takeover through:
1. **User Enumeration:** Probing whether specific sports celebrities, venue owners, or coaches have accounts.
2. **Open-Redirect Hijacking:** Manipulating recovery callback URLs to route recovery tokens to an attacker-controlled endpoint.
3. **Replay & Token Expiration Vulnerabilities:** Reusing expired or previously consumed password reset tokens.
4. **Token Leakage in Logs:** Writing sensitive reset tokens to browser console logs or error logging systems.

---

## 2. Anti-Enumeration Design

In `sendPasswordReset(email)`:
- Regardless of whether the target email address is registered on KhelGrid or not, the service returns a standard generic message:
  ```json
  {
    "success": true,
    "message": "If an account exists with this email address, password reset instructions have been sent."
  }
  ```
- Timing attack mitigation: Both existing and non-existing email lookups follow identical cryptographic call patterns through Supabase Auth.

---

## 3. Secure Link Generation & Open-Redirect Protection

### 3.1 Redirect Whitelisting
Recovery URLs are strictly sanitized before passing to `client.auth.resetPasswordForEmail()`:
```typescript
const redirectPath = getSafeRedirectUrl('/login?type=recovery')
const redirectUrl = typeof window !== 'undefined'
  ? `${window.location.origin}${redirectPath}`
  : `https://khelgrid.com${redirectPath}`
```

`getSafeRedirectUrl` enforces:
- Leading single slash `/`.
- Rejection of protocol-relative `//` URLs.
- Rejection of external domains or non-HTTPS schemes.

### 3.2 Token Handling in Browser
When the user clicks the reset link in their email:
1. The Supabase GoTrue server validates the single-use token and redirects the browser to `https://khelgrid.com/login?type=recovery#access_token=...`.
2. `parseAuthUrlCallback()` extracts the recovery token and type.
3. Once parsed, `clearAuthUrlHash()` invokes `window.history.replaceState()` to immediately strip the hash fragment and access token from the browser address bar. This prevents tokens from leaking into Referer headers or browser history.
4. The user enters a new password. `updatePassword(newPassword)` verifies minimum length (>= 6 chars) and updates the credentials via `client.auth.updateUser()`.
5. Upon successful password update, existing sessions on other devices are invalidated by the Auth server.
