# KhelGrid Security Programme — Phase 5.4 Public RPC Privacy Report
## Public RPC Data Sanitization, Voucher Authorization & Anti-Enumeration Protections

> **Document ID:** SEC-P54-PRIVACY-001  
> **Status:** Implemented & Verified in Isolated PostgreSQL 17  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** `hznsbxvovjxvmnchzzqt` (Development Supabase Project)  
> **Production Status:** `https://khelgrid.com/` — STRICTLY OUT OF SCOPE (0 modifications)  

---

## 1. Executive Summary

An audit of public `SECURITY DEFINER` functions revealed that `get_listing_subscription_by_order` and `get_venue_booking_voucher` inadvertently exposed raw database table rows to anonymous callers. An attacker guessing or enumerating order IDs could harvest private customer mobile numbers, email addresses, internal user IDs, payment identifiers, and configuration metadata.

Phase 5.4 remediates these privacy risks by:
1. Revoking raw table returns from public RPCs.
2. Implementing narrow, sanitized JSON projections with zero phone, email, or internal credential leaks.
3. Requiring cryptographic voucher authorization (128-bit high-entropy token or authenticated owner context).
4. Enforcing server-side rate limiting against enumeration and brute-force attacks.
5. Preserving legitimate guest capabilities without requiring an account.

---

## 2. Public RPC Privacy Matrix

| RPC Name | Access Level | Return Type | Authorization Check | Rate Limited | PII / Secret Protection |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `get_listing_subscription_by_order` | `anon`, `authenticated`, `service_role` | `jsonb` | Owner (`user_id = auth.uid()`) OR Access Token ($\ge 16$ chars) OR Admin | Yes (15 req/min) | **Zero PII**: Phone, email, internal IDs, and payment secrets completely omitted. |
| `get_venue_booking_voucher` | `anon`, `authenticated`, `service_role` | `jsonb` | Owner (`user_id = auth.uid()`) OR Voucher Token ($\ge 16$ chars) OR Admin | Yes (15 req/min) | **Zero PII**: Customer phone and email omitted. Name masked (`R***n S***a`). |
| `get_booked_slots_for_venue` | `anon`, `authenticated`, `service_role` | `TABLE(slot_time text)` | Public Availability | No (Cached) | **Zero PII**: Returns only time strings (e.g. `'06:00 PM - 07:00 PM'`). |
| `get_athlete_public_cv` | `anon`, `authenticated`, `service_role` | `jsonb` | Published Profile Status | Yes (30 req/min) | **Zero PII**: Private athlete contacts masked, minor consent verified, drafts hidden. |
| `reserve_venue_slot_atomic` | `anon`, `authenticated`, `service_role` | `jsonb` | Derived `auth.uid()` or Guest | Yes (20 req/min) | **Zero PII**: Returns voucher token and reservation ref to caller only. |

---

## 3. Detailed Remediation: `get_listing_subscription_by_order`

### 3.1 Defect Analysis
In migration `20261108110000`, the function was defined as:
```sql
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(p_order_id text)
RETURNS SETOF public.listing_subscriptions
...
  SELECT * FROM public.listing_subscriptions WHERE order_id = trim(p_order_id) LIMIT 1;
```
Granted to `anon`, this allowed any party to dump customer phone numbers, personal emails, internal user UUIDs, and gateway identifiers simply by querying an order ID.

### 3.2 Corrected Sanitized Implementation
```sql
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
) RETURNS jsonb
...
  -- Authorization check: owner OR access token OR admin
  IF NOT (
    (v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid) OR
    (char_length(v_clean_token) >= 16 AND v_sub.access_token IS NOT NULL AND v_sub.access_token = v_clean_token) OR
    public.is_service_role_or_admin()
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_sub.order_id,
    'listing_name', v_sub.listing_name,
    'listing_type', v_sub.listing_type,
    'plan_id', v_sub.plan_id,
    'plan_name', v_sub.plan_name,
    'is_active', v_sub.is_active,
    'starts_at', v_sub.starts_at,
    'expires_at', v_sub.expires_at,
    'payment_status', v_sub.payment_status
  );
```
- Unauthorized callers receive `NULL`.
- Customer phone, customer email, internal user IDs, payment IDs, and metadata are excluded.

---

## 4. Detailed Remediation: `get_venue_booking_voucher`

### 4.1 Defect Analysis
Previous implementations accepted `(booking_ref, customer_phone)` and returned raw customer rows, exposing customer telephone numbers to enumeration.

### 4.2 Corrected High-Entropy Voucher Authorization
1. When a reservation is created, `reserve_venue_slot_atomic` generates a cryptographically secure 128-bit token:
   ```sql
   v_voucher_token := encode(gen_random_bytes(16), 'hex');
   ```
2. To retrieve a voucher, the caller must supply:
   - Authenticated session matching `user_id = auth.uid()`
   - OR the exact `voucher_token` matching the stored token
   - OR `service_role` / admin privileges
3. Brute force attempts are throttled by `check_and_increment_rate_limit('booking_lookup:' || v_clean_ref, 15, 60)`.
4. The customer's full phone number and email are completely omitted. Customer name is masked for third-party inspection (e.g. `R***n S***a`).

---

## 5. Preservation of Guest Functionality

KhelGrid operates an inclusive grassroots sports directory where recreational athletes frequently reserve grounds without creating accounts.
1. **Guest Booking Preserved**: Guests can reserve slots via `reserve_venue_slot_atomic` with `user_id IS NULL`.
2. **Guest Voucher Access Preserved**: The reserving guest receives the `voucher_token` in the initial RPC response. The browser uses this high-entropy token to view, print, or bookmark the confirmed pass.
3. **Guest Availability Preserved**: `get_booked_slots_for_venue` remains open to `anon` to display court availability grids without exposing any guest information.
