# KhelGrid Security Programme — Phase 5.6
## Independent Razorpay Payment Capture Verification Architecture

> **Document ID:** SEC-ARCH-CAPTURE-VERIFICATION  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Edge Function:** `supabase/functions/verify-razorpay-payment/index.ts`  
> **Target Database:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
> **Production Status:** `https://khelgrid.com/` — Strictly Out of Scope / 100% Untouched  
> **Date:** November 8, 2026  

---

## 1. Threat Model & Gateway State Semantics

A payment gateway checkout lifecycle involves multiple stages:
1. **Order Creation**: Server generates order (`order_...`) with authoritative amount in paise and currency (`INR`).
2. **Client Interaction**: User provides payment details to Razorpay checkout modal.
3. **Authorization**: Gateway reserves funds; returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to browser.
4. **Capture**: Gateway captures authorized funds. For manual capture or asynchronous instruments (e.g. netbanking, certain UPI channels), status may remain `authorized` before moving to `captured`.
5. **Settlement**: Funds move to merchant bank account.

### Vulnerability Identified in Prior Architecture
Relying solely on `HMAC-SHA256(order_id + '|' + payment_id, secret)` verifies that Razorpay issued a checkout callback, but does **not prove the payment is captured**. If payment capture fails, or if the merchant account requires manual capture, or if the payment was voided, settlement in PostgreSQL was executing prematurely.

---

## 2. Hardened Server-Side Verification Workflow

The `verify-razorpay-payment` Edge Function implements a two-tier verification process:

```
[Browser Client]
       │
       ▼ (1) POST /functions/v1/verify-razorpay-payment
[verify-razorpay-payment Edge Function]
       │
       ├─► (2) Checkout HMAC-SHA256 Timing-Safe Verification (Key Secret)
       │       └── If invalid: Reject HTTP 400 (INVALID_SIGNATURE)
       │
       ├─► (3) Authenticated Razorpay API Call (GET /v1/payments/{payment_id})
       │       └── Basic Auth: RAZORPAY_KEY_ID : RAZORPAY_KEY_SECRET
       │       └── Gateway Error / Timeout: Return HTTP 503 (pending_verification)
       │       └── Status == 'authorized': Return HTTP 200 (pending_verification, PAYMENT_AUTHORIZED_NOT_CAPTURED)
       │       └── Status != 'captured': Reject HTTP 400 (PAYMENT_NOT_CAPTURED)
       │       └── Order ID mismatch: Reject HTTP 400 (ORDER_MISMATCH)
       │
       ├─► (4) Database Authoritative Cross-Check (via service_role)
       │       └── Query public.khelgrid_payments FOR UPDATE
       │       └── Amount in paise == authoritative DB amount
       │       └── Currency == authoritative DB currency
       │
       └─► (5) Execute Canonical Settlement RPC (settle_payment_transaction)
               └── p_verification_source = 'gateway_api'
               └── Atomic transition of payment and target booking/subscription
```

---

## 3. Gateway Status Policy

| Razorpay Payment Status | Edge Function Action | HTTP Response | KhelGrid Order / Target Status |
|---|---|---|---|
| `captured` (`captured == true`) | Cross-check amount/currency; proceed to settlement RPC | HTTP 200 `{ success: true, status: 'completed' }` | `completed` (booking `confirmed`, subscription `active`) |
| `authorized` (`captured == false`) | Do not settle; payment awaiting capture | HTTP 200 `{ success: false, status: 'pending_verification', error: 'PAYMENT_AUTHORIZED_NOT_CAPTURED' }` | Retained as `pending_verification` |
| `failed` | Reject payment; no settlement | HTTP 400 `{ success: false, status: 'failed', error: 'PAYMENT_FAILED' }` | Retained as `pending_verification` or `failed` |
| `refunded` | Reject payment; no settlement | HTTP 400 `{ success: false, status: 'failed', error: 'PAYMENT_REFUNDED' }` | Retained in current state |
| Gateway Timeout / 5xx | Fail open to safe pending state | HTTP 503 `{ success: false, status: 'pending_verification', error: 'GATEWAY_TIMEOUT' }` | Retained as `pending_verification` |
| Missing Gateway Credentials | Fail closed to safe pending state | HTTP 503 `{ success: false, status: 'pending_verification', error: 'GATEWAY_NOT_CONFIGURED' }` | Retained as `pending_verification` |

---

## 4. Verification Evidence & Security Guarantees

1. **No Silent Downgrade**: If Razorpay API verification fails, the function never bypasses capture verification or marks the transaction as complete.
2. **Order Integrity**: The payment entity's `order_id` returned by Razorpay must match the submitted `order_id` character-for-character.
3. **Exact Amount Matching**: Amount is verified in paise (integer arithmetic) against the database record, preventing rounding errors or fractional manipulation.
4. **No Service-Role Key Exposure**: All administrative calls to the database and gateway occur strictly within the secure Deno runtime.
