# KhelGrid Security Programme — Phase 5.2: Cryptographic Payment Verification & Gateway Integrity Report

> **Document ID:** SEC-P52-PAY-001  
> **Status:** Implemented in code | Verified in Isolated PostgreSQL 17  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** `hznsbxvovjxvmnchzzqt` (Development)  
> **Migration File:** `supabase/migrations/20261108100000_phase5_2_critical_remediation_and_closure.sql`  

---

## 1. Executive Summary & Defect Remediation

In earlier iterations (PR #178), `public.verify_payment_transaction` accepted a parameter `p_gateway_signature`, but **did not execute cryptographic verification**. Furthermore, client-side requests could submit payments with arbitrary status flags (`status: 'completed'`), creating an exploitable loophole where orders could be marked settled without actual funds transfer.

Phase 5.2 completely redesigns the payment architecture according to official payment gateway specifications (Razorpay HMAC-SHA256), strictly bounds execution to `service_role` from verified webhook boundaries, and guarantees that client-created records are forced to `'pending'`.

---

## 2. Cryptographic Verification Architecture

```
[Browser / Client Checkout]
           │
           ▼
    record_payment_transaction(...)
    Status hardcoded to 'pending' (p_amount validated > 0, currency = 'INR')
           │
           ▼
    [Payment Gateway Callback / Webhook]
           │
           ▼ (HTTPS POST to Verified Webhook Handler with razorpay_signature)
    [Server-Side Webhook Handler (service_role)]
           │
           ▼
    verify_payment_transaction(...)
           │
           ├── 1. Caller Check: strictly service_role (JWT claim role)
           ├── 2. Identifier Check: order_id & payment_id non-empty
           ├── 3. Secret Lookup: private.gateway_credentials (provider = 'razorpay')
           │      └── If secret is unconfigured -> FAIL CLOSED (GATEWAY_NOT_CONFIGURED)
           ├── 4. HMAC Calculation: HMAC_SHA256(order_id + "|" + payment_id, secret)
           ├── 5. Constant-time Signature Match: compare against p_gateway_signature
           │      └── If mismatch -> FAIL CLOSED (INVALID_SIGNATURE)
           ├── 6. Amount Integrity: exact match against original order amount_paisa
           ├── 7. Duplicate Check: payment_id not previously used on different order
           └── 8. Atomic Settlement: status: 'pending' -> 'completed'
```

---

## 3. Strict Rules Enforced in PostgreSQL

1. **Official Signature Specification**:
   Signature calculation follows the official Razorpay merchant integration standard:
   $$\text{Generated Signature} = \text{HMAC-SHA256}(\text{order\_id} \parallel \text{"|"} \parallel \text{payment\_id}, \text{key\_secret})$$
   Evaluated inside PostgreSQL using `extensions.pgcrypto`:
   ```sql
   v_payload := trim(p_order_id) || '|' || trim(p_payment_id);
   v_expected_signature := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');
   ```
2. **Fail-Closed on Unconfigured Gateway**:
   If `private.gateway_credentials` does not contain an active Razorpay key secret, the database **strictly refuses to settle payment**:
   ```sql
   IF v_secret IS NULL OR trim(v_secret) = '' THEN
       RETURN jsonb_build_object(
           'status', 'error',
           'error_code', 'GATEWAY_NOT_CONFIGURED',
           'message', 'Live payment gateway secret is not configured in private.gateway_credentials. Payment remains pending.'
       );
   END IF;
   ```
   Payment records remain in `'pending'` state until real credentials are provided.
3. **Replay & Concurrency Defense**:
   - If an order is already `'completed'`, subsequent attempts fail with `ALREADY_COMPLETED`.
   - Payment ID uniqueness across all orders prevents re-using a genuine payment receipt on multiple checkout attempts (`DUPLICATE_PAYMENT_ID`).
   - Monotonic transition (`WHERE id = v_payment.id AND status = 'pending'`) with `ROW_COUNT` check prevents race conditions.

---

## 4. Verification Evidence

- **Isolated PostgreSQL 17 Test Suite** (`src/integrations/supabase/database-security-isolated-postgres.test.ts`):
  - `SEC-TEST-ISO-02`: Tested unverified gateway attempt -> failed closed with `GATEWAY_NOT_CONFIGURED`.
  - `SEC-TEST-ISO-02`: Tested verified signature -> transitioned cleanly to `completed`.
  - `SEC-TEST-ISO-02`: Replay attempt on settled transaction -> rejected with `ALREADY_COMPLETED`.
  - `SEC-TEST-ISO-02`: Mismatched amount attempt -> rejected with `AMOUNT_MISMATCH`.
