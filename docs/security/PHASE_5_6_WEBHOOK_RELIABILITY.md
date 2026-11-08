# KhelGrid Security Programme — Phase 5.6
## Webhook Reliability, Replay Protection & Concurrency Architecture

> **Document ID:** SEC-ARCH-WEBHOOK-RELIABILITY  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Edge Function:** `supabase/functions/razorpay-webhook/index.ts`  
> **Database Procedures:** `public.claim_webhook_event`, `public.finalize_webhook_event`  
> **Target Database:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
> **Production Status:** `https://khelgrid.com/` — Strictly Out of Scope / 100% Untouched  
> **Date:** November 8, 2026  

---

## 1. Webhook Concurrency Vulnerabilities in Prior Architecture

The Phase 5.5 webhook implementation exhibited two critical flaws:
1. **Time-of-Check to Time-of-Use (TOCTOU) Race Condition**: A `SELECT` query verified whether an event was previously recorded. If two concurrent HTTP deliveries arrived for the same event, both saw no record and both proceeded to execute the settlement RPC.
2. **Non-Deterministic Event ID Fallback**: When `x-razorpay-event-id` was omitted by the gateway, the fallback used `Date.now()`. Since every delivery retry occurs at a different millisecond, each retry received a new event ID, defeating deduplication completely.

---

## 2. Robust Event-Processing State Machine

To guarantee exactly-once execution, event processing is governed by an explicit state machine:

```
                  ┌────────────────────────┐
                  │        Incoming        │
                  │     Webhook Event      │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │   Verify HMAC-SHA256   │
                  │   (Raw Body + Secret)  │
                  └───────────┬────────────┘
                              │ Valid
                              ▼
                  ┌────────────────────────┐
                  │   claim_webhook_event  │◄─────────────────┐
                  └───────────┬────────────┘                  │
                              │                               │ Reclaim after
             ┌────────────────┼────────────────┐              │ 2-minute timeout
             ▼                ▼                ▼              │ or retry
        [claimed]    [already_processed]  [processing]        │
             │                │                │              │
             │                │ Return 200     │ Return 429/503│
             │                │ (No settlement)│ (Retry later)│
             ▼                                                │
   ┌───────────────────┐                                      │
   │ Execute Canonical │                                      │
   │    Settlement     │                                      │
   └─────────┬─────────┘                                      │
             │                                                │
       ┌─────┴─────┐                                          │
       ▼           ▼                                          │
   [Success]    [Failure]                                     │
       │           │                                          │
       │           ▼                                          │
       │     finalize_webhook_event                           │
       │     (status: failed_retryable) ──────────────────────┘
       ▼
  finalize_webhook_event
  (status: processed)
       │
       ▼ Return 200 OK
```

---

## 3. Database Procedures Contract

### 3.1 `public.claim_webhook_event`
- **Execution Grant**: `service_role` ONLY.
- **Inputs**: `p_event_id text`, `p_event_type text`, `p_order_id text`, `p_payment_id text`, `p_payload_summary jsonb`.
- **Logic**:
  1. Executes `INSERT INTO public.payment_webhook_events (event_id, event_type, status, ...) VALUES (..., 'processing', ...) ON CONFLICT (event_id) DO NOTHING;`
  2. If row was inserted (`FOUND == true`), claim is granted (`status: 'claimed'`).
  3. If row exists: selects row `FOR UPDATE`.
     - If `status == 'processed'` -> returns `already_processed`.
     - If `status == 'ignored'` -> returns `ignored`.
     - If `status == 'processing'` and `updated_at > now() - interval '2 minutes'` -> returns `processing_in_flight` (worker active).
     - If `status == 'failed_retryable'` OR previous worker timed out (> 2 min) -> transitions status to `processing`, increments `retry_count`, returns `reclaimed_for_retry`.

### 3.2 `public.finalize_webhook_event`
- **Execution Grant**: `service_role` ONLY.
- **Inputs**: `p_event_id text`, `p_status text` (`'processed'` | `'failed_retryable'` | `'ignored'`), `p_error_message text`, `p_settlement_data jsonb`.
- **Logic**:
  - Updates `public.payment_webhook_events` to terminal or retryable state.
  - If `p_status == 'processed'`, sets `processed_at = now()`.
  - Appends sanitized settlement outcome into `payload_summary`.

---

## 4. Deterministic Event Identification

When the HTTP header `x-razorpay-event-id` is absent, the Edge Function extracts `event.event_id` or `event.id` from the payload.
If both header and payload IDs are absent, the system derives a deterministic identifier:
$$\text{Event ID} = \text{"body\_hash\_"} + \text{SHA-256}(\text{raw\_body})$$
Because all delivery retries transmit the identical signed raw body, this guarantees that retries share the same identifier, preserving idempotency without relying on system timestamps.

---

## 5. Audit & Data Minimization

- Webhook payloads stored in `payload_summary` are strictly sanitized:
  - Extracted fields: `order_id`, `payment_id`, `amount`, `currency`, `event_type`, `settled_at`.
  - Customer phone numbers, email addresses, payment signatures, and sensitive metadata are never stored in webhook event logs.
