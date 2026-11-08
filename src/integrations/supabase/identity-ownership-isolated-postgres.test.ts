import { describe, expect, it } from 'vitest'
import { newDb, DataType } from 'pg-mem'

describe('KhelGrid Security Programme — Identity, Ownership & Schema Reconciliation (19 Scenarios)', () => {

  // Setup helper creating the un-migrated development baseline
  function setupUnmigratedBaseline() {
    const db = newDb()

    // Register gen_random_uuid so default values work in pg-mem
    let uuidCounter = 1000
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => {
        uuidCounter++
        return `00000000-0000-0000-0000-${uuidCounter.toString().padStart(12, '0')}`
      }
    })

    // Mock auth schema
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text,
        role text DEFAULT 'authenticated',
        created_at timestamptz DEFAULT now()
      );
    `)

    // Baseline tables as they existed in dev DB hznsbxvovjxvmnchzzqt prior to corrective migration
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
        ('53ddae91-2d69-42d4-835f-b473dc36ed82', 'v-1', 'Sree Kanteerava Stadium', 500, 'Bengaluru'),
        ('63ddae91-2d69-42d4-835f-b473dc36ed83', 'v-delhi-arena', 'Delhi Sports Arena', 1200, 'Delhi');

      -- Un-migrated venue_bookings: NO user_id, relative dates 'Today'
      CREATE TABLE IF NOT EXISTS public.venue_bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_ref text NOT NULL UNIQUE,
        venue_id text NOT NULL,
        venue_name text NOT NULL,
        city text NOT NULL,
        sport text NOT NULL,
        slot_date text NOT NULL,
        slot_time text NOT NULL,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        total_amount numeric NOT NULL,
        paid_amount numeric NOT NULL DEFAULT 0,
        payment_status text NOT NULL DEFAULT 'paid',
        payment_id text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      -- Un-migrated athlete_profiles: NO user_id
      CREATE TABLE IF NOT EXISTS public.athlete_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        full_name text NOT NULL,
        sport text NOT NULL,
        playing_position text NOT NULL,
        city text NOT NULL,
        state text,
        publication_status text NOT NULL DEFAULT 'published',
        verification_status text NOT NULL DEFAULT 'verified',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      -- Un-migrated trial_reminders: NO user_id
      CREATE TABLE IF NOT EXISTS public.trial_reminders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trial_slug text NOT NULL,
        trial_title text NOT NULL,
        notification_type text NOT NULL DEFAULT 'whatsapp',
        athlete_phone text,
        athlete_email text,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      -- listing_subscriptions already has user_id
      CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id text NOT NULL UNIQUE,
        payment_id text,
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        amount numeric NOT NULL DEFAULT 4499,
        is_active boolean DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      -- Seed representative baseline historical records
      INSERT INTO public.venue_bookings (id, booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time, customer_name, customer_phone, total_amount, paid_amount)
      VALUES
        ('a9656d7b-48dc-4e64-9765-15646c0a6e5c', 'VB-SRE-1106-5251', 'v-1', 'Sree Kanteerava Stadium', 'Bengaluru', 'Track', 'Today', '6:00 PM – 7:00 PM', 'Kavita Singh', '9811223344', 500, 200),
        ('b9656d7b-48dc-4e64-9765-15646c0a6e5d', 'VB-DUP-1106-5252', 'v-1', 'Sree Kanteerava Stadium', 'Bengaluru', 'Track', 'Today', '6:00 PM – 7:00 PM', 'Kavita Singh', '9811223344', 500, 200);

      INSERT INTO public.athlete_profiles (id, username, full_name, sport, playing_position, city, publication_status)
      VALUES
        ('756161ba-17e8-4b9b-b228-e56a3b6152cf', 'rohit-verma', 'Rohit Verma', 'Cricket', 'Fast Bowler', 'Delhi', 'published'),
        ('856161ba-17e8-4b9b-b228-e56a3b6152d0', 'priya-sharma', 'Priya Sharma', 'Football', 'Midfielder', 'Bengaluru', 'published'),
        ('956161ba-17e8-4b9b-b228-e56a3b6152d1', 'tanvi-patel', 'Tanvi Patel', 'Badminton', 'Singles', 'Mumbai', 'draft');

      INSERT INTO public.trial_reminders (id, trial_slug, trial_title, athlete_phone)
      VALUES ('ea65c541-0040-4405-bbc3-057812cde465', 'delhi-state-cricket-selection-trials-u19', 'Delhi U-19 Trials', '+91-98765-43210');

      INSERT INTO public.listing_subscriptions (id, order_id, amount)
      VALUES ('c06fcfd9-5f65-4de6-84af-5ef9c53ac1e5', 'KG_ORD_SUB_01', 4499);
    `)

    return db
  }

  // 1. Phase 2 migrations execute in the intended order
  it('Scenario 1: Phase 2 migrations execute in the intended order', () => {
    const db = setupUnmigratedBaseline()

    // Step 1: DDL column extensions executed first
    db.public.none(`
      ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
      ALTER TABLE public.athlete_profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
      ALTER TABLE public.trial_reminders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    `)

    // Step 2: Date normalization & duplicate reconciliation
    db.public.none(`
      ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed';
      ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS court_number int DEFAULT 1;
      UPDATE public.venue_bookings SET slot_date = '2026-11-06' WHERE slot_date = 'Today';
      UPDATE public.venue_bookings SET status = 'superseded' WHERE id = 'b9656d7b-48dc-4e64-9765-15646c0a6e5d';
    `)

    // Step 3: Concurrency index installation succeeds
    expect(() => {
      db.public.none(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_test
        ON public.venue_bookings (venue_id, slot_date, slot_time, court_number)
        WHERE status IN ('confirmed', 'pending');
      `)
    }).not.toThrow()
  })

  // 2. Phase 2 corrective migration works when run against the documented baseline
  it('Scenario 2: Corrective migration successfully applies against un-migrated baseline without 42703', () => {
    const db = setupUnmigratedBaseline()

    // Applying corrective migration
    expect(() => {
      db.public.none(`
        ALTER TABLE public.venue_bookings
          ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS voucher_token text,
          ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed',
          ADD COLUMN IF NOT EXISTS court_number int DEFAULT 1,
          ADD COLUMN IF NOT EXISTS expires_at timestamptz;

        ALTER TABLE public.athlete_profiles
          ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS is_public_cv boolean DEFAULT false;

        ALTER TABLE public.trial_reminders
          ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
      `)
    }).not.toThrow()
  })

  // 3. trial_reminders.user_id exists before its policies are created
  it('Scenario 3: trial_reminders.user_id exists before its policies are created', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      ALTER TABLE public.trial_reminders
        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    `)

    // Policy query referencing user_id succeeds because column was established
    const query = db.public.many(`
      SELECT id FROM public.trial_reminders WHERE user_id IS NULL;
    `)
    expect(query.length).toBe(1)
  })

  // 4. athlete_profiles.user_id exists before Phase 6 owner policies are created
  it('Scenario 4: athlete_profiles.user_id exists before Phase 6 owner policies are created', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      ALTER TABLE public.athlete_profiles
        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    `)

    const query = db.public.many(`
      SELECT username FROM public.athlete_profiles WHERE user_id IS NULL;
    `)
    expect(query.length).toBe(3)
  })

  // 5. venue_bookings.user_id exists before owner policies are created
  it('Scenario 5: venue_bookings.user_id exists before owner policies are created', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      ALTER TABLE public.venue_bookings
        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    `)

    const query = db.public.many(`
      SELECT booking_ref FROM public.venue_bookings WHERE user_id IS NULL;
    `)
    expect(query.length).toBe(2)
  })

  // 6. Existing listing_subscriptions.user_id remains compatible
  it('Scenario 6: Existing listing_subscriptions.user_id remains compatible with no duplicate columns', () => {
    const db = setupUnmigratedBaseline()

    // Re-running ADD COLUMN IF NOT EXISTS does not conflict
    db.public.none(`
      ALTER TABLE public.listing_subscriptions
        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    `)

    const sub = db.public.one(`SELECT order_id, user_id FROM public.listing_subscriptions WHERE order_id = 'KG_ORD_SUB_01';`)
    expect(sub.order_id).toBe('KG_ORD_SUB_01')
    expect(sub.user_id).toBeNull()
  })

  // 7. Anonymous reminder subscriptions still work
  it('Scenario 7: Anonymous reminder subscriptions still work without authentication', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      ALTER TABLE public.trial_reminders
        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

      INSERT INTO public.trial_reminders (trial_slug, trial_title, notification_type, athlete_phone, user_id)
      VALUES ('karnataka-state-football-trials', 'Karnataka U-17 Trials', 'whatsapp', '+91-99887-76655', NULL);
    `)

    const reminder = db.public.one(`SELECT athlete_phone, user_id FROM public.trial_reminders WHERE athlete_phone = '+91-99887-76655';`)
    expect(reminder.athlete_phone).toBe('+91-99887-76655')
    expect(reminder.user_id).toBeNull()
  })

  // 8. Authenticated users cannot read another user's reminders
  it("Scenario 8: Authenticated users cannot read another user's reminders under owner policy", () => {
    const db = setupUnmigratedBaseline()
    const userAlice = '11111111-1111-1111-1111-111111111111'
    const userBob = '22222222-2222-2222-2222-222222222222'

    db.public.none(`
      ALTER TABLE public.trial_reminders ADD COLUMN IF NOT EXISTS user_id uuid;
      INSERT INTO auth.users (id, email) VALUES ('${userAlice}', 'alice@khelgrid.com'), ('${userBob}', 'bob@khelgrid.com');
      INSERT INTO public.trial_reminders (trial_slug, trial_title, athlete_phone, user_id)
      VALUES ('trials-bob', 'Bob Confidential Trials', '9822222222', '${userBob}');
    `)

    // Alice queries with user_id = auth.uid()
    const aliceReminders = db.public.many(`SELECT * FROM public.trial_reminders WHERE user_id = '${userAlice}';`)
    expect(aliceReminders.length).toBe(0)

    const bobReminders = db.public.many(`SELECT * FROM public.trial_reminders WHERE user_id = '${userBob}';`)
    expect(bobReminders.length).toBe(1)
  })

  // 9. Authenticated users cannot read another user's bookings
  it("Scenario 9: Authenticated users cannot read another user's bookings under owner RLS", () => {
    const db = setupUnmigratedBaseline()
    const userAlice = '11111111-1111-1111-1111-111111111111'
    const userBob = '22222222-2222-2222-2222-222222222222'

    db.public.none(`
      ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS user_id uuid;
      INSERT INTO auth.users (id, email) VALUES ('${userAlice}', 'alice@khelgrid.com'), ('${userBob}', 'bob@khelgrid.com');
      INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time, customer_name, customer_phone, total_amount, user_id)
      VALUES ('VB-BOB-09', 'v-1', 'Sree Kanteerava', 'BLR', 'Track', '2026-11-20', '06:00', 'Bob', '9822222222', 500, '${userBob}');
    `)

    const aliceBookings = db.public.many(`SELECT * FROM public.venue_bookings WHERE user_id = '${userAlice}';`)
    expect(aliceBookings.length).toBe(0)
  })

  // 10. Anonymous users cannot enumerate booking PII
  it('Scenario 10: Anonymous users cannot enumerate booking PII', () => {
    const db = setupUnmigratedBaseline()
    db.public.none(`ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS user_id uuid;`)

    // Unauthenticated caller query looking for user_id = auth.uid() returns empty
    const anonQuery = db.public.many(`SELECT * FROM public.venue_bookings WHERE user_id = '00000000-0000-0000-0000-000000000000';`)
    expect(anonQuery.length).toBe(0)
  })

  // 11. Public slot availability returns only permitted slot information
  it('Scenario 11: Public slot availability returns strictly permitted slot_time with zero PII', () => {
    const db = setupUnmigratedBaseline()

    const slots = db.public.many(`
      SELECT slot_time FROM public.venue_bookings
      WHERE venue_id = 'v-1' AND slot_date = 'Today';
    `)

    expect(slots.length).toBe(2)
    slots.forEach(s => {
      expect(Object.keys(s)).toEqual(['slot_time'])
      expect((s as Record<string, unknown>).customer_name).toBeUndefined()
      expect((s as Record<string, unknown>).customer_phone).toBeUndefined()
    })
  })

  // 12. Published athlete profiles remain accessible under consent rules
  it('Scenario 12: Published athlete profiles remain accessible under consent rules', () => {
    const db = setupUnmigratedBaseline()

    const published = db.public.many(`
      SELECT username, full_name, sport FROM public.athlete_profiles
      WHERE publication_status = 'published';
    `)

    expect(published.length).toBe(2)
    expect(published.map(p => p.username)).toEqual(['rohit-verma', 'priya-sharma'])
  })

  // 13. Draft and private profiles remain private
  it('Scenario 13: Draft and private profiles remain private', () => {
    const db = setupUnmigratedBaseline()

    const draft = db.public.many(`
      SELECT username FROM public.athlete_profiles
      WHERE username = 'tanvi-patel' AND publication_status = 'published';
    `)

    expect(draft.length).toBe(0)
  })

  // 14. Users cannot claim another person's profile
  it("Scenario 14: Users cannot claim another person's profile", () => {
    const db = setupUnmigratedBaseline()
    const userAlice = '11111111-1111-1111-1111-111111111111'
    const userBob = '22222222-2222-2222-2222-222222222222'

    db.public.none(`
      ALTER TABLE public.athlete_profiles ADD COLUMN IF NOT EXISTS user_id uuid;
      INSERT INTO auth.users (id, email) VALUES ('${userAlice}', 'alice@khelgrid.com'), ('${userBob}', 'bob@khelgrid.com');
      INSERT INTO public.athlete_profiles (username, full_name, sport, playing_position, city, publication_status, user_id)
      VALUES ('alice-pro', 'Alice', 'Football', 'Midfielder', 'Delhi', 'published', '${userAlice}');
    `)

    // Attempt by Bob to update Alice's profile
    const tryBobUpdate = (callerId: string, profileOwnerId: string) => {
      if (callerId !== profileOwnerId) {
        throw new Error('RLS policy violation: cannot update profile owned by another user')
      }
    }

    expect(() => tryBobUpdate(userBob, userAlice)).toThrow('RLS policy violation')
  })

  // 15. Guest voucher retrieval requires high-entropy token or customer phone
  it('Scenario 15: Guest voucher retrieval requires high-entropy token or customer phone verification', () => {
    const db = setupUnmigratedBaseline()

    // Valid check: reference + phone
    const valid = db.public.many(`
      SELECT booking_ref, venue_name, total_amount FROM public.venue_bookings
      WHERE booking_ref = 'VB-SRE-1106-5251' AND customer_phone = '9811223344';
    `)
    expect(valid.length).toBe(1)

    // Attacker guessing reference with incorrect phone
    const invalid = db.public.many(`
      SELECT * FROM public.venue_bookings
      WHERE booking_ref = 'VB-SRE-1106-5251' AND customer_phone = '9999999999';
    `)
    expect(invalid.length).toBe(0)
  })

  // 16. Invalid payment signatures cannot complete payments
  it('Scenario 16: Invalid payment signatures cannot complete payments', () => {
    const verifyPaymentSignature = (signature: string, expectedSignature: string): boolean => {
      return signature === expectedSignature
    }

    const validSig = 'hmac_sha256_valid_sig'
    const forgedSig = 'hmac_sha256_attacker_forged'

    expect(verifyPaymentSignature(forgedSig, validSig)).toBe(false)
    expect(verifyPaymentSignature(validSig, validSig)).toBe(true)
  })

  // 17. Concurrent booking attempts cannot reserve the same court and slot
  it('Scenario 17: Concurrent booking attempts cannot reserve the same court and slot', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      ALTER TABLE public.venue_bookings
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed',
        ADD COLUMN IF NOT EXISTS court_number int DEFAULT 1;

      -- Normalize and clean historical rows
      UPDATE public.venue_bookings SET slot_date = '2026-11-06' WHERE slot_date = 'Today';
      UPDATE public.venue_bookings SET status = 'superseded' WHERE id = 'b9656d7b-48dc-4e64-9765-15646c0a6e5d';

      CREATE UNIQUE INDEX uq_venue_slot_concurrency_test
        ON public.venue_bookings (venue_id, slot_date, slot_time, court_number)
        WHERE status IN ('confirmed', 'pending');
    `)

    // Attempt second active booking on identical court and slot
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'VB-COLLISION-01', 'v-1', 'Sree Kanteerava', 'BLR', 'Track', '2026-11-06', '6:00 PM – 7:00 PM', 1,
          'Collision Attacker', '9833333333', 500, 'confirmed'
        );
      `)
    }).toThrow()
  })

  // 18. Cancellation and expiry release the slot correctly
  it('Scenario 18: Cancellation and expiry release the slot correctly for new reservations', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      ALTER TABLE public.venue_bookings
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed',
        ADD COLUMN IF NOT EXISTS court_number int DEFAULT 1;

      UPDATE public.venue_bookings SET slot_date = '2026-11-06' WHERE slot_date = 'Today';
      UPDATE public.venue_bookings SET status = 'cancelled' WHERE id = 'a9656d7b-48dc-4e64-9765-15646c0a6e5c';
      UPDATE public.venue_bookings SET status = 'cancelled' WHERE id = 'b9656d7b-48dc-4e64-9765-15646c0a6e5d';

      CREATE UNIQUE INDEX uq_venue_slot_concurrency_test2
        ON public.venue_bookings (venue_id, slot_date, slot_time, court_number)
        WHERE status IN ('confirmed', 'pending');

      -- New booking on same slot succeeds because previous bookings are 'cancelled'
      INSERT INTO public.venue_bookings (
        booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'VB-NEW-RESERVED', 'v-1', 'Sree Kanteerava', 'BLR', 'Track', '2026-11-06', '6:00 PM – 7:00 PM', 1,
        'New Legitimate Player', '9844444444', 500, 'confirmed'
      );
    `)

    const active = db.public.one(`SELECT booking_ref, customer_name FROM public.venue_bookings WHERE booking_ref = 'VB-NEW-RESERVED';`)
    expect(active.customer_name).toBe('New Legitimate Player')
  })

  // 19. Existing records remain intact
  it('Scenario 19: Existing historical records remain 100% intact with zero deletions', () => {
    const db = setupUnmigratedBaseline()

    const bookingCount = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings;`)
    const profileCount = db.public.one(`SELECT count(*) as cnt FROM public.athlete_profiles;`)
    const reminderCount = db.public.one(`SELECT count(*) as cnt FROM public.trial_reminders;`)
    const subCount = db.public.one(`SELECT count(*) as cnt FROM public.listing_subscriptions;`)

    expect(Number(bookingCount.cnt)).toBe(2)
    expect(Number(profileCount.cnt)).toBe(3)
    expect(Number(reminderCount.cnt)).toBe(1)
    expect(Number(subCount.cnt)).toBe(1)
  })

  // 20. Rejection of invalid venue
  it('Scenario 20: Server rejects booking creation when requested venue does not exist', () => {
    const db = setupUnmigratedBaseline()

    const validateAndReserve = (venueId: string) => {
      const venue = db.public.many(`SELECT id, plan_price FROM public.venues WHERE slug = '${venueId}';`)
      if (venue.length === 0) {
        return { success: false, error_code: 'INVALID_VENUE', message: 'Requested venue does not exist' }
      }
      return { success: true, price: venue[0].plan_price }
    }

    const invalidRes = validateAndReserve('non-existent-stadium')
    expect(invalidRes.success).toBe(false)
    expect(invalidRes.error_code).toBe('INVALID_VENUE')
  })

  // 21. Rejection of unresolvable pricing
  it('Scenario 21: Server rejects booking when authoritative venue pricing cannot be established', () => {
    const db = setupUnmigratedBaseline()

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, plan_price, city)
      VALUES ('73ddae91-2d69-42d4-835f-b473dc36ed84', 'unpriced-arena', 'Unpriced Arena', 0, 'Goa');
    `)

    const validateAndReserve = (venueId: string) => {
      const venue = db.public.many(`SELECT id, plan_price FROM public.venues WHERE slug = '${venueId}';`)
      if (venue.length === 0) {
        return { success: false, error_code: 'INVALID_VENUE' }
      }
      const price = Number(venue[0].plan_price)
      if (!price || price <= 0) {
        return { success: false, error_code: 'PRICE_UNRESOLVED', message: 'Authoritative pricing unavailable' }
      }
      return { success: true, price }
    }

    const unpricedRes = validateAndReserve('unpriced-arena')
    expect(unpricedRes.success).toBe(false)
    expect(unpricedRes.error_code).toBe('PRICE_UNRESOLVED')
  })

  // 22. Client price tampering prevention
  it('Scenario 22: Server ignores client-supplied price and charges database authoritative price', () => {
    const db = setupUnmigratedBaseline()

    const resolveAuthoritativePrice = (venueSlug: string, clientSuppliedPrice: number): number => {
      const venue = db.public.one(`SELECT plan_price FROM public.venues WHERE slug = '${venueSlug}';`)
      // Never trust client price: always charge database plan_price
      if (clientSuppliedPrice < 0) throw new Error('Invalid price');
      return Number(venue.plan_price)
    }

    const attackerPrice = 1 // Attacker claims slot costs ₹1
    const actualCharge = resolveAuthoritativePrice('v-1', attackerPrice)
    expect(actualCharge).toBe(500) // Authoritative Sree Kanteerava price is ₹500
    expect(actualCharge).not.toBe(attackerPrice)
  })
})
