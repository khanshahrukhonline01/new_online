# KhelGrid Security Programme — Phase 5.5 Checkout Verification Report

**Document ID:** `KG-SEC-PHASE-5-5-CHECKOUT-REPORT`  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Target Environment:** Development Supabase Project `hznsbxvovjxvmnchzzqt`  
**Production Site:** `https://khelgrid.com/` — **STRICTLY OUT OF SCOPE / 100% UNTOUCHED**  
**Date:** November 8, 2026  

---

## 1. Executive Summary

Phase 5.5 replaces the insecure direct database RPC checkout path with a server-authoritative Edge Function gateway architecture.
Browser clients can no longer invoke privileged settlement procedures directly, nor can they spoof signature length, skip amount checks, or tamper with transaction currencies.

---

## 2. Architecture & Call Flow

```
[Browser Checkout Modal]
       │
       ▼ (1) POST /functions/v1/verify-razorpay-payment
[Verify-Razorpay Edge Function]
       │  (2) Verify timingSafeEqual(HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET), signature)
       │  (3) Query khelgrid_payments using SERVICE_ROLE
       │  (4) Authoritative amount derivation: round(payment.amount * 100) paise
       │  (5) Authoritative currency verification: payment.currency == 'INR'
       │  (6) Invoke settle_payment_transaction(p_verification_source: 'checkout_hmac')
       ▼
[Canonical Settlement Database RPC] (SERVICE_ROLE ONLY)
       │  (7) Lock payment record in transaction (FOR UPDATE)
       │  (8) Replay defense & Duplicate payment_id check
       │  (9) Atomic settlement & target activation (venue_bookings / listing_subscriptions)
       ▼
[200 OK Response] ──► Browser confirms payment & presents verified pass
```

---

## 3. Security Boundary & Controls Enforced

1. **Zero Client Trust on Amount:**
   - In Phase 5.4, `expected_amount_paisa` defaulted to 0, which skipped amount validation in SQL if omitted.
   - In Phase 5.5, the Edge Function queries the authoritative database record for `khelgrid_payments.amount` and derives the exact expected paise (`round(amount * 100)`). If the client supplies an amount that differs by even 1 paisa, it is immediately rejected with HTTP 400 `AMOUNT_MISMATCH`.
2. **Revocation of Public Settlement Grants:**
   - `verify_payment_signature_and_settle` and `settle_payment_transaction` are strictly revoked from `PUBLIC`, `anon`, and `authenticated`.
   - Any attempt by an anonymous or authenticated user to call settlement via PostgREST RPC returns `401 Unauthorized`.
3. **Timing-Safe HMAC Verification:**
   - Web Crypto API (`crypto.subtle`) imports `RAZORPAY_KEY_SECRET` and computes SHA-256 HMAC.
   - Byte-level timing-safe comparison (`timingSafeEqual`) prevents side-channel timing attacks.
4. **Replay & Concurrency Defense:**
   - If an order is already `completed`, the function returns an idempotent success confirmation (`is_already_settled: true`) without re-activating or modifying timestamps.
   - Duplicate `payment_id` values allocated to multiple distinct orders are rejected with `DUPLICATE_PAYMENT_ID`.
