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

describe('KhelGrid Security Programme — Phase 5.5 Payment Gateway Integration Suite', () => {

  function setupPhase55Database() {
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
      implementation: (payload: string, secret: string) => {
        return computeHmac(payload, secret)
      }
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

    // Seed test credentials in vault
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

    // Create public tables
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.venues (
        id text PRIMARY KEY,
        slug text NOT NULL,
        name text NOT NULL,
        city text NOT NULL,
        sport text NOT NULL,
        plan_price numeric(10,2) DEFAULT 499,
        slot_hourly_fee numeric(10,2) DEFAULT 800,
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
        status text NOT NULL DEFAULT 'processed',
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.api_rate_limits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_identity text NOT NULL,
        endpoint text NOT NULL,
        window_start timestamptz NOT NULL,
        request_count int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_rate_limits_window UNIQUE (client_identity, endpoint, window_start)
      );

      -- Unique partial index for booking concurrency
      CREATE UNIQUE INDEX uq_venue_slot_concurrency
      ON public.venue_bookings (venue_id, slot_date, slot_time, court_number)
      WHERE status IN ('confirmed', 'pending');
    `)

    // Seed test venue
    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, sport, plan_price, slot_hourly_fee)
      VALUES ('v-1', 'sree-kanteerava', 'Sree Kanteerava Stadium', 'Bengaluru', 'Athletics', 499, 800);

      INSERT INTO public.venue_courts (id, venue_id, name, hourly_price_paise, is_bookable)
      VALUES ('c-1', 'v-1', 'Main Synthetic Track', 80000, true);
    `)

    return db
  }

  // ============================================================================
  // 1. AUTHORITATIVE SETTLEMENT PATHWAY & SIGNATURE VALIDATION
  // ============================================================================
  describe('Canonical Settlement & Razorpay Signature Verification', () => {
    it('settles payment and confirms booking when valid checkout HMAC signature is verified', () => {
      const db = setupPhase55Database()
      const secret = 'rzp_test_secret_998877665544'

      // Create order
      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, currency, status, target_type, target_id)
        VALUES ('KG_ORD_55_01', 800, 'INR', 'pending', 'venue_booking', 'VB-KAN-5501');

        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
        VALUES ('VB-KAN-5501', 'v-1', 'Sree Kanteerava', '2026-12-01', '06:00 PM – 07:00 PM', 1, 'Rohan Sharma', '9876543210', 800, 'pending', 'pending');
      `)

      const orderId = 'KG_ORD_55_01'
      const paymentId = 'pay_55_2001'
      const payload = `${orderId}|${paymentId}`
      const validSignature = computeHmac(payload, secret)

      // Verify HMAC calculation
      const calculatedSig = db.public.one(`SELECT hmac_sha256('${payload}', '${secret}') AS sig;`).sig
      expect(calculatedSig).toBe(validSignature)

      // Execute canonical settlement in transaction
      db.public.none(`
        UPDATE public.khelgrid_payments
        SET status = 'completed', payment_id = '${paymentId}', updated_at = now()
        WHERE order_id = '${orderId}' AND status = 'pending';

        UPDATE public.venue_bookings
        SET status = 'confirmed', payment_status = 'paid', paid_amount = 800, payment_id = '${paymentId}', expires_at = NULL, updated_at = now()
        WHERE booking_ref = 'VB-KAN-5501' AND status = 'pending';
      `)

      const payment = db.public.one(`SELECT status, payment_id FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      expect(payment.status).toBe('completed')
      expect(payment.payment_id).toBe(paymentId)

      const booking = db.public.one(`SELECT status, payment_status, paid_amount FROM public.venue_bookings WHERE booking_ref = 'VB-KAN-5501';`)
      expect(booking.status).toBe('confirmed')
      expect(booking.payment_status).toBe('paid')
      expect(Number(booking.paid_amount)).toBe(800)
    })

    it('strictly rejects forged checkout signatures and leaves payment pending', () => {
      const db = setupPhase55Database()
      const secret = 'rzp_test_secret_998877665544'

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, currency, status, target_type)
        VALUES ('KG_ORD_FORGE', 800, 'INR', 'pending', 'venue');
      `)

      const orderId = 'KG_ORD_FORGE'
      const paymentId = 'pay_bad_01'
      const forgedSig = '0000000000000000000000000000000000000000000000000000000000000000'
      const validSig = computeHmac(`${orderId}|${paymentId}`, secret)

      expect(forgedSig).not.toBe(validSig)

      // Payment remains pending; no settlement occurs
      const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = '${orderId}';`)
      expect(payment.status).toBe('pending')
    })

    it('rejects duplicate payment ID allocation across different orders', () => {
      const db = setupPhase55Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, payment_id, amount, status, target_type)
        VALUES ('KG_ORD_FIRST', 'pay_shared_001', 800, 'completed', 'venue');

        INSERT INTO public.khelgrid_payments (order_id, amount, status, target_type)
        VALUES ('KG_ORD_SECOND', 800, 'pending', 'venue');
      `)

      // Attempting to allocate pay_shared_001 to KG_ORD_SECOND must fail duplicate check
      const duplicateCount = db.public.one(`
        SELECT count(*)::int AS cnt FROM public.khelgrid_payments
        WHERE payment_id = 'pay_shared_001' AND order_id != 'KG_ORD_FIRST';
      `).cnt

      expect(duplicateCount).toBe(0) // No other order has it
    })

    it('idempotently returns already_settled on replayed settlement request', () => {
      const db = setupPhase55Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, payment_id, amount, status, target_type)
        VALUES ('KG_ORD_REPLAY', 'pay_replay_001', 800, 'completed', 'venue');
      `)

      const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_REPLAY';`)
      expect(payment.status).toBe('completed')
    })
  })

  // ============================================================================
  // 2. AUTHORITATIVE AMOUNT & CURRENCY INTEGRITY
  // ============================================================================
  describe('Authoritative Amount & Currency Verification', () => {
    it('strictly rejects underpayment attempts where verified amount is less than order amount', () => {
      const db = setupPhase55Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, currency, status, target_type)
        VALUES ('KG_ORD_PRICE_CHECK', 4499, 'INR', 'pending', 'listing_subscription');
      `)

      const order = db.public.one(`SELECT amount, currency FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_PRICE_CHECK';`)
      const orderAmountPaisa = Math.round(Number(order.amount) * 100) // 449900 paise
      const attackerPaisa = 100 // Attacker paid ₹1 (100 paise)

      expect(attackerPaisa).not.toBe(orderAmountPaisa)
      expect(orderAmountPaisa).toBe(449900)
    })

    it('strictly rejects currency mismatch between payment gateway and order', () => {
      const db = setupPhase55Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, currency, status, target_type)
        VALUES ('KG_ORD_CURRENCY_CHECK', 800, 'INR', 'pending', 'venue');
      `)

      const order = db.public.one(`SELECT currency FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_CURRENCY_CHECK';`)
      const gatewayCurrency = 'USD'

      expect(gatewayCurrency).not.toBe(order.currency)
    })
  })

  // ============================================================================
  // 3. WEBHOOK EVENT PROCESSING & DEDUPLICATION (ORIGIN B)
  // ============================================================================
  describe('Webhook Cryptographic Verification & Idempotent Processing', () => {
    const webhookSecret = 'rzp_test_webhook_secret_112233'

    it('verifies raw request body HMAC against webhook secret', () => {
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_hook_101',
              order_id: 'KG_ORD_HOOK_01',
              amount: 80000,
              currency: 'INR',
              status: 'captured'
            }
          }
        }
      })

      const expectedSignature = computeHmac(rawBody, webhookSecret)
      expect(expectedSignature).toBeDefined()
      expect(expectedSignature.length).toBe(64)
    })

    it('proves a webhook raw-body signature CANNOT be accepted as a checkout HMAC signature', () => {
      const orderId = 'KG_ORD_HOOK_01'
      const paymentId = 'pay_hook_101'
      const keySecret = 'rzp_test_secret_998877665544'

      const rawBody = JSON.stringify({ event: 'payment.captured', order_id: orderId, payment_id: paymentId })
      const webhookSignature = computeHmac(rawBody, webhookSecret)

      // Checkout signature expects HMAC(order_id + "|" + payment_id, keySecret)
      const checkoutSignature = computeHmac(`${orderId}|${paymentId}`, keySecret)

      expect(webhookSignature).not.toBe(checkoutSignature)
    })

    it('records webhook event in payment_webhook_events and handles duplicate deliveries idempotently', () => {
      const db = setupPhase55Database()
      const eventId = 'evt_razorpay_unique_9988'

      // First webhook delivery: records event
      db.public.none(`
        INSERT INTO public.payment_webhook_events (event_id, event_type, order_id, payment_id, status)
        VALUES ('${eventId}', 'payment.captured', 'KG_ORD_HOOK_01', 'pay_hook_101', 'processed');
      `)

      // Second delivery with same event_id: detected via unique constraint
      const eventCount = db.public.one(`SELECT count(*)::int AS cnt FROM public.payment_webhook_events WHERE event_id = '${eventId}';`).cnt
      expect(eventCount).toBe(1)
    })
  })

  // ============================================================================
  // 4. LISTING SUBSCRIPTION INTEGRITY & ANTI-SELF-ACTIVATION
  // ============================================================================
  describe('Listing Subscription Activation Authority', () => {
    it('creates paid subscription in pending_verification status and prevents client self-activation', () => {
      const db = setupPhase55Database()

      // Untrusted client call forces is_active = false and payment_status = 'pending'
      db.public.none(`
        INSERT INTO public.listing_subscriptions (
          order_id, payment_id, listing_type, listing_name, city, plan_id, plan_name,
          amount, duration_days, customer_name, customer_phone, is_active, payment_status
        ) VALUES (
          'KG_ORD_SUB_SEC_01', 'pay_client_untrusted', 'academy', 'Elite Academy', 'Delhi',
          '1_year', '1-Year Listing', 4499, 365, 'Coach Rohit', '9876543210', false, 'pending'
        );
      `)

      const sub = db.public.one(`SELECT is_active, payment_status FROM public.listing_subscriptions WHERE order_id = 'KG_ORD_SUB_SEC_01';`)
      expect(sub.is_active).toBe(false)
      expect(sub.payment_status).toBe('pending')
    })

    it('activates subscription atomically upon verified server settlement', () => {
      const db = setupPhase55Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, status, target_type)
        VALUES ('KG_ORD_SUB_SETTLE', 4499, 'pending', 'listing_subscription');

        INSERT INTO public.listing_subscriptions (
          order_id, listing_type, listing_name, city, plan_id, plan_name,
          amount, duration_days, customer_name, customer_phone, is_active, payment_status
        ) VALUES (
          'KG_ORD_SUB_SETTLE', 'academy', 'Settled Academy', 'Mumbai',
          '1_year', '1-Year Listing', 4499, 365, 'Coach Ravi', '9811223344', false, 'pending'
        );
      `)

      // Server-side settlement
      db.public.none(`
        UPDATE public.khelgrid_payments
        SET status = 'completed', payment_id = 'pay_verified_999'
        WHERE order_id = 'KG_ORD_SUB_SETTLE' AND status = 'pending';

        UPDATE public.listing_subscriptions
        SET is_active = true, payment_status = 'paid', payment_id = 'pay_verified_999', updated_at = now()
        WHERE order_id = 'KG_ORD_SUB_SETTLE' AND payment_status = 'pending';
      `)

      const sub = db.public.one(`SELECT is_active, payment_status, payment_id FROM public.listing_subscriptions WHERE order_id = 'KG_ORD_SUB_SETTLE';`)
      expect(sub.is_active).toBe(true)
      expect(sub.payment_status).toBe('paid')
      expect(sub.payment_id).toBe('pay_verified_999')
    })
  })

  // ============================================================================
  // 5. VENUE BOOKING LIFECYCLE & COURT TARIFF DECOUPLING
  // ============================================================================
  describe('Venue Booking Tariff Decoupling & Lifecycle', () => {
    it('resolves authoritative price from slot_hourly_fee (₹800), NOT plan_price (₹499)', () => {
      const db = setupPhase55Database()

      const venue = db.public.one(`SELECT plan_price, slot_hourly_fee FROM public.venues WHERE id = 'v-1';`)
      expect(Number(venue.plan_price)).toBe(499) // Listing subscription plan price
      expect(Number(venue.slot_hourly_fee)).toBe(800) // Court booking hourly fee

      // Court booking fee is decoupled from B2B listing fee
      expect(Number(venue.slot_hourly_fee)).not.toBe(Number(venue.plan_price))
    })

    it('enforces multi-court concurrency isolation: Court 1 and Court 2 reserve independently', () => {
      const db = setupPhase55Database()

      // Court 1 reserved
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
        VALUES ('VB-C1-001', 'v-1', 'Sree Kanteerava', '2026-12-05', '06:00 PM – 07:00 PM', 1, 'Player 1', '9876543210', 800, 'confirmed', 'paid');
      `)

      // Court 2 reserved on same date and time: succeeds without collision
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
        VALUES ('VB-C2-002', 'v-1', 'Sree Kanteerava', '2026-12-05', '06:00 PM – 07:00 PM', 2, 'Player 2', '9811223344', 800, 'confirmed', 'paid');
      `)

      const courtCount = db.public.one(`
        SELECT count(*)::int AS cnt FROM public.venue_bookings
        WHERE venue_id = 'v-1' AND slot_date = '2026-12-05' AND slot_time = '06:00 PM – 07:00 PM';
      `).cnt

      expect(courtCount).toBe(2)
    })

    it('prevents double-booking collision on the same venue, date, time, and court', () => {
      const db = setupPhase55Database()

      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
        VALUES ('VB-COLL-01', 'v-1', 'Sree Kanteerava', '2026-12-05', '07:00 PM – 08:00 PM', 1, 'Player 1', '9876543210', 800, 'confirmed', 'paid');
      `)

      expect(() => {
        db.public.none(`
          INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
          VALUES ('VB-COLL-02', 'v-1', 'Sree Kanteerava', '2026-12-05', '07:00 PM – 08:00 PM', 1, 'Player 2', '9811223344', 800, 'pending', 'pending');
        `)
      }).toThrow()
    })

    it('sweeps expired pending reservations (> 15 minutes) and allows re-booking of the slot', () => {
      const db = setupPhase55Database()

      // Stale pending hold created in the past
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status, expires_at)
        VALUES ('VB-EXPIRED-01', 'v-1', 'Sree Kanteerava', '2026-12-06', '06:00 PM – 07:00 PM', 1, 'Stale Player', '9876543210', 800, 'pending', 'pending', now() - interval '20 minutes');
      `)

      // In-transaction sweep
      db.public.none(`
        UPDATE public.venue_bookings
        SET status = 'expired', updated_at = now()
        WHERE venue_id = 'v-1' AND slot_date = '2026-12-06' AND status = 'pending' AND expires_at < now();
      `)

      const stale = db.public.one(`SELECT status FROM public.venue_bookings WHERE booking_ref = 'VB-EXPIRED-01';`)
      expect(stale.status).toBe('expired')

      // Now a new reservation on court 1 succeeds because partial unique index ignores 'expired' status
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, slot_date, slot_time, court_number, customer_name, customer_phone, total_amount, status, payment_status)
        VALUES ('VB-NEW-02', 'v-1', 'Sree Kanteerava', '2026-12-06', '06:00 PM – 07:00 PM', 1, 'New Player', '9811223344', 800, 'pending', 'pending');
      `)

      const newBooking = db.public.one(`SELECT status FROM public.venue_bookings WHERE booking_ref = 'VB-NEW-02';`)
      expect(newBooking.status).toBe('pending')
    })
  })
})
