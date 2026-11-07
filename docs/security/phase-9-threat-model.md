# KhelGrid Security Programme — Phase 9: Comprehensive Threat Model (STRIDE)

> **Document ID:** SEC-P9-TM-001  
> **Status:** Implemented in code | Tested against isolated PostgreSQL  
> **Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  

---

## 1. System Overview & Trust Boundaries

KhelGrid is a distributed React/Vite web application connecting to a Supabase backend (PostgreSQL 17, PostgREST, GoTrue Auth, Realtime, S3 Storage) and third-party payment gateways (Razorpay).

### Key Trust Boundaries:
1. **Client / Browser Boundary**: Completely untrusted. All requests (headers, parameters, tokens) are subject to inspection and manipulation.
2. **PostgREST / API Gateway Boundary**: Authenticates JWTs, enforces IP rate limits, and maps REST endpoints to PostgreSQL schemas.
3. **Database Security Layer**: RLS policies, RBAC roles, `SECURITY DEFINER` functions, triggers, and column security.
4. **Third-Party Payment Webhook Boundary**: Cryptographic HMAC signature boundary verifying authentic gateway callbacks.
5. **Storage Boundary**: S3 object storage isolated via PostgreSQL RLS policies on `storage.objects`.

---

## 2. STRIDE Threat Analysis & Architectural Countermeasures

```
+-------------------------------------------------------------------------------------------------------+
|                                  STRIDE THREAT & MITIGATION MATRIX                                    |
+-------------------+------------------------------------------+----------------------------------------+
| STRIDE Category   | Specific Threat Scenario                 | Implemented Countermeasure             |
+-------------------+------------------------------------------+----------------------------------------+
| Spoofing          | Forging caller identity as admin or      | public.is_service_role_or_admin()      |
|                   | service_role in SECURITY DEFINER RPCs    | inspects auth.role() and JWT claims;   |
|                   |                                          | rejects spoofed headers.               |
+-------------------+------------------------------------------+----------------------------------------+
| Tampering         | Tampering with venue booking rates       | Authoritative rates computed in DB;    |
|                   | or payment amounts during checkout       | verify_payment_transaction enforces    |
|                   |                                          | exact paisa amount match.              |
+-------------------+------------------------------------------+----------------------------------------+
| Repudiation       | Submitter denies listing fraud or        | Append-only listing_moderation_        |
|                   | moderator approves fraudulent listing    | audit_logs records moderator ID,       |
|                   | without audit trail                      | action, and immutable timestamp.       |
+-------------------+------------------------------------------+----------------------------------------+
| Information       | Scraping phone and email via direct      | Removed profiles_public_read policy;   |
| Disclosure        | PostgREST table SELECT queries           | enforced owner-only table access;      |
|                   |                                          | public discovery via sanitized RPC.    |
+-------------------+------------------------------------------+----------------------------------------+
| Denial of         | Rotating order IDs or coupon codes to    | Client-bound IP/UID rate limiting;     |
| Service           | brute-force vouchers or deplete pool     | STABLE -> VOLATILE RPC execution.      |
+-------------------+------------------------------------------+----------------------------------------+
| Elevation of      | User assigns themselves admin or         | prevent_profile_role_self_escalation   |
| Privilege         | moderator role in profiles or user_roles | trigger aborts unauthorized edits.     |
+-------------------+------------------------------------------+----------------------------------------+
```

---

## 3. Threat Scenarios & Mitigations

### 3.1 Threat: PostgREST Direct Table PII Exfiltration (Information Disclosure)
- **Attack Vector:** An attacker discovers PostgREST REST endpoints (`/rest/v1/profiles?select=email,phone`) and uses automated scrapers with an anonymous API key to harvest user contact lists.
- **Impact:** High privacy breach, non-compliance with DPDP Act 2023.
- **Mitigation:**
  - `profiles_public_read` policy dropped.
  - Table RLS permits SELECT only when `auth.uid() = id`.
  - Directory UI queries `get_public_profile(uuid)`, which deliberately projects only non-sensitive columns (`display_name`, `avatar_url`, `city`, `bio`).

### 3.2 Threat: Order ID Rotation & Rate Limit Bypass (Denial of Service / Brute Force)
- **Attack Vector:** Attacker attempts to brute-force 6-character voucher codes by rotating through target order IDs, keeping each order ID query count under the limit.
- **Impact:** Compromise of customer vouchers, unearned venue access.
- **Mitigation:**
  - Redesigned rate limiting to extract real gateway client identity (`public.get_request_client_identity()`).
  - Dual-tier throttling: IP-bound limit (30 req/min) across all lookups + target-bound limit (5 req/min per order).

### 3.3 Threat: Double-Booking via Concurrent Slot Checkout (Tampering / Race Condition)
- **Attack Vector:** Two users simultaneously click "Book Now" for the sole remaining 8:00 PM court. Both checkouts proceed concurrently.
- **Impact:** Financial dispute, overbooking, customer dissatisfaction.
- **Mitigation:**
  - PostgreSQL unique partial index `uq_venue_slot_concurrency` on `(venue_id, booking_date, start_time, court_number) WHERE status NOT IN ('cancelled', 'refunded')`.
  - Engine-level serialization blocks double allocation with zero race condition window.

### 3.4 Threat: Self-Approval of Commercial Venue Listings (Elevation of Privilege)
- **Attack Vector:** A user creates an account, acquires moderator credentials or exploits a logic flaw, and approves their own fraudulent listing to claim public listing status.
- **Impact:** Reputational harm, platform fraud.
- **Mitigation:**
  - `public.review_listing_submission` strictly verifies `submitted_by <> auth.uid()`.
  - Self-approval raises an explicit PostgreSQL exception.

---

## 4. Residual Risks & Ongoing Controls

1. **Leaked Password Protection**: Leaked password check is a Supabase Auth dashboard configuration setting. While documented and verified via runbook, it requires project dashboard toggle enablement.
2. **Third-Party Payment Gateway Outages**: Webhook retry queues with exponential backoff handle transient network failures between Razorpay and Supabase.
