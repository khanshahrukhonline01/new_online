# KhelGrid Security Programme — Phase 5.4 Booking Lifecycle Report
## Venue Booking State Machine, Concurrency Model & Server-Authoritative Lifecycle

> **Document ID:** SEC-P54-BOOKING-001  
> **Status:** Implemented & Verified  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** `hznsbxvovjxvmnchzzqt` (Development Supabase Project)  
> **Production Target:** `https://khelgrid.com/` — STRICTLY OUT OF SCOPE (0 modifications)  

---

## 1. Objective & Architectural Scope

The venue booking subsystem in KhelGrid manages court and turf reservations across partner sports facilities in India. Historical vulnerabilities identified in Phase 5.3 and re-audited in Phase 5.4 included:
1. Client-side price tampering via fallback table insertions.
2. Treatment of temporary 15-minute holds (`status: 'pending'`) as confirmed vouchers in UI components.
3. Lack of request idempotency causing retries to trigger concurrency conflicts.
4. Conflation of expired reservations with explicit user cancellations.

This document formalizes the canonical booking lifecycle, state machine, concurrency invariants, and voucher authorization model for `public.venue_bookings`.

---

## 2. Canonical State Machine

```
                               [Player Checkout Request]
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
                [Online Payment]                      [Pay at Ground]
                        │                                     │
                        ▼ (Atomic Hold)                       ▼
                ┌───────────────┐                     ┌───────────────┐
                │    PENDING    │                     │   CONFIRMED   │
                │(15-min hold)  │                     │(Pay at Venue) │
                └───────┬───────┘                     └───────┬───────┘
                        │                                     │
           ┌────────────┼────────────┐                        │
           ▼            ▼            ▼                        │
     [HMAC Verified] [Expired]  [Cancelled]                   │
           │            │            │                        │
           ▼            ▼            ▼                        ▼
    ┌─────────────┐ ┌─────────┐ ┌───────────┐         ┌───────────────┐
    │  CONFIRMED  │ │ EXPIRED │ │ CANCELLED │         │   COMPLETED   │
    │(Paid Online)│ │ (Freed) │ │  (Freed)  │         │ (Match Done)  │
    └──────┬──────┘ └─────────┘ └───────────┘         └───────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
[Match Done] [Refunded]
     │           │
     ▼           ▼
┌─────────┐ ┌──────────┐
│COMPLETED│ │ REFUNDED │
└─────────┘ └──────────┘
```

### Detailed State Definitions

| State | Hold / Lock | Payment Status | Voucher Validity | Slot Availability | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`pending`** | Active (15m) | `pending` | **Invalid** | **Locked** | Temporary reservation hold awaiting gateway payment verification. Releases automatically at `expires_at`. |
| **`confirmed`** | Durable | `paid` or `pay_at_venue` | **Valid Voucher** | **Locked** | Confirmed reservation backed by verified gateway settlement or documented pay-at-ground policy. |
| **`completed`** | Historical | `paid` or `pay_at_venue` | Historical Record | Locked (Historical) | Match session has passed and facility service completed. |
| **`cancelled`** | None | `cancelled` or `pending` | **Invalid** | **Freed** | Reservation cancelled by player or facility before session. Slot immediately unlocked. |
| **`expired`** | None | `pending` or `failed` | **Invalid** | **Freed** | 15-minute temporary reservation hold elapsed without verified payment. Slot immediately freed. |
| **`superseded`** | None | Historical | **Invalid** | **Freed** | Historical duplicate or test record retained for database audit trails. |
| **`refunded`** | None | `refunded` | **Invalid** | **Freed** | Verified refund issued for cancelled paid reservation. Slot remains available for re-booking. |

---

## 3. Concurrency Model & Database Invariants

### 3.1 Partial Unique Index Invariant
Database-level exclusion of overlapping reservations is enforced by:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_concurrency
ON public.venue_bookings (venue_id, slot_date, slot_time, coalesce(court_number, 1))
WHERE status IN ('confirmed', 'pending');
```

### 3.2 Immutable Index Compliance & Expiry Sweeping
PostgreSQL mandates that partial unique index predicates cannot reference volatile functions like `now()`. Therefore:
1. `WHERE expires_at > now()` cannot be placed inside the index predicate.
2. Every invocation of `reserve_venue_slot_atomic()` and `get_booked_slots_for_venue()` executes an in-transaction sweep:
   ```sql
   UPDATE public.venue_bookings
   SET status = 'expired',
       updated_at = now()
   WHERE status = 'pending'
     AND expires_at IS NOT NULL
     AND expires_at < now();
   ```
3. As soon as a row transitions from `pending` to `expired`, it is automatically excluded by the partial index condition `WHERE status IN ('confirmed', 'pending')`, freeing the slot instantly.

### 3.3 Request Idempotency
To prevent network retries from triggering unique constraint collisions or creating duplicate bookings:
- Column `idempotency_key text UNIQUE` is added to `public.venue_bookings`.
- If a client resubmits a reservation request with an identical `p_idempotency_key`, `reserve_venue_slot_atomic` returns the existing reservation record with `'idempotent': true`, preventing duplicate holds or error cascades.

---

## 4. Server-Authoritative Pricing & Court Validation

1. **Rejection of Client Prices**:
   Neither `p_total_amount` nor `p_paid_amount` are accepted as inputs to `reserve_venue_slot_atomic`. The database calculates `total_amount` strictly from `public.venues` records.
2. **Venue Resolution**:
   Matches both slug and UUID:
   ```sql
   SELECT id, slug, name, city, sport, plan_price
   INTO v_venue_record
   FROM public.venues
   WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id))
   LIMIT 1;
   ```
3. **Fail-Closed on Unpriced Venues**:
   If `plan_price IS NULL OR plan_price <= 0`, the transaction aborts with `PRICE_UNRESOLVED`. The server never falls back to arbitrary client amounts.
4. **Court Parameter Sanitization**:
   `court_number` is constrained to $1 \le \text{court} \le 50$, defaulting safely to 1.

---

## 5. Frontend UI State Handling

In `src/modules/venues/VenueDetailPage.tsx` and `src/shared/payments/PaymentCheckoutModal.tsx`:
1. **Never Show Confirmed Voucher for Pending Holds**:
   If a reservation returns `status: 'pending'`, the UI displays a pending checkout modal or holding banner. It never renders "Court Reserved Successfully!" or provides a confirmed pass until payment is cryptographically settled.
2. **Explicit Offline Draft Notification**:
   If the network fails or database persistence is unavailable, the booking returns `status: 'unconfirmed'` with `bookingRef: ''` and `isOfflineDraft: true`. The UI displays an actionable retry banner and warns the user that the court is not locked.
3. **Pay at Ground Clarity**:
   When selecting "Pay at Ground", the server confirms the reservation under the pay-at-venue policy with `payment_status: 'pay_at_venue'`. The pass explicitly states: "Pay at Ground (?amount to match desk upon arrival)".
