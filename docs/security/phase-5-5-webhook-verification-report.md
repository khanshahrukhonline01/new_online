# KhelGrid Security Programme — Phase 5.5 Webhook Verification Report

**Document ID:** `KG-SEC-PHASE-5-5-WEBHOOK-REPORT`  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Target Environment:** Development Supabase Project `hznsbxvovjxvmnchzzqt`  
**Production Site:** `https://khelgrid.com/` — **STRICTLY OUT OF SCOPE / 100% UNTOUCHED**  
**Date:** November 8, 2026  

---

## 1. Executive Summary

Phase 5.5 resolves a critical cryptographic bug in the Phase 5.4 webhook implementation:
Previously, the webhook Edge Function verified `X-Razorpay-Signature` over the raw request body using `RAZORPAY_WEBHOOK_SECRET`, but then forwarded `webhookSignature` to the database procedure `verify_payment_transaction`, which expected an HMAC of `order_id|payment_id` signed with `key_secret`. Because these are different cryptographic messages, webhook settlement failed unconditionally.

Phase 5.5 cleanly decouples checkout and webhook settlement pathways, introduces event idempotency tracking in `public.payment_webhook_events`, and prevents replay attacks.

---

## 2. Webhook Verification Architecture

```
[Razorpay Webhook POST]
       │
       ▼ (1) Header: X-Razorpay-Signature & Raw Request Body
[Razorpay-Webhook Edge Function]
       │  (2) Verify HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
       │  (3) Query payment_webhook_events(event_id)
       │      ├─ If exists: Return 200 OK { status: 'already_processed' }
       │      └─ If new: Proceed
       │  (4) Parse JSON event ('payment.captured' / 'order.paid')
       │  (5) Verify payment status == 'captured'
       │  (6) Invoke settle_payment_transaction(p_verification_source: 'webhook_verified')
       ▼
[Canonical Database Settlement RPC] (SERVICE_ROLE ONLY)
       │  (7) Settle khelgrid_payments & activate targets atomically
       ▼
[Insert event_id into payment_webhook_events] ──► Return 200 OK to Razorpay
```

---

## 3. Webhook Controls & Protections

1. **Raw Body Cryptographic Verification:**
   - Raw HTTP text body is captured before JSON parsing to preserve exact whitespace and encoding.
   - Timing-safe HMAC-SHA256 validation against server-held secret `RAZORPAY_WEBHOOK_SECRET`.
   - Rejection of invalid signatures with HTTP 400 without modifying database state.
2. **Event Idempotency & Deduplication:**
   - Table `public.payment_webhook_events` tracks all processed event IDs (`event_id text PRIMARY KEY`).
   - Duplicate deliveries (network retries, gateway replay) return HTTP 200 `already_processed` immediately, preventing duplicate accounting.
3. **Transient Failure Handling:**
   - On transient database settlement failure, returns HTTP 500 so Razorpay automatically schedules exponential backoff retries.
4. **PII and Secret Shielding:**
   - Full request payloads, secret keys, customer phone numbers, and signatures are never output to application logs.
