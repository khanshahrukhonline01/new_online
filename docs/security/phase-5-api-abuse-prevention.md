# KhelGrid — Phase 5: API Abuse Prevention & Operational Safeguards
## Rate Limiting, Brute-Force Defense & Safe Error Handling Architecture

**Document:** API Abuse Prevention & Operational Safeguards  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 5 — API/RPC Security, Backend Hardening, and Closure of Outstanding Phase 1–4 Work  
**Target Database:** Supabase Development Instance `hznsbxvovjxvmnchzzqt`  
**Branch:** `security/phase-5-api-rpc-and-prior-phase-closure`  
**Date:** November 8, 2026  

---

## 1. Overview

This document outlines the API abuse prevention architecture implemented in Phase 5 to protect KhelGrid against:
1. **Automated Enumeration**: Brute-force attacks against sequential or predictable order identifiers (`order_id`) and booking references (`booking_ref`).
2. **Reservation Spamming & Denial of Inventory**: Automated scripts repeatedly calling reservation RPCs to exhaust available match spots.
3. **Information Leakage via Errors**: Verbose database error messages leaking table schemas, column names, or stack traces.
4. **Idempotency Violations**: Network retries causing duplicate payments or double bookings.

---

## 2. Sliding-Window Rate Limiting (`public.api_rate_limits`)

### 2.1 Database-Backed Rate Limiting Table
```sql
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_key_window UNIQUE (rate_key, window_start)
);
```

### 2.2 Rate Check Helper (`public.check_and_increment_rate_limit`)
- **Discrete Interval Windows**: Windows are rounded to fixed time buckets (`to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)`).
- **Atomic UPSERT**: Single statement `INSERT ... ON CONFLICT DO UPDATE` guarantees race-condition free incrementation under concurrent requests.
- **Fail Closed**: If request threshold is exceeded, returns `false` and the calling procedure halts execution immediately with `HTTP 429` / `{ "error_code": "RATE_LIMITED" }`.

### 2.3 Applied Limits by Endpoint

| Endpoint / Operation | Rate Key Pattern | Max Requests | Window (Seconds) | Action on Exceeded |
|---|---|:---:|:---:|---|
| **Order Receipt Lookup** | `order_lookup:<order_id>` | 15 | 60 | Blocked (`RATE_LIMITED`) |
| **Booking Voucher Lookup** | `booking_lookup:<booking_ref>` | 15 | 60 | Blocked (`RATE_LIMITED`) |
| **Guest Pickup RSVP** | `rsvp:<game_id>:<phone>` | 3 | 300 | Blocked (`DUPLICATE_REGISTRATION`) |
| **Password Recovery** | `auth:recovery:<email>` | 3 | 3600 | Supabase Auth Generic Throttle |

---

## 3. Anti-Enumeration & High-Entropy Token Architecture

To defeat sequential guessing of booking references and orders:
1. **Decoupled Verification Secrets**: Order IDs (`KG_ORD_1001`) and Booking References (`VB-DEL-1108`) are public transaction identifiers, **never authorization secrets**.
2. **Cryptographic Tokens**: Each booking and subscription row carries a 48-hex-character unguessable token (`voucher_token` / `access_token`) generated via `encode(gen_random_bytes(24), 'hex')`.
3. **Fail-Closed Lookup Contract**:
   ```sql
   IF NOT (v_is_owner OR v_has_valid_token) THEN
     RETURN NULL; -- PostgREST returns HTTP 200 [] (zero rows)
   END IF;
   ```
   Attackers probing random order IDs or tokens cannot distinguish between a non-existent order and an unauthorized order.

---

## 4. Safe Error Handling & Redaction Safeguards

Client-facing database procedures and client SDKs enforce strict error masking to prevent reconnaissance:
- **Masked Patterns**:
  - `relation "..." does not exist` -> `An internal error occurred. Please try again later.`
  - `syntax error at or near` -> `An internal error occurred. Please try again later.`
  - `auth.` / `password_hash` -> `Authentication error.`
- **Safe Structured Errors**: All RPC errors use a consistent JSON structure:
  ```json
  {
    "status": "error",
    "error_code": "INVALID_PHONE",
    "message": "A valid mobile number is required (10 to 15 digits)."
  }
  ```
  No stack traces, table names, or internal IDs are returned to the caller.

---

## 5. Structured Audit Logging

Sensitive actions produce immutable audit logs without recording sensitive PII:
1. **User Role Audit Trail** (`public.user_role_audit_logs`):
   Records `user_id`, `role`, `action` (`ASSIGN` / `REVOKE`), `performed_by`, and timestamp.
2. **Authentication Security Events** (`public.auth_security_events`):
   Records event type (`LOGIN_ATTEMPT`, `PASSWORD_RECOVERY_REQUEST`, `PRIVILEGE_ESCALATION_ATTEMPT`), status, IP address, and sanitized event metadata.
   Passwords, full credit card numbers, and raw auth tokens are strictly barred from log payloads.
