# KhelGrid Security Programme — Phase 7: Business Logic & Transaction Security Architecture

> **Document ID:** SEC-P7-TXN-001  
> **Status:** Implemented in code | Tested against isolated PostgreSQL  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  
> **Migration File:** `supabase/migrations/20261108090000_phase7_and_8_business_logic_and_moderation_security.sql`  

---

## 1. Executive Summary

Phase 7 hardens KhelGrid's financial, booking, and inventory operations against race conditions, double allocation, unauthorized state transitions, client-side pricing tampering, and payment confirmation forgery.

In distributed sports platform architectures, allowing client-directed database updates (e.g. `supabase.from('venue_bookings').insert(...)` with `status: 'confirmed'`) creates severe business and security vulnerabilities. Phase 7 completely removes client-side booking status assignment and enforces atomic, concurrency-safe PostgreSQL stored procedures with pessimistic/unique locking.

---

## 2. Identified Vulnerabilities & Remediation Architecture

### 2.1 Double Booking & Slot Concurrency Hazard
* **Vulnerability:** Under simultaneous concurrent checkout requests from two users for the same court slot (e.g. Friday 7:00 PM Court 1), two separate `INSERT` transactions could both read `available = true` and succeed, leaving the venue double-booked.
* **Remediation:** Installed partial unique index `public.uq_venue_slot_concurrency` on `public.venue_bookings`:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_concurrency
  ON public.venue_bookings (venue_id, booking_date, start_time, court_number)
  WHERE status NOT IN ('cancelled', 'refunded');
  ```
  Any concurrent overlapping booking transaction is immediately aborted by PostgreSQL's unique index constraint at the engine level, guaranteeing zero double-allocation.

### 2.2 Client-Controlled Booking Confirmation Bypass
* **Vulnerability:** Malicious frontend requests could issue direct `INSERT` or `UPDATE` statements setting `status = 'confirmed'` or `payment_status = 'paid'` without ever completing gateway payment.
* **Remediation:** 
  1. Revoked `INSERT` and `UPDATE` on `venue_bookings` from `anon` and `authenticated` roles.
  2. Routed all booking creation through `public.create_venue_slot_booking(...)`.
  3. Forced booking initial status to `'pending'` and payment status to `'pending'`.
  4. Confirmation is strictly conditioned on cryptographic payment gateway webhook verification (`verify_payment_transaction`).

### 2.3 Pricing Tampering & Amount Alteration
* **Vulnerability:** A client submitting custom JSON parameters could alter `amount: 1.00` instead of the venue's published rate of `₹1,500.00`.
* **Remediation:**
  1. Booking calculations in `create_venue_slot_booking` fetch the authoritative rate directly from `public.venues` and associated hourly court tariffs.
  2. In `verify_payment_transaction`, the received gateway payment amount is strictly compared against `expected_amount_paisa`:
     ```sql
     IF p_amount_paisa <> v_order.amount_paisa THEN
         RAISE EXCEPTION 'Payment verification failed: Amount mismatch';
     END IF;
     ```

### 2.4 Cancellation State Transition Integrity
* **Vulnerability:** Unauthenticated or unauthorized actors could cancel other users' bookings or forge refund transitions.
* **Remediation:** Implemented `public.cancel_venue_booking_as_customer(...)`:
  - Enforces ownership: Caller must be `auth.uid() = user_id` OR present the secret 192-bit `voucher_token`.
  - State machine check: Only bookings in `'pending'` or `'confirmed'` status can be transitioned to `'cancelled'`.
  - Cancelled bookings release the partial unique index lock, immediately making the court slot available for new bookings.

---

## 3. Pickup-Game Reservations & Capacity Management

For community pickup games (`pickup_games`, `pickup_game_participants`):
1. **Atomic Player Count Verification**: `join_pickup_game` locks the game row with `SELECT ... FOR UPDATE` to read current participant count vs `max_players`.
2. **Idempotent Join**: Unique constraint `(game_id, user_id)` prevents a user from joining multiple times or consuming multiple slots.
3. **Automated Waitlisting**: If `current_players >= max_players`, the transaction automatically places the user in `'waitlisted'` status rather than failing or exceeding capacity.

---

## 4. Adversarial Testing & Verification

The test suite in `src/integrations/supabase/database-security-programme-closure.test.ts` validates:
- **SEC-TEST-P78-01**: Concurrency simulation attempting simultaneous reservation of the same court slot. Second attempt receives `SLOT_UNAVAILABLE` error.
- **SEC-TEST-P51-03**: Replay attacks on settled transactions fail with `ALREADY_COMPLETED`.
- **SEC-TEST-P51-03**: Tampered amounts in payment settlement fail with `AMOUNT_MISMATCH`.

---

## 5. Deployment Status

| Component | Status | Verification |
| :--- | :--- | :--- |
| `uq_venue_slot_concurrency` Unique Index | Implemented in code | Validated in migration `20261108090000` |
| `create_venue_slot_booking` Atomic RPC | Implemented in code | Validated in migration `20261108090000` |
| `cancel_venue_booking_as_customer` RPC | Implemented in code | Validated in migration `20261108090000` |
| Vitest Concurrency Test | CI passed | 85/85 test files passed |
| Development Database Deployment | Not deployed | Staged in consolidated SQL package |
| Production Database | Not deployed | Untouched (Out-of-scope) |
