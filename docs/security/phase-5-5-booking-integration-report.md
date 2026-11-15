# KhelGrid Security Programme — Phase 5.5 Booking Integration Report

**Document ID:** `KG-SEC-PHASE-5-5-BOOKING-REPORT`  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Target Environment:** Development Supabase Project `hznsbxvovjxvmnchzzqt`  
**Production Site:** `https://khelgrid.com/` — **STRICTLY OUT OF SCOPE / 100% UNTOUCHED**  
**Date:** November 8, 2026  

---

## 1. Executive Summary

Phase 5.5 resolves a core pricing domain confusion in the venue reservation pipeline:
Previously, `reserve_venue_slot_atomic` derived authoritative booking prices from `public.venues.plan_price`. However, `plan_price` is the B2B monthly listing subscription tariff (₹499) paid by venue owners to list their facility on KhelGrid, NOT the hourly court booking fee paid by players.

Phase 5.5 decouples the court booking tariff from the venue listing plan price, introduces an explicit `slot_hourly_fee` (default ₹800/hr) on `venues`, checks `venue_courts.hourly_price_paise`, and preserves the complete server-authoritative booking lifecycle.

---

## 2. Decoupled Venue Pricing Model

```
┌────────────────────────────────────────────────────────┐
│                   PUBLIC.VENUES TABLE                  │
├──────────────────────────┬─────────────────────────────┤
│   listing_plan: '1_month'│   slot_hourly_fee: ₹800     │
│   plan_price: ₹499       │   (Player Court Booking Fee)│
│   (B2B Listing Tariff)   │                             │
└──────────────────────────┴─────────────────────────────┘
                                      ▲
                                      │ (Fallback if court rate null)
                           ┌──────────┴──────────┐
                           │ PUBLIC.VENUE_COURTS │
                           ├─────────────────────┤
                           │ hourly_price_paise  │
                           └─────────────────────┘
```

When reserving a court:
1. First, check `public.venue_courts.hourly_price_paise / 100` for court-specific rates.
2. Second, fallback to `public.venues.slot_hourly_fee` (standard facility hourly tariff, e.g. ₹800).
3. Third, baseline safety default (₹800).
4. `venues.plan_price` is NEVER used for court reservations.

---

## 3. Booking Lifecycle & Concurrency Controls

1. **Online Gateway Flow:**
   - `reserve_venue_slot_atomic`: creates reservation in `pending` state with `expires_at = now() + interval '15 minutes'`.
   - Concurrency lock: Advisory transaction lock on `(venue_id:slot_date:slot_time:court)`.
   - Partial unique index `uq_venue_slot_concurrency` blocks race conditions.
   - Upon gateway settlement (`settle_payment_transaction`), status transitions to `confirmed` and `payment_status = 'paid'`, clearing `expires_at`.
2. **Pay At Venue Flow:**
   - Explicit path creates booking in `confirmed` state with `payment_status = 'pay_at_venue'`.
   - UI clearly communicates that payment is due at the facility in cash/UPI upon arrival.
3. **In-Transaction Expiry Sweeping:**
   - Both `get_booked_slots_for_venue` and `reserve_venue_slot_atomic` auto-sweep stale pending reservations (`expires_at < now()`) to `expired` inside the transaction.
   - Sweeping releases the slot immediately for other players without waiting for a scheduled cron job.
4. **Voucher Access & Privacy:**
   - `get_venue_booking_voucher`: Requires 192-bit `voucher_token` or owner authentication. Customer phone and email are omitted; customer name is masked (`R***n S***a`).
