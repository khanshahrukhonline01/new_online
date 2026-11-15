# KhelGrid Security Programme — Phase 5.7 Edge Function Readiness
## Architecture, Secrets Configuration, and Deployment Guidelines

**Target Environment:** Development (`hznsbxvovjxvmnchzzqt`)  
**Production website:** `https://khelgrid.com/` — Strictly out of scope, 100% untouched  

---

## 1. Overview

KhelGrid relies on Supabase Edge Functions for server-authoritative payment operations, specifically Razorpay checkout signature verification and asynchronous webhook handling.

Client browsers must never directly settle payments or mark bookings as paid.

---

## 2. Required Supabase Edge Functions

### 1. `verify-payment`
- **Purpose**: Validates checkout payment signatures returned from Razorpay frontend modal.
- **Trigger**: Client `POST /functions/v1/verify-payment`.
- **Payload**:
  ```json
  {
    "orderId": "order_xxx",
    "paymentId": "pay_xxx",
    "signature": "hex_signature",
    "bookingRef": "VB-xxx",
    "subscriptionOrderId": "sub_order_xxx"
  }
  ```
- **Validation**:
  - Computes `HMAC-SHA256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)`.
  - Performs constant-time comparison against `signature`.
  - Verifies payment status via Razorpay REST API (`GET /v1/payments/{paymentId}`).
  - Confirms `captured === true` and `amount === expected_amount_paise`.
  - Invokes `public.settle_payment_transaction` via `service_role`.

### 2. `razorpay-webhook`
- **Purpose**: Authoritative asynchronous webhook receiver for events (`payment.captured`, `order.paid`).
- **Trigger**: Webhook `POST /functions/v1/razorpay-webhook`.
- **Headers**:
  - `x-razorpay-signature`: HMAC-SHA256 of raw request body using `RAZORPAY_WEBHOOK_SECRET`.
- **Idempotency**:
  - Calls `public.claim_webhook_event(p_event_id, p_event_type, p_payload)`.
  - If event already claimed/finalized, returns HTTP 200 immediately.
  - On settlement success, calls `public.finalize_webhook_event(p_event_id, 'processed')`.

---

## 3. Required Environment Secrets

Configure these secrets in the Supabase Dashboard (`Settings -> Secrets`):

```bash
# Razorpay API Credentials
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Supabase Internal Service Credentials
SUPABASE_URL=https://hznsbxvovjxvmnchzzqt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 4. Deployment Commands

```bash
# Ensure Supabase CLI is linked to development project
supabase link --project-ref hznsbxvovjxvmnchzzqt

# Deploy verification and webhook edge functions
supabase functions deploy verify-payment --no-verify-jwt
supabase functions deploy razorpay-webhook --no-verify-jwt
```
