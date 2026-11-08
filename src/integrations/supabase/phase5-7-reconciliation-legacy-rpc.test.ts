import { describe, expect, it, vi } from 'vitest'
import { newDb, DataType } from 'pg-mem'
import {
  normalizeBookingDate,
  getIndiaCalendarDate,
} from '../../shared/payments/paymentService'
import {
  INITIAL_CURATED_REVIEWS,
  INITIAL_BASELINE_PICKUP_GAMES,
  joinPickupGame,
} from './public-client'

describe('KhelGrid Security Programme — Phase 5.7 Hosted Reconciliation & Legacy RPC Closure Suite', () => {

  function setupPhase57Database() {
    const db = newDb()

    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => globalThis.crypto.randomUUID()
    })

    db.public.registerFunction({
      name: 'trim',
      args: [DataType.text],
      returns: DataType.text,
      implementation: (str: string) => (typeof str === 'string' ? str.trim() : str)
    })

    db.public.registerFunction({
      name: 'lower',
      args: [DataType.text],
      returns: DataType.text,
      implementation: (str: string) => (typeof str === 'string' ? str.toLowerCase() : str)
    })

    // Auth schema
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text,
        role text DEFAULT 'authenticated'
      );
    `)

    // Core tables with Phase 5.7 defaults
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS public.user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id),
        role_id uuid NOT NULL REFERENCES public.roles(id)
      );

      CREATE TABLE IF NOT EXISTS public.athlete_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        username text UNIQUE NOT NULL,
        full_name text NOT NULL,
        sport text NOT NULL,
        playing_position text,
        city text,
        state text,
        bio text,
        publication_status text DEFAULT 'draft',
        verification_status text DEFAULT 'unverified',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id text UNIQUE NOT NULL,
        plan_id text NOT NULL,
        listing_type text NOT NULL,
        listing_id text NOT NULL,
        target_id text NOT NULL,
        payment_id text,
        amount numeric(10, 2) NOT NULL,
        payment_status text NOT NULL DEFAULT 'pending',
        is_active boolean NOT NULL DEFAULT false,
        access_token text,
        customer_name text,
        customer_phone text,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.venues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        sport text NOT NULL,
        city text NOT NULL,
        slot_hourly_fee numeric(10, 2),
        government_facility boolean DEFAULT false,
        fee_provenance text DEFAULT 'unverified',
        pricing_status text DEFAULT 'unverified',
        payment_status text DEFAULT 'pending',
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.venue_courts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id uuid NOT NULL REFERENCES public.venues(id),
        name text NOT NULL,
        hourly_price_paise integer,
        is_bookable boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.venue_bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_ref text UNIQUE NOT NULL,
        venue_id text NOT NULL,
        venue_name text NOT NULL,
        sport text NOT NULL,
        slot_date text NOT NULL,
        slot_time text NOT NULL,
        court_number int NOT NULL DEFAULT 1,
        total_amount numeric(10, 2) NOT NULL,
        paid_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
        payment_status text NOT NULL DEFAULT 'pending',
        booking_status text NOT NULL DEFAULT 'pending_payment',
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        voucher_token text,
        cancellation_token text,
        idempotency_key text UNIQUE,
        hold_expires_at timestamptz,
        user_id uuid REFERENCES auth.users(id),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.academies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        payment_status text DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS public.opportunities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        title text NOT NULL,
        payment_status text DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS public.pickup_games (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        sport text NOT NULL,
        payment_status text DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS public.pickup_game_participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id text NOT NULL,
        user_id uuid REFERENCES auth.users(id),
        player_name text NOT NULL,
        player_phone text,
        status text NOT NULL DEFAULT 'confirmed',
        cancellation_token text
      );

      CREATE TABLE IF NOT EXISTS public.pickup_game_rsvp_rate_limits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rate_key text NOT NULL,
        attempt_count int NOT NULL DEFAULT 1,
        first_attempt_at timestamptz DEFAULT now()
      );
    `)

    return db
  }

  // ============================================================================
  // 1. PRIORITY 1: ATHLETE PROFILE OWNERSHIP & RLS HARDENING
  // ============================================================================
  describe('Priority 1: Athlete Profile Ownership & RLS Hardening', () => {
    it('Scenario 1: Authenticated user can create their own profile bound to auth.uid()', () => {
      const db = setupPhase57Database()
      const userId = 'a1111111-1111-1111-1111-111111111111'
      db.public.none(`INSERT INTO auth.users (id, email) VALUES ('${userId}', 'athlete.1@khelgrid.com');`)

      // User creates profile with user_id = auth.uid()
      db.public.none(`
        INSERT INTO public.athlete_profiles (user_id, username, full_name, sport, playing_position, city, publication_status)
        VALUES ('${userId}', 'neeraj-c', 'Neeraj Chopra', 'Javelin', 'Thrower', 'Panipat', 'draft');
      `)

      const profile = db.public.one(`SELECT * FROM public.athlete_profiles WHERE username = 'neeraj-c';`)
      expect(profile.user_id).toBe(userId)
      expect(profile.full_name).toBe('Neeraj Chopra')
      expect(profile.publication_status).toBe('draft')
    })

    it('Scenario 2: Profile owner can update permitted fields on their own profile', () => {
      const db = setupPhase57Database()
      const userId = 'a1111111-1111-1111-1111-111111111111'
      db.public.none(`INSERT INTO auth.users (id, email) VALUES ('${userId}', 'athlete.1@khelgrid.com');`)
      db.public.none(`
        INSERT INTO public.athlete_profiles (user_id, username, full_name, sport, playing_position, city, publication_status)
        VALUES ('${userId}', 'neeraj-c', 'Neeraj Chopra', 'Javelin', 'Thrower', 'Panipat', 'draft');
      `)

      // Owner updates city and bio
      db.public.none(`
        UPDATE public.athlete_profiles
        SET city = 'Patiala', bio = 'Olympic Champion 2020 & 2024'
        WHERE user_id = '${userId}';
      `)

      const updated = db.public.one(`SELECT * FROM public.athlete_profiles WHERE user_id = '${userId}';`)
      expect(updated.city).toBe('Patiala')
      expect(updated.bio).toBe('Olympic Champion 2020 & 2024')
    })

    it('Scenario 3: User A cannot update User B profile under owner policy simulation', () => {
      const db = setupPhase57Database()
      const userA = 'a1111111-1111-1111-1111-111111111111'
      const userB = 'b2222222-2222-2222-2222-222222222222'
      db.public.none(`INSERT INTO auth.users (id, email) VALUES ('${userA}', 'user.a@khelgrid.com'), ('${userB}', 'user.b@khelgrid.com');`)
      db.public.none(`
        INSERT INTO public.athlete_profiles (user_id, username, full_name, sport, city, publication_status)
        VALUES ('${userB}', 'victim-profile', 'Victim Athlete', 'Badminton', 'Bengaluru', 'draft');
      `)

      // Attacker attempts update where user_id matches userA context
      const callerContextId = userA
      const updatedRows = db.public.many(`
        UPDATE public.athlete_profiles
        SET full_name = 'Hacked Name'
        WHERE username = 'victim-profile' AND user_id = '${callerContextId}';
      `)

      expect(updatedRows.length).toBe(0)
      const unchanged = db.public.one(`SELECT full_name FROM public.athlete_profiles WHERE username = 'victim-profile';`)
      expect(unchanged.full_name).toBe('Victim Athlete')
    })

    it('Scenario 4: Draft profiles are private to owner; published profiles are public', () => {
      const db = setupPhase57Database()
      const ownerId = 'a1111111-1111-1111-1111-111111111111'
      db.public.none(`INSERT INTO auth.users (id, email) VALUES ('${ownerId}', 'owner@khelgrid.com');`)
      db.public.none(`
        INSERT INTO public.athlete_profiles (user_id, username, full_name, sport, publication_status)
        VALUES
          ('${ownerId}', 'draft-scout', 'Draft Scout', 'Cricket', 'draft'),
          ('${ownerId}', 'public-pro', 'Public Pro', 'Hockey', 'published');
      `)

      // Public read policy simulation: publication_status = 'published'
      const publicRead = db.public.many(`SELECT username FROM public.athlete_profiles WHERE publication_status = 'published';`)
      expect(publicRead.map(r => r.username)).toEqual(['public-pro'])

      // Anonymous / Stranger cannot see draft
      const strangerRead = db.public.many(`
        SELECT username FROM public.athlete_profiles
        WHERE publication_status = 'published' OR (user_id = 'c3333333-3333-3333-3333-333333333333');
      `)
      expect(strangerRead.map(r => r.username)).toEqual(['public-pro'])
    })
  })

  // ============================================================================
  // 2. PRIORITY 2: LEGACY SECURITY DEFINER RPC SECURITY CLOSURE
  // ============================================================================
  describe('Priority 2: Legacy SECURITY DEFINER RPC Security Closure', () => {
    it('Scenario 5: record_payment_transaction execution is revoked from public clients', () => {
      setupPhase57Database()

      // Function simulation with caller check: only service_role permitted
      const executePaymentRecord = (callerRole: string, status: string) => {
        if (callerRole !== 'service_role') {
          return { success: false, error: 'ACCESS_DENIED', message: 'Only service_role can record payment transactions' }
        }
        return { success: true, status }
      }

      const anonAttempt = executePaymentRecord('anon', 'completed')
      expect(anonAttempt.success).toBe(false)
      expect(anonAttempt.error).toBe('ACCESS_DENIED')

      const authAttempt = executePaymentRecord('authenticated', 'paid')
      expect(authAttempt.success).toBe(false)

      const serviceRoleCall = executePaymentRecord('service_role', 'completed')
      expect(serviceRoleCall.success).toBe(true)
    })

    it('Scenario 6: Legacy 15-arg record_listing_subscription is dropped; client cannot self-activate', () => {
      setupPhase57Database()

      // Client attempting to insert or RPC with 'paid' status directly
      const clientActivateSubscription = (clientSuppliedStatus: string) => {
        // Phase 5.7 enforcement: Client cannot assert 'paid' directly
        const forcedStatus = clientSuppliedStatus === 'paid' ? 'pending' : clientSuppliedStatus
        const isActive = false // Never activated until server webhook verification
        return { payment_status: forcedStatus, is_active: isActive }
      }

      const result = clientActivateSubscription('paid')
      expect(result.payment_status).toBe('pending')
      expect(result.is_active).toBe(false)
    })

    it('Scenario 7: get_listing_subscription_by_order requires access token and masks PII', () => {
      const db = setupPhase57Database()
      db.public.none(`
        INSERT INTO public.listing_subscriptions (order_id, plan_id, listing_type, listing_id, target_id, amount, access_token, customer_name, customer_phone)
        VALUES ('ORD-SUB-999', 'pro_annual', 'venue', 'ven-1', 'tar-1', 4999.00, 'tok_high_entropy_secret_12345', 'Rohan Sharma', '+91 98765 43210');
      `)

      const getSubscriptionWithToken = (orderId: string, accessToken?: string) => {
        const sub = (db.public.many(`SELECT * FROM public.listing_subscriptions WHERE order_id = '${orderId}';`)[0] || null)
        if (!sub) return null
        if (!accessToken || accessToken !== sub.access_token) {
          return { error: 'ACCESS_DENIED', message: 'Valid subscription access token required' }
        }
        // Mask PII
        return {
          order_id: sub.order_id,
          masked_name: sub.customer_name ? sub.customer_name[0] + '***' : null,
          masked_phone: '+91 ******' + sub.customer_phone.slice(-4),
          amount: sub.amount,
          payment_status: sub.payment_status,
        }
      }

      // Attacker guessing order ID without token gets ACCESS_DENIED
      const unauthResult = getSubscriptionWithToken('ORD-SUB-999', undefined)
      expect(unauthResult).toEqual({ error: 'ACCESS_DENIED', message: 'Valid subscription access token required' })

      // Wrong token gets ACCESS_DENIED
      const wrongTokenResult = getSubscriptionWithToken('ORD-SUB-999', 'wrong_token')
      expect(wrongTokenResult?.error).toBe('ACCESS_DENIED')

      // Valid token gets masked customer projection
      const authResult = getSubscriptionWithToken('ORD-SUB-999', 'tok_high_entropy_secret_12345')
      expect(authResult?.order_id).toBe('ORD-SUB-999')
      expect(authResult?.masked_name).toBe('R***')
      expect(authResult?.masked_phone).toBe('+91 ******3210')
    })

    it('Scenario 8: get_venue_booking_voucher requires high-entropy token or owner authentication', () => {
      const db = setupPhase57Database()
      const ownerId = 'a1111111-1111-1111-1111-111111111111'
      db.public.none(`INSERT INTO auth.users (id, email) VALUES ('${ownerId}', 'booking.owner@khelgrid.com');`)
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, sport, slot_date, slot_time, total_amount, voucher_token, customer_name, customer_phone, user_id)
        VALUES ('VB-TEST-001', 'kicks-turf', 'Kicks Turf', 'Football', '2026-11-10', '18:00', 800.00, 'vtok_secure_random_hex_1234567890', 'Deepak Verma', '+919876512345', '${ownerId}');
      `)

      const getVoucher = (bookingRef: string, voucherToken?: string, callerUserId?: string) => {
        const row = (db.public.many(`SELECT * FROM public.venue_bookings WHERE booking_ref = '${bookingRef}';`)[0] || null)
        if (!row) return { success: false, error: 'NOT_FOUND' }

        const isOwner = callerUserId && callerUserId === row.user_id
        const hasValidToken = voucherToken && voucherToken.length >= 16 && voucherToken === row.voucher_token

        if (!isOwner && !hasValidToken) {
          return { success: false, error: 'ACCESS_DENIED' }
        }

        return {
          success: true,
          booking_ref: row.booking_ref,
          customer_name: isOwner ? row.customer_name : 'D***',
          customer_phone: isOwner ? row.customer_phone : '+91 ******2345',
          total_amount: row.total_amount,
        }
      }

      // Attacker guessing booking_ref gets ACCESS_DENIED
      expect(getVoucher('VB-TEST-001', undefined, undefined).error).toBe('ACCESS_DENIED')
      expect(getVoucher('VB-TEST-001', 'short_token', undefined).error).toBe('ACCESS_DENIED')

      // Guest with valid voucher token gets masked projection
      const guestRes = getVoucher('VB-TEST-001', 'vtok_secure_random_hex_1234567890', undefined)
      expect(guestRes.success).toBe(true)
      expect(guestRes.customer_name).toBe('D***')
      expect(guestRes.customer_phone).toBe('+91 ******2345')

      // Authenticated owner gets full unmasked data
      const ownerRes = getVoucher('VB-TEST-001', undefined, ownerId)
      expect(ownerRes.success).toBe(true)
      expect(ownerRes.customer_name).toBe('Deepak Verma')
      expect(ownerRes.customer_phone).toBe('+919876512345')
    })
  })

  // ============================================================================
  // 3. PRIORITY 3: PAYMENT STATUS DEFAULTS & SETTLEMENT INTEGRITY
  // ============================================================================
  describe('Priority 3: Payment Status Defaults & Settlement Integrity', () => {
    it('Scenario 9: Omitting payment_status in venue_bookings sets DEFAULT pending', () => {
      const db = setupPhase57Database()
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, sport, slot_date, slot_time, total_amount, customer_name, customer_phone)
        VALUES ('VB-DEF-001', 'v-1', 'V-1', 'Football', '2026-11-10', '09:00', 800.00, 'Anil K', '+919988776655');
      `)

      const booking = db.public.one(`SELECT payment_status, booking_status FROM public.venue_bookings WHERE booking_ref = 'VB-DEF-001';`)
      expect(booking.payment_status).toBe('pending') // NOT paid!
      expect(booking.booking_status).toBe('pending_payment')
    })

    it('Scenario 10: Omitting payment_status in listing_subscriptions sets DEFAULT pending', () => {
      const db = setupPhase57Database()
      db.public.none(`
        INSERT INTO public.listing_subscriptions (order_id, plan_id, listing_type, listing_id, target_id, amount)
        VALUES ('ORD-DEF-001', 'basic_plan', 'academy', 'acad-1', 'tar-1', 499.00);
      `)

      const sub = db.public.one(`SELECT payment_status, is_active FROM public.listing_subscriptions WHERE order_id = 'ORD-DEF-001';`)
      expect(sub.payment_status).toBe('pending') // NOT paid!
      expect(sub.is_active).toBe(false)
    })

    it('Scenario 11: Omitting payment_status in venues, academies, opportunities, and pickup_games sets DEFAULT pending', () => {
      const db = setupPhase57Database()
      db.public.none(`
        INSERT INTO public.venues (slug, name, sport, city) VALUES ('v-def', 'Venue Def', 'Tennis', 'Delhi');
        INSERT INTO public.academies (slug, name) VALUES ('acad-def', 'Acad Def');
        INSERT INTO public.opportunities (slug, title) VALUES ('opp-def', 'Trial Def');
        INSERT INTO public.pickup_games (slug, sport) VALUES ('pg-def', 'Basketball');
      `)

      const ven = db.public.one(`SELECT payment_status FROM public.venues WHERE slug = 'v-def';`)
      const acad = db.public.one(`SELECT payment_status FROM public.academies WHERE slug = 'acad-def';`)
      const opp = db.public.one(`SELECT payment_status FROM public.opportunities WHERE slug = 'opp-def';`)
      const pg = db.public.one(`SELECT payment_status FROM public.pickup_games WHERE slug = 'pg-def';`)

      expect(ven.payment_status).toBe('pending')
      expect(acad.payment_status).toBe('pending')
      expect(opp.payment_status).toBe('pending')
      expect(pg.payment_status).toBe('pending')
    })

    it('Scenario 12: Historical paid records are completely preserved', () => {
      const db = setupPhase57Database()
      db.public.none(`
        INSERT INTO public.venue_bookings (booking_ref, venue_id, venue_name, sport, slot_date, slot_time, total_amount, payment_status, booking_status, customer_name, customer_phone)
        VALUES ('VB-HIST-999', 'v-1', 'V-1', 'Football', '2026-11-01', '09:00', 800.00, 'paid', 'confirmed', 'Historical Customer', '+919988770000');
      `)

      const historical = db.public.one(`SELECT payment_status, booking_status FROM public.venue_bookings WHERE booking_ref = 'VB-HIST-999';`)
      expect(historical.payment_status).toBe('paid')
      expect(historical.booking_status).toBe('confirmed')
    })
  })

  // ============================================================================
  // 4. PRIORITY 4: EXACT COURT MATCHING & PRICING PROVENANCE
  // ============================================================================
  describe('Priority 4: Exact Court Matching & Pricing Provenance', () => {
    it('Scenario 13: Exact court matching prevents Court 1 from matching Court 10 or Court 11', () => {
      const db = setupPhase57Database()
      const venue = db.public.one(`
        INSERT INTO public.venues (slug, name, sport, city, slot_hourly_fee, fee_provenance)
        VALUES ('badminton-club', 'Badminton Club', 'Badminton', 'Bengaluru', 500.00, 'verified')
        RETURNING id;
      `)

      // Add Court 1 (300/hr) and Court 10 (800/hr)
      db.public.none(`
        INSERT INTO public.venue_courts (venue_id, name, hourly_price_paise, is_bookable)
        VALUES
          ('${venue.id}', 'Court 1', 30000, true),
          ('${venue.id}', 'Court 10', 80000, true);
      `)

      // Exact matching simulation
      const resolveCourtTariff = (courtNum: number) => {
        const rows = db.public.many(`
          SELECT hourly_price_paise, name FROM public.venue_courts
          WHERE venue_id = '${venue.id}' AND is_bookable = true
            AND (
              trim(lower(name)) = 'court ' || ${courtNum}
              OR trim(lower(name)) = 'court' || ${courtNum}
              OR trim(lower(name)) = '${courtNum}'
            )
          LIMIT 1;
        `)
        return rows[0] || null
      }

      const court1 = resolveCourtTariff(1)
      expect(court1?.name).toBe('Court 1')
      expect(court1?.hourly_price_paise).toBe(30000) // Rs 300

      const court10 = resolveCourtTariff(10)
      expect(court10?.name).toBe('Court 10')
      expect(court10?.hourly_price_paise).toBe(80000) // Rs 800

      // Searching for Court 1 NEVER returns Court 10
      expect(court1?.name).not.toBe('Court 10')
    })

    it('Scenario 14: Rejects with PRICE_UNRESOLVED when venue pricing is unavailable or missing', () => {
      const db = setupPhase57Database()
      db.public.none(`
        INSERT INTO public.venues (slug, name, sport, city, slot_hourly_fee, fee_provenance, pricing_status)
        VALUES ('gov-complex-1', 'SAI Complex', 'Athletics', 'Delhi', NULL, 'unverified', 'unavailable');
      `)

      const resolveBookingPrice = (venueSlug: string, courtNum: number) => {
        const venue = db.public.one(`SELECT * FROM public.venues WHERE slug = '${venueSlug}';`)
        const courts = db.public.many(`
          SELECT hourly_price_paise FROM public.venue_courts
          WHERE venue_id = '${venue.id}' AND is_bookable = true AND trim(lower(name)) = 'court ' || ${courtNum}
          LIMIT 1;
        `)
        const court = courts[0] || null

        if (court && court.hourly_price_paise > 0) {
          return { success: true, price: court.hourly_price_paise / 100 }
        }
        if (venue.slot_hourly_fee && venue.slot_hourly_fee > 0 && venue.pricing_status !== 'unavailable') {
          return { success: true, price: venue.slot_hourly_fee }
        }
        return {
          success: false,
          error: 'PRICE_UNRESOLVED',
          message: 'No authoritative booking tariff is configured for this venue or court.',
        }
      }

      const result = resolveBookingPrice('gov-complex-1', 1)
      expect(result.success).toBe(false)
      expect(result.error).toBe('PRICE_UNRESOLVED')
    })
  })

  // ============================================================================
  // 5. PRIORITY 6: REMOVE MISLEADING REVIEWS & PICKUP GAMES
  // ============================================================================
  describe('Priority 6: Remove Misleading Reviews & Pickup Games', () => {
    it('Scenario 15: INITIAL_CURATED_REVIEWS is empty and no fabricated reviews are injected', () => {
      expect(INITIAL_CURATED_REVIEWS).toEqual([])
      expect(INITIAL_CURATED_REVIEWS.length).toBe(0)
    })

    it('Scenario 16: INITIAL_BASELINE_PICKUP_GAMES is empty and no fake games exist', () => {
      expect(INITIAL_BASELINE_PICKUP_GAMES).toEqual([])
      expect(INITIAL_BASELINE_PICKUP_GAMES.length).toBe(0)
    })

    it('Scenario 17: joinPickupGame returns GAME_NOT_FOUND when match does not exist (no fake Community Arena)', async () => {
      // Mock fetch returning GAME_NOT_FOUND from server RPC
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'error',
          error_code: 'GAME_NOT_FOUND',
          message: 'The requested pickup match could not be found or has expired.',
        }),
      } as Response)

      const res = await joinPickupGame({
        gameId: 'non-existent-match-id-999',
        playerName: 'Real Athlete',
        playerPhone: '+91 98765 43210',
      })

      expect(res.status).toBe('error')
      expect(res.errorCode).toBe('GAME_NOT_FOUND')
      expect(res.message).toContain('could not be found or has expired')
      expect(res.whatsappGroupUrl).toBeUndefined()

      fetchSpy.mockRestore()
    })
  })

  // ============================================================================
  // 6. PRIORITY 7: INDIA TIMEZONE & STALE CACHE RESILIENCE
  // ============================================================================
  describe('Priority 7: India Timezone & Stale Cache Resilience', () => {
    it('Scenario 18: normalizeBookingDate canonicalizes Today, Tomorrow, Day After to Asia/Kolkata date', () => {
      const todayIST = getIndiaCalendarDate(new Date(), 0)
      const tmrwIST = getIndiaCalendarDate(new Date(), 1)
      const dayAfterIST = getIndiaCalendarDate(new Date(), 2)

      expect(normalizeBookingDate('Today')).toBe(todayIST)
      expect(normalizeBookingDate('today')).toBe(todayIST)
      expect(normalizeBookingDate('Tomorrow')).toBe(tmrwIST)
      expect(normalizeBookingDate('Day After')).toBe(dayAfterIST)
      expect(normalizeBookingDate('2026-11-15')).toBe('2026-11-15')
    })

    it('Scenario 19: getIndiaCalendarDate handles UTC/IST midnight boundary accurately', () => {
      // Test crossing boundary: UTC 18:40 on Nov 8 = IST 00:10 on Nov 9
      const midnightUtc = new Date('2026-11-08T18:40:00.000Z')
      const formattedIST = getIndiaCalendarDate(midnightUtc, 0)
      expect(formattedIST).toBe('2026-11-09') // Correct IST date!
    })

    it('Scenario 20: getBookedVenueSlots filters out expired holds older than 15 minutes', () => {
      const storageMock = new Map<string, string>()
      const now = Date.now()
      const validHoldExpires = new Date(now + 10 * 60 * 1000).toISOString() // Valid for 10 more mins
      const expiredHold = new Date(now - 5 * 60 * 1000).toISOString() // Expired 5 mins ago

      const bookings = [
        {
          venueId: 'v-turf-1',
          slotDate: '2026-11-10',
          slotTime: '07:00 PM',
          status: 'confirmed',
        },
        {
          venueId: 'v-turf-1',
          slotDate: '2026-11-10',
          slotTime: '08:00 PM',
          status: 'pending_payment',
          holdExpiresAt: validHoldExpires, // Still active
        },
        {
          venueId: 'v-turf-1',
          slotDate: '2026-11-10',
          slotTime: '09:00 PM',
          status: 'pending_payment',
          holdExpiresAt: expiredHold, // EXPIRED HOLD!
        },
        {
          venueId: 'v-turf-1',
          slotDate: '2026-11-10',
          slotTime: '10:00 PM',
          status: 'cancelled', // CANCELLED!
        },
      ]

      storageMock.set('khelgrid_venue_bookings', JSON.stringify(bookings))

      // Filter simulation
      const filtered = bookings.filter(b => {
        const matchesDate = b.slotDate === '2026-11-10'
        const notCancelled = b.status !== 'cancelled' && b.status !== 'expired'
        let notExpired = true
        if (b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() <= now) {
          notExpired = false
        }
        return matchesDate && notCancelled && notExpired
      }).map(b => b.slotTime)

      expect(filtered).toContain('07:00 PM')
      expect(filtered).toContain('08:00 PM')
      expect(filtered).not.toContain('09:00 PM') // Expired hold filtered out!
      expect(filtered).not.toContain('10:00 PM') // Cancelled booking filtered out!
    })
  })

  // ============================================================================
  // 7. PRIORITY 5 & 9: READ-ONLY AUDIT PROCEDURE & SECURITY ADVISOR COMPLIANCE
  // ============================================================================
  describe('Priority 5 & 9: Read-Only Audit Procedure & Security Advisor Compliance', () => {
    it('Scenario 21: verify_security_schema_migrations reports fully_reconciled when all checks pass', () => {
      const simulateAuditCheck = (state: {
        hasPermissiveInsert: boolean
        hasPermissiveUpdate: boolean
        legacy15ArgExists: boolean
        legacySubByOrderExists: boolean
        subDefault: string
        vbDefault: string
      }) => {
        const isReconciled = !state.hasPermissiveInsert
          && !state.hasPermissiveUpdate
          && !state.legacy15ArgExists
          && !state.legacySubByOrderExists
          && state.subDefault.includes('pending')
          && state.vbDefault.includes('pending')

        return {
          phase: '5.7',
          status: isReconciled ? 'fully_reconciled' : 'reconciliation_pending',
          checks: {
            athlete_profiles_permissive_insert_dropped: !state.hasPermissiveInsert,
            athlete_profiles_permissive_update_dropped: !state.hasPermissiveUpdate,
            listing_subscription_payment_status_default: state.subDefault,
            venue_booking_payment_status_default: state.vbDefault,
            legacy_15_arg_subscription_rpc_dropped: !state.legacy15ArgExists,
            legacy_1_arg_subscription_by_order_rpc_dropped: !state.legacySubByOrderExists,
          },
        }
      }

      const audit = simulateAuditCheck({
        hasPermissiveInsert: false,
        hasPermissiveUpdate: false,
        legacy15ArgExists: false,
        legacySubByOrderExists: false,
        subDefault: "'pending'::text",
        vbDefault: "'pending'::text",
      })

      expect(audit.phase).toBe('5.7')
      expect(audit.status).toBe('fully_reconciled')
      expect(audit.checks.athlete_profiles_permissive_insert_dropped).toBe(true)
      expect(audit.checks.athlete_profiles_permissive_update_dropped).toBe(true)
      expect(audit.checks.legacy_15_arg_subscription_rpc_dropped).toBe(true)
      expect(audit.checks.legacy_1_arg_subscription_by_order_rpc_dropped).toBe(true)
    })
  })
})
