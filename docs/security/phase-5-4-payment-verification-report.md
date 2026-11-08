# KhelGrid Security Programme — Phase 5.4 Payment Verification Report
## Cryptographic Payment Verification, Webhook Processing & Transactional Settlement

> **Document ID:** SEC-P54-PAY-001  
> **Status:** Implemented & Verified in Isolated PostgreSQL 17  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** `hznsbxvovjxvmnchzzqt` (Development Supabase Project)  
> **Production Status:** `https://khelgrid.com/` — STRICTLY OUT OF SCOPE (0 modifications)  

---

## 1. Executive Summary

In previous iterations, the frontend checked `signature.length >= 16` or accepted client-declared payment IDs to establish checkout completion. This introduced a critical payment bypass vector where a browser could declare payment success without server-side verification or actual funds transfer.

Phase 5.4 establishes genuine server-authoritative payment verification:
1. **Server-Held Secrets Only**: Razorpay key secrets and webhook secrets reside exclusively in the server environment (`private.gateway_credentials` and Edge Function secrets). They are never exposed to browser bundles.
2. **Cryptographic HMAC-SHA256**: Signatures are calculated using official RFC 2104 HMAC-SHA256 and matched in constant-time.
3. **Fail-Closed on Unconfigured Gateway**: If credentials are missing, the database strictly refuses settlement (`GATEWAY_NOT_CONFIGURED`) and keeps transactions pending.
4. **Transactional Settlement**: Settle payment in `khelgrid_payments` and transition associated venue bookings (`pending` -> `confirmed`) or listing subscriptions (`is_active: false -> true`) in a single ACID transaction.
5. **Replay & Concurrency Defense**: Payment IDs are unique across all orders; repeated webhook deliveries or replay attacks are rejected idempotently (`ALREADY_COMPLETED`).

---

## 2. Server-Authoritative Architecture

```
[Browser Client Checkout]
       │
       ▼
record_payment_transaction(p_order_id, p_amount, ...)
Status forced to 'pending'. Zero client proof of payment.
       │
       ▼
[Razorpay Checkout Callback OR Webhook POST]
       │
       ├─────────────────────────────────────────┐
       ▼ (Direct Callback Verification)          ▼ (Asynchronous Webhook)
[Edge Function: verify-razorpay-payment]   [Edge Function: razorpay-webhook]
       │                                         │
       ├── Reads RAZORPAY_KEY_SECRET             ├── Reads RAZORPAY_WEBHOOK_SECRET
       ├── Calculates HMAC_SHA256                ├── Validates raw request body HMAC
       └── Invokes verify_and_settle_payment     └── Invokes verify_and_settle_payment
                     │
                     ▼
       [PostgreSQL Database: verify_and_settle_payment]
                     │
                     ├── 1. Caller boundary check (service_role only)
                     ├── 2. Order & payment ID validation
                     ├── 3. Secret lookup from private.gateway_credentials
                     ├── 4. Exact amount & currency validation
                     ├── 5. Replay defense (rejects settled orders)
                     ├── 6. Duplicate payment ID defense
                     ├── 7. HMAC-SHA256 signature verification
                     ├── 8. Settle khelgrid_payments (pending -> completed)
                     └── 9. Transactional target activation:
                            ├── If venue booking: pending -> confirmed, expires_at = NULL
                            └── If listing subscription: is_active = true, payment_status = 'paid'
```

---

## 3. Webhook Signature Verification Standard

For asynchronous Razorpay webhooks:
$$\text{Signature} = \text{HMAC-SHA256}(\text{Raw Request Body Bytes}, \text{Webhook Secret})$$

1. The raw request body must be read as raw bytes (`req.text()` or buffer) before any JSON parsing.
2. The signature is provided by the gateway in the `X-Razorpay-Signature` HTTP header.
3. If the header is missing, malformed, or does not match the computed HMAC, the endpoint immediately returns HTTP 400 Bad Request and aborts.

---

## 4. Frontend Corrections

1. **Removal of Signature Length Spoofing**:
   In `src/shared/payments/paymentService.ts`, `verifyPaymentSignature()` no longer checks `signature.length >= 16`. It requires an expected cryptographic hash or backend verification.
2. **Pending Verification by Default**:
   `recordPaymentTransaction()` records all online payments as `'pending_verification'` and returns `status: 'pending_verification'` until server confirmation is received.
3. **No Fake Receipts**:
   Customer receipts and passes are generated with `status: 'pending_verification'` for unverified online payments, indicating that settlement is awaiting gateway confirmation.
4. **Subscription Activation Gate**:
   `recordListingSubscription()` blocks paid plan activation unless the backend confirms verified payment settlement.
