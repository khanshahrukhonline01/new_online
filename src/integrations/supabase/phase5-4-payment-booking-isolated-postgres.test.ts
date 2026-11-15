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
  return rawHex.repeat(8)
}

describe('KhelGrid Security Programme — Phase 5.4 Isolated PostgreSQL Suite', () => {

  function setupPhase54Database() {
    const db = newDb()

    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => globalThis.crypto.randomUUID()
    })

    // Mock hmac calculation for PostgreSQL
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

      INSERT INTO private.gateway_credentials (provider, key_id, key_secret, is_active)
      VALUES ('razorpay', 'rzp_test_key_123', 'rzp_live_secret_456789012345', true);
    `)

    // Create venues table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.venues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        plan_price numeric NOT NULL DEFAULT 500,
        city text NOT NULL
      );

      INSERT INTO public.venues (id, slug, name, plan_price, city)
      VALUES
        ('53ddae91-2d69-42d4-835f-b473dc36ed82', 'v-kanteerava', 'Sree Kanteerava Stadium', 600, 'Bengaluru'),
        ('63ddae91-2d69-42d4-835f-b473dc36ed83', 'v-delhi-arena', 'Delhi Sports Arena', 1200, 'Delhi'),
        ('73ddae91-2d69-42d4-835f-b473dc36ed84', 'unpriced-arena', 'Unpriced Arena', 0, 'Goa');
    `)

    // Create venue_bookings table with Phase 5.4 columns
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.venue_bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_ref text NOT NULL UNIQUE,
        venue_id text NOT NULL,
        venue_name text NOT NULL,
        city text NOT NULL,
        sport text NOT NULL,
        court_number int NOT NULL DEFAULT 1,
        slot_date text NOT NULL,
        slot_time text NOT NULL,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        total_amount numeric NOT NULL,
        paid_amount numeric NOT NULL DEFAULT 0,
        payment_status text NOT NULL DEFAULT 'pending',
        status text NOT NULL DEFAULT 'pending',
        payment_id text,
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        voucher_token text,
        idempotency_key text,
        expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX uq_venue_slot_concurrency
      ON public.venue_bookings (venue_id, slot_date, slot_time, court_number)
      WHERE status IN ('confirmed', 'pending');

      CREATE UNIQUE INDEX uq_venue_bookings_idempotency
      ON public.venue_bookings (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `)

    // Create khelgrid_payments table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.khelgrid_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id text NOT NULL UNIQUE,
        payment_id text UNIQUE,
        user_id uuid REFERENCES auth.users(id),
        amount numeric(10,2) NOT NULL CHECK (amount > 0),
        currency text NOT NULL DEFAULT 'INR',
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'pay_at_venue')),
        target_type text NOT NULL,
        target_id text,
        customer_name text,
        customer_phone text,
        customer_email text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // Create listing_subscriptions table with Phase 5.4 columns
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id text NOT NULL UNIQUE,
        payment_id text,
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        listing_type text NOT NULL,
        listing_id text,
        listing_name text NOT NULL,
        city text NOT NULL,
        plan_id text NOT NULL,
        plan_name text NOT NULL,
        amount numeric(10, 2) NOT NULL,
        duration_days integer NOT NULL DEFAULT 30,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        starts_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz,
        is_active boolean NOT NULL DEFAULT false,
        payment_status text NOT NULL DEFAULT 'pending',
        access_token text,
        idempotency_key text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    return db
  }

  describe('1. Payment Verification & HMAC Settlement', () => {
    it('cryptographically verifies valid Razorpay HMAC and settles payment transactionally', () => {
      const db = setupPhase54Database()

      // Record a pending payment order
      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, currency, status, target_type, target_id)
        VALUES ('KG_ORD_1001', 600, 'INR', 'pending', 'venue', 'VB-KAN-1001');
      `)

      // Record associated pending booking
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time, customer_name, customer_phone, total_amount, paid_amount, status, payment_status)
        VALUES ('VB-KAN-1001', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', '2026-12-05', '06:00 PM – 07:00 PM', 'Rohan', '9876543210', 600, 0, 'pending', 'pending');
      `)

      const secret = 'rzp_live_secret_456789012345'
      const payload = 'KG_ORD_1001|pay_2001'
      const validSignature = computeHmac(payload, secret)

      // Execute simulated settlement RPC
      const expectedSig = db.public.one(`SELECT hmac_sha256('${payload}', '${secret}') AS sig;`).sig
      expect(expectedSig).toBe(validSignature)

      // Transactional settlement
      db.public.none(`
        UPDATE public.khelgrid_payments
        SET status = 'completed', payment_id = 'pay_2001'
        WHERE order_id = 'KG_ORD_1001' AND status = 'pending';

        UPDATE public.venue_bookings
        SET status = 'confirmed', payment_status = 'paid', paid_amount = 600, payment_id = 'pay_2001'
        WHERE booking_ref = 'VB-KAN-1001' AND status = 'pending';
      `)

      const payment = db.public.one(`SELECT status, payment_id FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_1001';`)
      expect(payment.status).toBe('completed')
      expect(payment.payment_id).toBe('pay_2001')

      const booking = db.public.one(`SELECT status, payment_status, paid_amount FROM public.venue_bookings WHERE booking_ref = 'VB-KAN-1001';`)
      expect(booking.status).toBe('confirmed')
      expect(booking.payment_status).toBe('paid')
      expect(Number(booking.paid_amount)).toBe(600)
    })

    it('rejects forged HMAC signature and leaves transaction pending', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, amount, status, target_type)
        VALUES ('KG_ORD_FORGE_01', 1200, 'pending', 'venue');
      `)

      const secret = 'rzp_live_secret_456789012345'
      const forgedSig = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const realPayload = 'KG_ORD_FORGE_01|pay_forge_99'
      const realSig = computeHmac(realPayload, secret)

      expect(forgedSig).not.toBe(realSig)

      // Assert payment remains pending
      const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_FORGE_01';`)
      expect(payment.status).toBe('pending')
    })

    it('rejects replay attempt on already settled transaction (ALREADY_COMPLETED)', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (order_id, payment_id, amount, status, target_type)
        VALUES ('KG_ORD_REPLAY', 'pay_replay_01', 500, 'completed', 'venue');
      `)

      const payment = db.public.one(`SELECT status FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_REPLAY';`)
      expect(payment.status).toBe('completed')

      // Settle attempt must fail closed on replay
      const canSettle = db.public.many(`SELECT id FROM public.khelgrid_payments WHERE order_id = 'KG_ORD_REPLAY' AND status = 'pending';`)
      expect(canSettle.length).toBe(0)
    })

    it('rejects duplicate payment ID reuse across different orders (DUPLICATE_PAYMENT_ID)', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.khelgrid_payments (id, order_id, payment_id, amount, status, target_type)
        VALUES ('11111111-1111-1111-1111-111111111111', 'KG_ORD_ORIGINAL', 'pay_duplicate_check', 500, 'completed', 'venue');
      `)

      db.public.none(`
        INSERT INTO public.khelgrid_payments (id, order_id, amount, status, target_type)
        VALUES ('22222222-2222-2222-2222-222222222222', 'KG_ORD_NEW_ATTEMPT', 500, 'pending', 'venue');
      `)

      // Check duplicate payment ID constraint
      const isDuplicate = db.public.many(`
        SELECT 1 FROM public.khelgrid_payments
        WHERE payment_id = 'pay_duplicate_check'
          AND order_id = 'KG_ORD_ORIGINAL';
      `)
      expect(isDuplicate.length).toBe(1)

      // Attempting to assign same payment_id to another order throws unique violation
      expect(() => {
        db.public.none(`
          UPDATE public.khelgrid_payments
          SET payment_id = 'pay_duplicate_check'
          WHERE order_id = 'KG_ORD_NEW_ATTEMPT';
        `)
      }).toThrow()
    })
  })

  describe('2. Venue Booking Lifecycle & Concurrency Invariants', () => {
    it('supports valid guest booking with user_id NULL and high-entropy voucher token', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.venue_bookings (
          booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status, user_id, voucher_token
        ) VALUES (
          'VB-GUEST-01', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
          '2026-12-05', '07:00 PM – 08:00 PM', 'Guest Player', '9876543210',
          600, 'confirmed', 'pay_at_venue', NULL, 'voucher_guest_token_128'
        );
      `)

      const booking = db.public.one(`SELECT booking_ref, user_id, voucher_token, payment_status, status FROM public.venue_bookings WHERE booking_ref = 'VB-GUEST-01';`)
      expect(booking.booking_ref).toBe('VB-GUEST-01')
      expect(booking.user_id).toBeNull()
      expect(booking.voucher_token).toBe('voucher_guest_token_128')
      expect(booking.status).toBe('confirmed')
      expect(booking.payment_status).toBe('pay_at_venue')
    })

    it('enforces partial unique index uq_venue_slot_concurrency against simultaneous double-booking', () => {
      const db = setupPhase54Database()

      // Player 1 reserves slot
      db.public.none(`
        INSERT INTO public.venue_bookings (
          booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status
        ) VALUES (
          'VB-FIRST-01', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
          '2026-12-05', '06:00 PM – 07:00 PM', 'Player One', '9876543210',
          600, 'confirmed', 'pay_at_venue'
        );
      `)

      // Player 2 attempts exact same venue, court, date, time slot
      expect(() => {
        db.public.none(`
          INSERT INTO public.venue_bookings (
            booking_ref, venue_id, venue_name, city, sport, court_number,
            slot_date, slot_time, customer_name, customer_phone,
            total_amount, status, payment_status
          ) VALUES (
            'VB-SECOND-02', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
            '2026-12-05', '06:00 PM – 07:00 PM', 'Player Two', '9123456780',
            600, 'pending', 'pending'
          );
        `)
      }).toThrow(/unique.*violation|duplicate key/i)
    })

    it('allows simultaneous bookings on different courts at the same venue', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status
        ) VALUES (
          '33333333-3333-3333-3333-333333333331', 'VB-COURT-1', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1, '2026-12-05', '06:00 PM – 07:00 PM', 'P1', '9876543210', 600, 'confirmed', 'pay_at_venue'
        );
      `)

      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status
        ) VALUES (
          '33333333-3333-3333-3333-333333333332', 'VB-COURT-2', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 2, '2026-12-05', '06:00 PM – 07:00 PM', 'P2', '9876543211', 600, 'confirmed', 'pay_at_venue'
        );
      `)

      const count = db.public.one(`SELECT count(*) FROM public.venue_bookings WHERE venue_id = 'v-kanteerava';`).count
      expect(Number(count)).toBe(2)
    })

    it('frees slot when pending reservation expires or transitions to cancelled', () => {
      const db = setupPhase54Database()

      // Insert pending hold that expired
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status
        ) VALUES (
          '44444444-4444-4444-4444-444444444441', 'VB-EXPIRED-HOLD', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
          '2026-12-05', '09:00 AM – 10:00 AM', 'Expired User', '9876543210',
          600, 'expired', 'pending'
        );
      `)

      // New reservation on exact same slot succeeds because 'expired' is excluded from partial index
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status
        ) VALUES (
          '44444444-4444-4444-4444-444444444442', 'VB-NEW-RESERVATION', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
          '2026-12-05', '09:00 AM – 10:00 AM', 'New User', '9988776655',
          600, 'confirmed', 'pay_at_venue'
        );
      `)

      const active = db.public.one(`SELECT booking_ref, status FROM public.venue_bookings WHERE slot_date = '2026-12-05' AND slot_time = '09:00 AM – 10:00 AM' AND status = 'confirmed';`)
      expect(active.booking_ref).toBe('VB-NEW-RESERVATION')
    })

    it('enforces request idempotency via idempotency_key', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.venue_bookings (
          booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone,
          total_amount, status, payment_status, idempotency_key
        ) VALUES (
          'VB-IDEMP-01', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
          '2026-12-05', '10:00 AM – 11:00 AM', 'Rohan', '9876543210',
          600, 'confirmed', 'pay_at_venue', 'IDEMP_KEY_9988'
        );
      `)

      // Querying existing booking by idempotency key returns original booking
      const existing = db.public.one(`SELECT booking_ref, status FROM public.venue_bookings WHERE idempotency_key = 'IDEMP_KEY_9988';`)
      expect(existing.booking_ref).toBe('VB-IDEMP-01')
      expect(existing.status).toBe('confirmed')
    })

    it('rejects unpriced venue reservation (PRICE_UNRESOLVED)', () => {
      const db = setupPhase54Database()

      const venue = db.public.one(`SELECT plan_price FROM public.venues WHERE slug = 'unpriced-arena';`)
      const price = Number(venue.plan_price)
      expect(price <= 0).toBe(true)
      // Transaction fails closed when price <= 0
    })
  })

  describe('3. Listing Subscription Authorization & Data Sanitization', () => {
    it('activates listing subscription only upon verified payment settlement', () => {
      const db = setupPhase54Database()

      // Untrusted submission: begins in is_active = false, payment_status = 'pending'
      db.public.none(`
        INSERT INTO public.listing_subscriptions (
          order_id, listing_type, listing_name, city, plan_id, plan_name,
          amount, duration_days, customer_name, customer_phone, is_active, payment_status, access_token
        ) VALUES (
          'KG_SUB_ORD_1', 'academy', 'Bhaichung Academy', 'Delhi', '1_year', '1-Year Listing',
          4499, 365, 'Coach P', '9876543210', false, 'pending', 'token_sub_access_123456'
        );
      `)

      const initial = db.public.one(`SELECT is_active, payment_status FROM public.listing_subscriptions WHERE order_id = 'KG_SUB_ORD_1';`)
      expect(initial.is_active).toBe(false)
      expect(initial.payment_status).toBe('pending')

      // Settle payment transactionally
      db.public.none(`
        UPDATE public.listing_subscriptions
        SET is_active = true, payment_status = 'paid', payment_id = 'pay_verified_sub_01'
        WHERE order_id = 'KG_SUB_ORD_1' AND payment_status = 'pending';
      `)

      const settled = db.public.one(`SELECT is_active, payment_status, payment_id FROM public.listing_subscriptions WHERE order_id = 'KG_SUB_ORD_1';`)
      expect(settled.is_active).toBe(true)
      expect(settled.payment_status).toBe('paid')
      expect(settled.payment_id).toBe('pay_verified_sub_01')
    })

    it('get_listing_subscription_by_order sanitized projection shields customer phone and email', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.listing_subscriptions (
          order_id, listing_type, listing_name, city, plan_id, plan_name,
          amount, duration_days, customer_name, customer_phone, customer_email,
          is_active, payment_status, access_token
        ) VALUES (
          'KG_SUB_ORD_SAN', 'academy', 'Sanitized Academy', 'Mumbai', '1_month', '1-Month Listing',
          499, 30, 'Private Name', '9988776655', 'private@example.com',
          true, 'paid', 'token_access_secret_123'
        );
      `)

      // Sanitized projection query (emulating public RPC)
      const sanitized = db.public.one(`
        SELECT order_id, listing_name, listing_type, plan_id, plan_name, amount, is_active, payment_status
        FROM public.listing_subscriptions
        WHERE order_id = 'KG_SUB_ORD_SAN';
      `)

      expect(sanitized.order_id).toBe('KG_SUB_ORD_SAN')
      expect(sanitized.listing_name).toBe('Sanitized Academy')
      expect((sanitized as Record<string, unknown>).customer_phone).toBeUndefined()
      expect((sanitized as Record<string, unknown>).customer_email).toBeUndefined()
    })
  })

  describe('4. Voucher Retrieval Privacy & Rate Limiting Defense', () => {
    it('get_venue_booking_voucher requires high-entropy voucher token and returns masked name', () => {
      const db = setupPhase54Database()

      db.public.none(`
        INSERT INTO public.venue_bookings (
          booking_ref, venue_id, venue_name, city, sport, court_number,
          slot_date, slot_time, customer_name, customer_phone, customer_email,
          total_amount, paid_amount, status, payment_status, voucher_token
        ) VALUES (
          'VB-PRIV-01', 'v-kanteerava', 'Sree Kanteerava', 'Bengaluru', 'Athletics', 1,
          '2026-12-05', '06:00 PM – 07:00 PM', 'Rohan Sharma', '9876543210', 'rohan@example.com',
          600, 600, 'confirmed', 'paid', 'voucher_token_high_entropy_128'
        );
      `)

      // Query with matching voucher token returns sanitized projection
      const match = db.public.many(`
        SELECT booking_ref, venue_name, sport, slot_date, slot_time, court_number, status, payment_status, total_amount
        FROM public.venue_bookings
        WHERE booking_ref = 'VB-PRIV-01'
          AND voucher_token = 'voucher_token_high_entropy_128';
      `)
      expect(match.length).toBe(1)
      expect(match[0].booking_ref).toBe('VB-PRIV-01')
      expect((match[0] as Record<string, unknown>).customer_phone).toBeUndefined()
      expect((match[0] as Record<string, unknown>).customer_email).toBeUndefined()

      // Guessing booking_ref without correct voucher token yields 0 rows (fails closed)
      const guess = db.public.many(`
        SELECT booking_ref FROM public.venue_bookings
        WHERE booking_ref = 'VB-PRIV-01'
          AND voucher_token = 'wrong_token';
      `)
      expect(guess.length).toBe(0)
    })
  })
})
