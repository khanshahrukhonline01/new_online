# KhelGrid Security Programme — Phase 5.5 Payment Integration Audit Matrix

**Document ID:** `KG-SEC-PHASE-5-5-AUDIT`  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Target Branch:** `security/phase-5-5-payment-gateway-integration`  
**Base Commit:** `cd80be632b0818694c05f74c48fae443fc1ab3fa`  
**Date:** November 8, 2026  

---

## 1. Executive Summary

Following the merge of Phase 5.4 (PR #182), a deep architectural audit of the payment gateway integration, database procedures, Edge Functions, and frontend services was conducted. While Phase 5.4 successfully eliminated client signature-length spoofing and closed direct table mutations, critical architectural defects remained in:
1. Privileged settlement RPC execution permissions (`anon` execution).
2. Webhook cryptographic verification vs checkout verification signature mismatch.
3. Silent bypass of authoritative amount verification.
4. Conflation of venue listing subscription plans (`venues.plan_price`) with court slot booking hourly tariffs.
5. Client-controlled activation bypass in `recordListingSubscription` (`serverVerified === true`).
6. Premature local storage persistence and PII/signature leakage in `recordPaymentTransaction`.

---

## 2. Precise Vulnerability & Remediation Matrix

| # | Component | Function / Entity | Severity | Vulnerability Description | Remediation Architecture | Regression Test |
|---|---|---|:---:|---|---|---|
| **V1** | Database Migration (`20261108120000`) | `verify_payment_signature_and_settle` | **CRITICAL** | `GRANT EXECUTE` was given to `anon` and `authenticated`. Untrusted browsers could invoke privileged payment settlement directly via PostgREST RPC. | Revoke execute from `PUBLIC`, `anon`, and `authenticated`. Grant strictly to `service_role`. Route browser checkout verification exclusively through the `verify-razorpay-payment` Edge Function. | `test('anon execution denied on settlement RPC')` |
| **V2** | Edge Function | `razorpay-webhook/index.ts` | **CRITICAL** | Webhook verified raw body HMAC against `RAZORPAY_WEBHOOK_SECRET`, but then passed `x-razorpay-signature` into `verify_payment_transaction`, which expects `order_id|payment_id` HMAC signed with `key_secret`. Webhook settlement failed cryptographically. | Separate checkout and webhook settlement pathways. Canonical procedure `settle_payment_transaction` accepts `p_verification_source = 'webhook_verified'` from authenticated `service_role` Edge Function. | `test('webhook event settles payment without checkout HMAC collision')` |
| **V3** | Database Procedure & Edge Function | `verify_payment_transaction` | **HIGH** | `p_expected_amount_paisa` defaulted to 0. If omitted or passed as 0 by caller, amount verification was silently skipped, permitting underpayment tampering. | Derive authoritative expected amount directly from locked `khelgrid_payments` record in database. Reject any mismatch between gateway amount and database order amount. | `test('amount mismatch strictly rejected')` |
| **V4** | Database Procedure | `reserve_venue_slot_atomic` | **HIGH** | Authoritative booking price was resolved from `venues.plan_price`, which is the B2B monthly listing subscription tariff (₹499), not the court hourly rate (₹800/hr). | Add explicit `slot_hourly_fee` to `venues` and check `venue_courts.hourly_price_paise`. Decouple venue booking fees from listing subscription fees. | `test('court booking tariff resolved from slot_hourly_fee')` |
| **V5** | Frontend Service | `recordListingSubscription()` | **HIGH** | Function evaluated `input.serverVerified === true` and `input.paymentStatus === 'paid'`. Untrusted browser could self-activate paid listing subscriptions locally upon remote failure. | Remove `serverVerified` as an authorization mechanism. Paid subscriptions initialize strictly as `pending_verification`. Activation occurs only via canonical server settlement. | `test('client serverVerified boolean rejected')` |
| **V6** | Frontend Service | `recordPaymentTransaction()` | **MEDIUM** | Updated `localStorage` before awaiting remote persistence response; persisted raw `gatewaySignature` and unmasked `customerPhone` in browser storage. | Await remote RPC response; return failure if remote sync fails; never store gateway signatures in browser storage; minimize customer PII. | `test('no signature or raw phone in local storage')` |
| **V7** | Edge Function & Schema | `razorpay-webhook/index.ts` | **MEDIUM** | Missing webhook event deduplication. Duplicate webhook delivery or retries could cause race conditions or duplicate processing. | Introduce `public.payment_webhook_events(event_id, event_type, ...)` table. Idempotently return 200 for previously processed events. | `test('duplicate webhook delivery returns already_processed')` |

---

## 3. Authoritative Payment Architecture Contract

```
[Browser Client]
       │
       ▼ (1) POST /functions/v1/verify-razorpay-payment
[Verify-Razorpay Edge Function]
       │  (2) Verify HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
       │  (3) Verify captured status via Razorpay Server API (if configured)
       │  (4) Invoke settle_payment_transaction via SERVICE_ROLE
       ▼
[Canonical Database Settlement RPC: settle_payment_transaction] (service_role ONLY)
       │  (5) SELECT ... FOR UPDATE (Lock payment record)
       │  (6) Verify order in pending state & payment_id not allocated elsewhere
       │  (7) Authoritative amount & currency verification
       │  (8) ATOMIC TRANSACTION:
       │        UPDATE khelgrid_payments SET status = 'completed'
       │        UPDATE venue_bookings SET status = 'confirmed', payment_status = 'paid'
       │        UPDATE listing_subscriptions SET is_active = true, payment_status = 'paid'
       ▼
[200 OK Response] ──► Browser marks payment verified & displays receipt
```

```
[Razorpay Webhook Server]
       │
       ▼ (1) POST /functions/v1/razorpay-webhook (with X-Razorpay-Signature)
[Razorpay-Webhook Edge Function]
       │  (2) Verify HMAC-SHA256(rawRequestBody, RAZORPAY_WEBHOOK_SECRET)
       │  (3) Check payment_webhook_events(event_id) (Idempotency)
       │  (4) If event in ('payment.captured', 'order.paid'), verify status == 'captured'
       │  (5) Invoke settle_payment_transaction(p_verification_source: 'webhook_verified') via SERVICE_ROLE
       ▼
[Canonical Database Settlement RPC] (service_role ONLY)
       │  (6) Executes same atomic settlement as checkout path
       ▼
[Record event_id in payment_webhook_events] ──► Return 200 OK to Razorpay
```
