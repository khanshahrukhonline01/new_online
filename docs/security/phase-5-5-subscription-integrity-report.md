# KhelGrid Security Programme — Phase 5.5 Subscription Integrity Report

**Document ID:** `KG-SEC-PHASE-5-5-SUB-REPORT`  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Target Environment:** Development Supabase Project `hznsbxvovjxvmnchzzqt`  
**Production Site:** `https://khelgrid.com/` — **STRICTLY OUT OF SCOPE / 100% UNTOUCHED**  
**Date:** November 8, 2026  

---

## 1. Executive Summary

Phase 5.5 completely eliminates client-controlled subscription activation vulnerabilities.
In earlier revisions, the client could pass `serverVerified: true` and `paymentStatus: 'paid'` into `recordListingSubscription()`, which caused the frontend to return `status: 'success'` and activate the subscription locally even if the server database rejected the activation or was offline.

---

## 2. Subscription State Machine & Rules

```
                      [User Submits Plan Order]
                                 │
                                 ▼
                     (pending_verification)
                       is_active: false
                       payment_status: 'pending'
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
   [Payment Succeeded]                       [Payment Expired/Failed]
  Canonical Settlement                      TTL / Hold Cancellation
            │                                         │
            ▼                                         ▼
         (active)                                 (cancelled)
     is_active: true                           is_active: false
   payment_status: 'paid'
            │
            ▼ [Plan Duration Elapsed]
        (expired)
     is_active: false
```

---

## 3. Security Boundary & Controls Enforced

1. **Client Authorization Stripped:**
   - Client parameter `serverVerified` is completely discarded as an authorization check.
   - Any subscription created through the public client API is forced to `is_active = false` and `payment_status = 'pending'`.
2. **Server-Only Activation:**
   - Only `settle_payment_transaction` (executable strictly by `service_role`) can transition `is_active` to `true` and `payment_status` to `'paid'`.
   - Activation occurs in the same database transaction as the payment record settlement.
3. **Price & Plan Validation:**
   - Plans are validated against allowlist (`1_day`, `1_month`, `6_months`, `1_year`, `lifelong`).
   - Expiry dates are calculated authoritatively: `lifelong` has `expires_at = NULL`; time-limited plans add exact interval (`p_duration_days || ' days'`).
4. **Local Storage as Display Cache Only:**
   - Local storage records reflect `is_active: false` until remote server verification succeeds.
   - Local storage is never accepted as evidence of subscription entitlement.
