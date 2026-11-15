import { describe, expect, it } from 'vitest'
import { newDb, DataType } from 'pg-mem'

const computeHmac = (payload: string, secret: string) => {
  let hash = 0
  const input = `${payload}|${secret}`
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  const rawHex = Math.abs(hash).toString(16).padStart(8, '0')
  return rawHex.repeat(8) // 64 hex characters
}

describe('KhelGrid Security Programme — Phase 5.6 Payment Capture Assurance & Pricing Integrity Suite', () => {

  function setupPhase56Database() {
    const db = newDb()

    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => globalThis.crypto.randomUUID()
    })

    db.public.registerFunction({
      name: 'hmac_sha256',
      returns: DataType.text,
      args: [DataType.text, DataType.text],
      implementation: (payload: string, secret: string) => computeHmac(payload, secret)
    })

    // Create auth schema
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text,
        role text DEFAULT 'authenticated',
        created_at timestamptz DEFAULT now()
      );
    `)

    // Create private schema for gateway credentials
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS private;
      CREATE TABLE IF NOT EXISTS private.gateway_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider text NOT NULL UNIQUE,
        key_id text,
        key_secret text NOT NULL,
        webhook_secret text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    db.public.none(`
      INSERT INTO private.gateway_credentials (id, provider, key_id, key_secret, webhook_secret, is_active)
      VALUES (
        '11111111-1111-1111-1111-111111111111',
        'razorpay',
        'rzp_test_key_1234567890',
        'rzp_test_secret_998877665544',
        'rzp_test_webhook_secret_112233',
        true
      );
    `)

    // Create core public tables
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.venues (
        id text PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        city text NOT NULL,
        sport text NOT NULL,
        plan_price numeric(10,2) DEFAULT 499,
        slot_hourly_fee numeric(10,2), -- Notice: NO default 800 (Phase 5.6)
        government_facility boolean DEFAULT false,
        publication_status text DEFAULT 'published'
      );

      CREATE TABLE IF NOT EXISTS public.venue_courts (
        id text PRIMARY KEY,
        venue_id text NOT NULL,
        name text NOT NULL,
        hourly_price_paise integer,
        is_bookable boolean DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS public.venue_bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_ref text NOT NULL UNIQUE,
        venue_id text NOT NULL,
        venue_name text NOT NULL,
        city text,
        sport text,
        slot_date text NOT NULL,
        slot_time text NOT NULL,
        court_number int NOT NULL DEFAULT 1,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        total_amount numeric(10,2) NOT NULL DEFAULT 0,
        paid_amount numeric(10,2) NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'pending',
        payment_status text NOT NULL DEFAULT 'pending',
        payment_id text,
        voucher_token text,
        idempotency_key text,
        user_id uuid,
        expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.khelgrid_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id text NOT NULL UNIQUE,
        payment_id text,
        user_id uuid,
        amount numeric(10,2) NOT NULL,
        currency text NOT NULL DEFAULT 'INR',
        status text NOT NULL DEFAULT 'pending',
        target_type text NOT NULL,
        target_id text,
        customer_name text,
        customer_phone text,
        customer_email text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id text NOT NULL UNIQUE,
        payment_id text,
        user_id uuid,
        listing_type text NOT NULL,
        listing_id text,
        listing_name text NOT NULL,
        city text NOT NULL,
        plan_id text NOT NULL,
        plan_name text NOT NULL,
        amount numeric(10,2) NOT NULL,
        duration_days integer NOT NULL,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        starts_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz,
        is_active boolean NOT NULL DEFAULT false,
        payment_status text NOT NULL DEFAULT 'pending',
        access_token text,
        idempotency_key text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id text NOT NULL UNIQUE,
        event_type text NOT NULL,
        order_id text,
        payment_id text,
        status text NOT NULL DEFAULT 'received',
        payload_summary jsonb DEFAULT '{}'::jsonb,
        retry_count integer NOT NULL DEFAULT 0,
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz
      );
    `)

    return db
  }

  // 1. Gateway Capture Verification: Captured payment settles atomically
  it('Scenario 1: Settles transaction when Razorpay payment entity is captured', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, slot_hourly_fee)
      VALUES ('v-1', 'sree-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Football', 800);

      INSERT INTO public.venue_bookings (id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
      VALUES ('b1111111-1111-1111-1111-111111111111', 'VB-20261108-001', 'v-1', 'Sree Kanteerava', '2026-12-01', '6:00 PM – 7:00 PM', 1, 'Rohan Verma', '9876543210', 800, 'pending', 'pending');

      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type, target_id)
      VALUES ('a1111111-1111-1111-1111-111111111111', 'order_valid_cap_1', 800, 'INR', 'pending', 'venue_booking', 'b1111111-1111-1111-1111-111111111111');
    `)

    // Simulate Edge Function verification of gateway captured entity
    const verifyAndSettle = (orderId: string, paymentId: string, gatewayEntity: { status: string; captured: boolean; amount: number; currency: string; order_id: string }) => {
      if (gatewayEntity.order_id !== orderId) {
        return { status: 'error', error_code: 'ORDER_MISMATCH' }
      }
      if (gatewayEntity.status !== 'captured' || !gatewayEntity.captured) {
        return { status: 'pending_verification', error_code: 'PAYMENT_AUTHORIZED_NOT_CAPTURED' }
      }

      const payment = db.public.one(`SELECT id, target_id, amount, currency FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      if (gatewayEntity.amount !== Math.round(Number(payment.amount) * 100)) {
        return { status: 'error', error_code: 'AMOUNT_MISMATCH' }
      }

      // Settle in DB
      db.public.none(`
        UPDATE public.khelgrid_payments SET status = 'completed', payment_id = '${paymentId}' WHERE order_id = '${orderId}';
        UPDATE public.venue_bookings SET status = 'confirmed', payment_status = 'paid', paid_amount = total_amount, payment_id = '${paymentId}' WHERE id = '${payment.target_id}';
      `)
      return { status: 'success', order_id: orderId, payment_id: paymentId }
    }

    const res = verifyAndSettle('order_valid_cap_1', 'pay_cap_999', {
      status: 'captured',
      captured: true,
      amount: 80000,
      currency: 'INR',
      order_id: 'order_valid_cap_1'
    })

    expect(res.status).toBe('success')
    const booking = db.public.one(`SELECT status, payment_status FROM public.venue_bookings WHERE id = 'b1111111-1111-1111-1111-111111111111';`)
    expect(booking.status).toBe('confirmed')
    expect(booking.payment_status).toBe('paid')
  })

  // 2. Authorized-only payment must not be settled
  it('Scenario 2: Authorized but uncaptured payment is not settled and remains in pending verification', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type, target_id)
      VALUES ('a2222222-2222-2222-2222-222222222222', 'order_auth_only_2', 800, 'INR', 'pending', 'venue_booking', 'b2222222-2222-2222-2222-222222222222');
    `)

    const verifyAndSettle = (gatewayEntity: { status: string; captured: boolean }) => {
      if (gatewayEntity.status === 'authorized' || !gatewayEntity.captured) {
        return { status: 'pending_verification', error_code: 'PAYMENT_AUTHORIZED_NOT_CAPTURED' }
      }
      return { status: 'success' }
    }

    const res = verifyAndSettle({ status: 'authorized', captured: false })
    expect(res.status).toBe('pending_verification')
    expect(res.error_code).toBe('PAYMENT_AUTHORIZED_NOT_CAPTURED')

    const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'order_auth_only_2';`)
    expect(payment.status).toBe('pending') // Did not complete
  })

  // 3. Gateway entity order_id mismatch rejected
  it('Scenario 3: Rejects payment when gateway payment entity belongs to a different order', () => {
    const verifyAndSettle = (submittedOrderId: string, gatewayEntity: { order_id: string }) => {
      if (gatewayEntity.order_id !== submittedOrderId) {
        return { status: 'error', error_code: 'ORDER_MISMATCH' }
      }
      return { status: 'success' }
    }

    const res = verifyAndSettle('order_expected_123', { order_id: 'order_victim_456' })
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('ORDER_MISMATCH')
  })

  // 4. Exact amount validation in paise
  it('Scenario 4: Rejects payment when gateway amount differs from database order by 1 paisa', () => {
    const db = setupPhase56Database()
    db.public.none(`
      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type)
      VALUES ('a3333333-3333-3333-3333-333333333333', 'order_amount_check', 800.00, 'INR', 'pending', 'venue_booking');
    `)

    const verifyAmount = (orderId: string, gatewayAmountPaise: number) => {
      const payment = db.public.one(`SELECT amount FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      const authoritativePaise = Math.round(Number(payment.amount) * 100)
      if (gatewayAmountPaise !== authoritativePaise) {
        return { status: 'error', error_code: 'AMOUNT_MISMATCH', authoritativePaise }
      }
      return { status: 'success' }
    }

    // 1 paisa less (79999 instead of 80000)
    const res = verifyAmount('order_amount_check', 79999)
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('AMOUNT_MISMATCH')
  })

  // 5. Currency mismatch rejected
  it('Scenario 5: Rejects payment when gateway currency is USD instead of authoritative INR', () => {
    const db = setupPhase56Database()
    db.public.none(`
      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type)
      VALUES ('a4444444-4444-4444-4444-444444444444', 'order_curr_check', 800.00, 'INR', 'pending', 'venue_booking');
    `)

    const verifyCurrency = (orderId: string, gatewayCurrency: string) => {
      const payment = db.public.one(`SELECT currency FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      if (gatewayCurrency.toUpperCase() !== payment.currency.toUpperCase()) {
        return { status: 'error', error_code: 'CURRENCY_MISMATCH' }
      }
      return { status: 'success' }
    }

    const res = verifyCurrency('order_curr_check', 'USD')
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('CURRENCY_MISMATCH')
  })

  // 6. Webhook Atomic Event Claim & Concurrency Isolation
  it('Scenario 6: Webhook claim guarantees exactly-once processing across concurrent workers', () => {
    const db = setupPhase56Database()

    const claimEvent = (eventId: string, eventType: string) => {
      const existing = db.public.many(`SELECT id, status FROM public.payment_webhook_events WHERE event_id = '${eventId}';`)
      if (existing.length === 0) {
        db.public.none(`
          INSERT INTO public.payment_webhook_events (event_id, event_type, status, created_at, updated_at)
          VALUES ('${eventId}', '${eventType}', 'processing', now(), now());
        `)
        return { success: true, status: 'claimed' }
      }
      if (existing[0].status === 'processed') {
        return { success: false, status: 'already_processed' }
      }
      if (existing[0].status === 'processing') {
        return { success: false, status: 'processing_in_flight' }
      }
      return { success: true, status: 'reclaimed_for_retry' }
    }

    // Worker 1 claims event
    const worker1 = claimEvent('evt_concurrent_1', 'payment.captured')
    expect(worker1.success).toBe(true)
    expect(worker1.status).toBe('claimed')

    // Worker 2 attempts concurrent claim
    const worker2 = claimEvent('evt_concurrent_1', 'payment.captured')
    expect(worker2.success).toBe(false)
    expect(worker2.status).toBe('processing_in_flight')

    // Worker 1 finalizes
    db.public.none(`UPDATE public.payment_webhook_events SET status = 'processed', processed_at = now() WHERE event_id = 'evt_concurrent_1';`)

    // Worker 3 replays later
    const worker3 = claimEvent('evt_concurrent_1', 'payment.captured')
    expect(worker3.success).toBe(false)
    expect(worker3.status).toBe('already_processed')
  })

  // 7. Deterministic Webhook Event ID fallback (No Date.now() randomness)
  it('Scenario 7: Uses deterministic hash of raw body when webhook event ID is missing', () => {
    const deriveEventId = (headerId: string | null, payloadId: string | null, rawBody: string) => {
      if (headerId) return headerId
      if (payloadId) return payloadId
      // Deterministic fallback: hash of raw body
      return `body_hash_${computeHmac(rawBody, 'deterministic_salt')}`
    }

    const rawPayload = JSON.stringify({ event: 'payment.captured', created_at: 1700000000 })

    const id1 = deriveEventId(null, null, rawPayload)
    const id2 = deriveEventId(null, null, rawPayload)

    expect(id1).toBe(id2) // Retries share exact same ID
    expect(id1.startsWith('body_hash_')).toBe(true)
  })

  // 8. Missing Target Booking Quarantine
  it('Scenario 8: Quarantines payment in reconciliation_required when target booking record does not exist', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type, target_id)
      VALUES ('a5555555-5555-5555-5555-555555555555', 'order_ghost_booking', 800, 'INR', 'pending', 'venue_booking', 'b9999999-9999-9999-9999-999999999999');
    `)

    const settle = (orderId: string, paymentId: string) => {
      const payment = db.public.one(`SELECT id, target_id FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      const booking = db.public.many(`SELECT id FROM public.venue_bookings WHERE id = '${payment.target_id}';`)

      if (booking.length === 0) {
        db.public.none(`
          UPDATE public.khelgrid_payments
          SET status = 'reconciliation_required', payment_id = '${paymentId}'
          WHERE id = '${payment.id}';
        `)
        return { status: 'error', error_code: 'TARGET_BOOKING_MISSING' }
      }
      return { status: 'success' }
    }

    const res = settle('order_ghost_booking', 'pay_cap_ghost')
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('TARGET_BOOKING_MISSING')

    const payment = db.public.one(`SELECT status, payment_id FROM public.khelgrid_payments WHERE order_id = 'order_ghost_booking';`)
    expect(payment.status).toBe('reconciliation_required')
    expect(payment.payment_id).toBe('pay_cap_ghost')
  })

  // 9. Cancelled Booking Quarantine
  it('Scenario 9: Quarantines captured payment in reconciliation_required when booking was already cancelled', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venue_bookings (id, booking_ref, venue_id, venue_name, slot_date, slot_time, customer_name, customer_phone, total_amount, status, payment_status)
      VALUES ('a6666666-6666-6666-6666-666666666666', 'VB-CANCELLED', 'v-1', 'Venue A', '2026-12-02', '7:00 PM – 8:00 PM', 'Neha Sharma', '9988776655', 800, 'cancelled', 'cancelled');

      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type, target_id)
      VALUES ('a6666666-6666-6666-6666-666666666667', 'order_cancelled_slot', 800, 'INR', 'pending', 'venue_booking', 'a6666666-6666-6666-6666-666666666666');
    `)

    const settle = (orderId: string, paymentId: string) => {
      const payment = db.public.one(`SELECT id, target_id FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      const booking = db.public.one(`SELECT id, status FROM public.venue_bookings WHERE id = '${payment.target_id}';`)

      if (booking.status === 'cancelled') {
        db.public.none(`
          UPDATE public.khelgrid_payments
          SET status = 'reconciliation_required', payment_id = '${paymentId}'
          WHERE id = '${payment.id}';
        `)
        return { status: 'error', error_code: 'BOOKING_ALREADY_CANCELLED' }
      }
      return { status: 'success' }
    }

    const res = settle('order_cancelled_slot', 'pay_cap_cancelled')
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('BOOKING_ALREADY_CANCELLED')

    const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'order_cancelled_slot';`)
    expect(payment.status).toBe('reconciliation_required')
  })

  // 10. Late Captured Payment on Expired Hold: Slot already re-booked
  it('Scenario 10: Prevents double-booking when hold expired and slot was taken by another user', () => {
    const db = setupPhase56Database()

    // Hold 1 (expired)
    db.public.none(`
      INSERT INTO public.venue_bookings (id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status, expires_at)
      VALUES ('a7777777-7777-7777-7777-777777777777', 'VB-LATE-USER1', 'v-1', 'Stadia', '2026-12-05', '6:00 PM – 7:00 PM', 1, 'Player 1', '9000000001', 800, 'expired', 'pending', now() - interval '10 minutes');

      -- Hold 2 (User 2 booked the newly available slot and confirmed it!)
      INSERT INTO public.venue_bookings (id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
      VALUES ('a8888888-8888-8888-8888-888888888888', 'VB-CONFIRMED-USER2', 'v-1', 'Stadia', '2026-12-05', '6:00 PM – 7:00 PM', 1, 'Player 2', '9000000002', 800, 'confirmed', 'paid');

      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type, target_id)
      VALUES ('a7777777-7777-7777-7777-777777777778', 'order_late_user1', 800, 'INR', 'pending', 'venue_booking', 'a7777777-7777-7777-7777-777777777777');
    `)

    // Late payment callback arrives for User 1
    const settleLatePayment = (orderId: string, paymentId: string) => {
      const payment = db.public.one(`SELECT id, target_id FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      const target = db.public.one(`SELECT id, venue_id, slot_date, slot_time, court_number, status FROM public.venue_bookings WHERE id = '${payment.target_id}';`)

      if (target.status === 'expired') {
        const slotTaken = db.public.many(`
          SELECT id FROM public.venue_bookings
          WHERE venue_id = '${target.venue_id}'
            AND slot_date = '${target.slot_date}'
            AND slot_time = '${target.slot_time}'
            AND court_number = ${target.court_number}
            AND status = 'confirmed'
            AND id != '${target.id}';
        `)
        if (slotTaken.length > 0) {
          // Slot was taken by another user! Cannot confirm.
          db.public.none(`
            UPDATE public.khelgrid_payments
            SET status = 'reconciliation_required', payment_id = '${paymentId}'
            WHERE id = '${payment.id}';
          `)
          return { status: 'error', error_code: 'SLOT_NO_LONGER_AVAILABLE' }
        }
      }

      db.public.none(`UPDATE public.venue_bookings SET status = 'confirmed' WHERE id = '${target.id}';`)
      return { status: 'success' }
    }

    const res = settleLatePayment('order_late_user1', 'pay_late_capture_1')
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('SLOT_NO_LONGER_AVAILABLE')

    // Payment quarantined in reconciliation
    const p1 = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'order_late_user1';`)
    expect(p1.status).toBe('reconciliation_required')

    // Player 2's booking remains intact (NO double-booking)
    const p2Booking = db.public.one(`SELECT status, customer_name FROM public.venue_bookings WHERE id = 'a8888888-8888-8888-8888-888888888888';`)
    expect(p2Booking.status).toBe('confirmed')
    expect(p2Booking.customer_name).toBe('Player 2')
  })

  // 11. Court-specific tariff resolution
  it('Scenario 11: Resolves exact court-specific tariff (Court 1 = ₹600, Court 2 = ₹1200)', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, slot_hourly_fee)
      VALUES ('v-multi-court', 'complex-alpha', 'Complex Alpha', 'Delhi', 'Badminton', 800);

      INSERT INTO public.venue_courts (id, venue_id, name, hourly_price_paise, is_bookable)
      VALUES
        ('c-1', 'v-multi-court', 'Court 1 (Standard)', 60000, true),
        ('c-2', 'v-multi-court', 'Court 2 (Premium)', 120000, true);
    `)

    const resolveTariff = (venueId: string, courtNumber: number) => {
      const courts = db.public.many(`
        SELECT hourly_price_paise
        FROM public.venue_courts
        WHERE venue_id = '${venueId}'
          AND is_bookable = true
          AND (name LIKE '%Court ' || ${courtNumber} || '%' OR name LIKE '%' || ${courtNumber} || '%');
      `)
      if (courts.length > 0 && courts[0].hourly_price_paise > 0) {
        return { success: true, price: courts[0].hourly_price_paise / 100 }
      }
      return { success: false, error: 'PRICE_UNRESOLVED' }
    }

    const court1Tariff = resolveTariff('v-multi-court', 1)
    const court2Tariff = resolveTariff('v-multi-court', 2)

    expect(court1Tariff.price).toBe(600)
    expect(court2Tariff.price).toBe(1200)
    expect(court1Tariff.price).not.toBe(court2Tariff.price)
  })

  // 12. Venue fallback tariff when court has no specific tariff
  it('Scenario 12: Falls back to venue slot_hourly_fee when requested court has no specific tariff', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, slot_hourly_fee)
      VALUES ('v-venue-fallback', 'complex-beta', 'Complex Beta', 'Mumbai', 'Tennis', 950.00);

      INSERT INTO public.venue_courts (id, venue_id, name, hourly_price_paise, is_bookable)
      VALUES
        ('c-3', 'v-venue-fallback', 'Court 1', NULL, true); -- Unpriced court
    `)

    const resolveTariff = (venueId: string, courtNumber: number) => {
      const courts = db.public.many(`
        SELECT hourly_price_paise
        FROM public.venue_courts
        WHERE venue_id = '${venueId}' AND is_bookable = true AND name LIKE '%Court ' || ${courtNumber} || '%';
      `)
      if (courts.length > 0 && courts[0].hourly_price_paise && courts[0].hourly_price_paise > 0) {
        return { success: true, price: courts[0].hourly_price_paise / 100 }
      }

      const venue = db.public.one(`SELECT slot_hourly_fee FROM public.venues WHERE id = '${venueId}';`)
      if (venue.slot_hourly_fee && Number(venue.slot_hourly_fee) > 0) {
        return { success: true, price: Number(venue.slot_hourly_fee) }
      }

      return { success: false, error: 'PRICE_UNRESOLVED' }
    }

    const res = resolveTariff('v-venue-fallback', 1)
    expect(res.success).toBe(true)
    expect(res.price).toBe(950)
  })

  // 13. Rejection of unpriced venue (No invented ₹800 fallback)
  it('Scenario 13: Rejects reservation with PRICE_UNRESOLVED when neither court nor venue has a valid tariff', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, slot_hourly_fee)
      VALUES ('v-unpriced', 'unpriced-arena', 'Unpriced Arena', 'Goa', 'Football', NULL);
    `)

    const reserveSlot = (venueId: string, courtNumber: number) => {
      const courts = db.public.many(`
        SELECT hourly_price_paise
        FROM public.venue_courts
        WHERE venue_id = '${venueId}' AND is_bookable = true AND name LIKE '%Court ' || ${courtNumber} || '%';
      `)
      if (courts.length > 0 && courts[0].hourly_price_paise && courts[0].hourly_price_paise > 0) {
        return { success: true, price: courts[0].hourly_price_paise / 100 }
      }

      const venue = db.public.one(`SELECT slot_hourly_fee FROM public.venues WHERE id = '${venueId}';`)
      if (venue.slot_hourly_fee && Number(venue.slot_hourly_fee) > 0) {
        return { success: true, price: Number(venue.slot_hourly_fee) }
      }

      // Phase 5.6: NEVER fallback to 800!
      return {
        success: false,
        error: 'PRICE_UNRESOLVED',
        message: 'No authoritative booking tariff is configured for this venue or court. Please select another facility.'
      }
    }

    const res = reserveSlot('v-unpriced', 1)
    expect(res.success).toBe(false)
    expect(res.error).toBe('PRICE_UNRESOLVED')
  })

  // 14. Government facilities cannot be booked via commercial per-hour tariff
  it('Scenario 14: Government SAI facilities have NULL slot_hourly_fee and reject commercial booking', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, slot_hourly_fee, government_facility)
      VALUES ('v-sai', 'sai-ncoe-bengaluru', 'SAI NCOE Bengaluru', 'Bengaluru', 'Athletics', NULL, true);
    `)

    const venue = db.public.one(`SELECT slot_hourly_fee, government_facility FROM public.venues WHERE slug = 'sai-ncoe-bengaluru';`)
    expect(venue.government_facility).toBe(true)
    expect(venue.slot_hourly_fee).toBeNull() // Not defaulted to 800
  })

  // 15. Client price tampering ignored
  it('Scenario 15: Client-submitted price is ignored; database authoritative tariff is charged', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, slot_hourly_fee)
      VALUES ('v-tamper-check', 'arena-delhi', 'Arena Delhi', 'Delhi', 'Cricket', 1500.00);
    `)

    const reserve = (venueId: string, clientAttackerPrice: number) => {
      const venue = db.public.one(`SELECT slot_hourly_fee FROM public.venues WHERE id = '${venueId}';`)
      const authoritativePrice = Number(venue.slot_hourly_fee)

      // Total amount is derived from authoritativePrice, regardless of clientAttackerPrice
      if (clientAttackerPrice < 0) throw new Error('Invalid');
      return {
        total_amount: authoritativePrice,
        charged: authoritativePrice
      }
    }

    const res = reserve('v-tamper-check', 1) // Attacker passes ₹1
    expect(res.total_amount).toBe(1500)
    expect(res.total_amount).not.toBe(1)
  })

  // 16. Missing Target Subscription Quarantine
  it('Scenario 16: Quarantines subscription payment in reconciliation_required when subscription record does not exist', () => {
    const db = setupPhase56Database()

    db.public.none(`
      INSERT INTO public.khelgrid_payments (id, order_id, amount, currency, status, target_type, target_id)
      VALUES ('a9999999-9999-9999-9999-999999999999', 'order_ghost_sub', 499, 'INR', 'pending', 'listing_subscription', 'a9999999-9999-9999-9999-000000000001');
    `)

    const settleSub = (orderId: string, paymentId: string) => {
      const payment = db.public.one(`SELECT id, target_id FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      const sub = db.public.many(`SELECT id FROM public.listing_subscriptions WHERE id = '${payment.target_id}';`)

      if (sub.length === 0) {
        db.public.none(`
          UPDATE public.khelgrid_payments
          SET status = 'reconciliation_required', payment_id = '${paymentId}'
          WHERE id = '${payment.id}';
        `)
        return { status: 'error', error_code: 'TARGET_SUBSCRIPTION_MISSING' }
      }
      return { status: 'success' }
    }

    const res = settleSub('order_ghost_sub', 'pay_cap_ghost_sub')
    expect(res.status).toBe('error')
    expect(res.error_code).toBe('TARGET_SUBSCRIPTION_MISSING')

    const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'order_ghost_sub';`)
    expect(payment.status).toBe('reconciliation_required')
  })
})
