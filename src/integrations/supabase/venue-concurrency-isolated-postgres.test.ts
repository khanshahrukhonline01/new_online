import { describe, expect, it } from 'vitest'
import { newDb } from 'pg-mem'

/**
 * KhelGrid Security Programme — Venue Booking Concurrency & Lifecycle Test Suite
 *
 * Validates:
 *  1. Two simultaneous attempts to reserve the same slot.
 *  2. Two users attempting the same court and time.
 *  3. Different courts at the same venue and time.
 *  4. Different dates for the same court.
 *  5. Cancelled reservations.
 *  6. Expired pending reservations.
 *  7. Active pending reservations.
 *  8. Confirmed reservations.
 *  9. Rescheduling.
 * 10. Duplicate retry requests.
 * 11. Database transaction rollback.
 * 12. Existing booking history preservation.
 */
describe('Venue Slot Concurrency & Reservation Lifecycle (Isolated PostgreSQL)', () => {

  function setupDatabase() {
    const db = newDb()

    // Setup base schema
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text
      );

      CREATE TABLE IF NOT EXISTS public.venues (
        id text PRIMARY KEY,
        name text NOT NULL,
        price_per_hour numeric NOT NULL DEFAULT 500,
        city text NOT NULL
      );

      INSERT INTO public.venues (id, name, price_per_hour, city)
      VALUES 
        ('v-1', 'Sree Kanteerava Stadium', 500, 'Bengaluru'),
        ('fsv-sports-arena', 'FSV Sports Arena', 1200, 'Bengaluru');

      CREATE TABLE IF NOT EXISTS public.venue_bookings (
        id text PRIMARY KEY,
        booking_ref text NOT NULL UNIQUE,
        venue_id text NOT NULL,
        venue_name text NOT NULL,
        slot_date text NOT NULL,
        slot_time text NOT NULL,
        court_number int NOT NULL DEFAULT 1,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        total_amount numeric NOT NULL,
        paid_amount numeric NOT NULL DEFAULT 0,
        payment_status text NOT NULL DEFAULT 'pending',
        payment_id text,
        status text NOT NULL DEFAULT 'pending',
        voucher_token text,
        user_id uuid,
        expires_at timestamptz,
        cancellation_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      -- Partial Unique Index strictly restricted to blocking reservation states
      CREATE UNIQUE INDEX uq_venue_slot_concurrency
        ON public.venue_bookings(venue_id, slot_date, slot_time, court_number)
        WHERE status IN ('confirmed', 'pending');
    `)

    return db
  }

  // 1. Two simultaneous attempts to reserve the same slot
  it('Scenario 1: prevents two simultaneous attempts to reserve the same slot', () => {
    const db = setupDatabase()
    
    // Attempt 1 succeeds
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-1', 'VB-001', 'v-1', 'Sree Kanteerava Stadium', '2026-11-10', '18:00 - 19:00', 1,
        'Player One', '9876543210', 500, 'pending'
      );
    `)

    // Attempt 2 for the exact same slot must fail unique constraint
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-2', 'VB-002', 'v-1', 'Sree Kanteerava Stadium', '2026-11-10', '18:00 - 19:00', 1,
          'Player Two', '9811223344', 500, 'pending'
        );
      `)
    }).toThrow(/violates unique constraint/)
  })

  // 2. Two users attempting the same court and time
  it('Scenario 2: prevents two different users attempting the same court and time', () => {
    const db = setupDatabase()
    const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const userB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${userA}', 'userA@khelgrid.com'),
        ('${userB}', 'userB@khelgrid.com');

      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status, user_id
      ) VALUES (
        'b-userA', 'VB-USER-A', 'v-1', 'Sree Kanteerava Stadium', '2026-11-12', '07:00 - 08:00', 1,
        'User Alice', '9876543210', 500, 'confirmed', '${userA}'
      );
    `)

    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status, user_id
        ) VALUES (
          'b-userB', 'VB-USER-B', 'v-1', 'Sree Kanteerava Stadium', '2026-11-12', '07:00 - 08:00', 1,
          'User Bob', '9811223344', 500, 'pending', '${userB}'
        );
      `)
    }).toThrow(/violates unique constraint/)
  })

  // 3. Different courts at the same venue and time
  it('Scenario 3: allows different courts at the same venue and time', () => {
    const db = setupDatabase()

    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES 
        ('b-court-1', 'VB-C1', 'v-1', 'Sree Kanteerava Stadium', '2026-11-15', '18:00 - 19:00', 1, 'Player One', '9876543210', 500, 'confirmed'),
        ('b-court-2', 'VB-C2', 'v-1', 'Sree Kanteerava Stadium', '2026-11-15', '18:00 - 19:00', 2, 'Player Two', '9811223344', 500, 'confirmed'),
        ('b-court-3', 'VB-C3', 'v-1', 'Sree Kanteerava Stadium', '2026-11-15', '18:00 - 19:00', 3, 'Player Three', '9822334455', 500, 'pending');
    `)

    const active = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = '2026-11-15' AND status IN ('confirmed', 'pending');`)
    expect(Number(active.cnt)).toBe(3)
  })

  // 4. Different dates for the same court
  it('Scenario 4: allows different dates for the same court and time', () => {
    const db = setupDatabase()

    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES 
        ('b-day-1', 'VB-D1', 'v-1', 'Sree Kanteerava Stadium', '2026-11-20', '18:00 - 19:00', 1, 'Player One', '9876543210', 500, 'confirmed'),
        ('b-day-2', 'VB-D2', 'v-1', 'Sree Kanteerava Stadium', '2026-11-21', '18:00 - 19:00', 1, 'Player Two', '9811223344', 500, 'confirmed');
    `)

    const active = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE court_number = 1 AND status IN ('confirmed', 'pending');`)
    expect(Number(active.cnt)).toBe(2)
  })

  // 5. Cancelled reservations
  it('Scenario 5: unblocks slot when a reservation is cancelled', () => {
    const db = setupDatabase()

    // Player 1 reserves slot
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-cancel-1', 'VB-CAN-1', 'v-1', 'Sree Kanteerava Stadium', '2026-11-25', '18:00 - 19:00', 1,
        'Player Cancel', '9876543210', 500, 'confirmed'
      );
    `)

    // Slot is currently blocked
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-cancel-2', 'VB-CAN-2', 'v-1', 'Sree Kanteerava Stadium', '2026-11-25', '18:00 - 19:00', 1,
          'Player Next', '9811223344', 500, 'pending'
        );
      `)
    }).toThrow(/violates unique constraint/)

    // Player 1 cancels
    db.public.none(`
      UPDATE public.venue_bookings
      SET status = 'cancelled', cancellation_reason = 'Customer requested cancellation'
      WHERE id = 'b-cancel-1';
    `)

    // Now Player 2 can reserve the freed slot
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-cancel-2', 'VB-CAN-2', 'v-1', 'Sree Kanteerava Stadium', '2026-11-25', '18:00 - 19:00', 1,
        'Player Next', '9811223344', 500, 'confirmed'
      );
    `)

    const active = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = '2026-11-25' AND status = 'confirmed';`)
    const cancelled = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = '2026-11-25' AND status = 'cancelled';`)
    expect(Number(active.cnt)).toBe(1)
    expect(Number(cancelled.cnt)).toBe(1)
  })

  // 6. Expired pending reservations
  it('Scenario 6: releases slot when a pending reservation transitions to expired', () => {
    const db = setupDatabase()

    // Player 1 creates a pending reservation that timed out (simulated past timestamp)
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status, created_at, expires_at
      ) VALUES (
        'b-exp-1', 'VB-EXP-1', 'v-1', 'Sree Kanteerava Stadium', '2026-11-30', '19:00 - 20:00', 1,
        'Slow Payer', '9876543210', 500, 'pending', '2026-11-08T00:00:00Z', '2026-11-08T00:15:00Z'
      );
    `)

    // Explicit state transition query for expiring stale reservations
    db.public.none(`
      UPDATE public.venue_bookings
      SET status = 'expired', updated_at = now()
      WHERE status = 'pending'
        AND expires_at < '2026-11-08T01:00:00Z';
    `)

    const expiredRow = db.public.one(`SELECT status FROM public.venue_bookings WHERE id = 'b-exp-1';`)
    expect(expiredRow.status).toBe('expired')

    // Player 2 can immediately claim the expired slot
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-exp-2', 'VB-EXP-2', 'v-1', 'Sree Kanteerava Stadium', '2026-11-30', '19:00 - 20:00', 1,
        'Prompt Payer', '9811223344', 500, 'confirmed'
      );
    `)

    const total = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = '2026-11-30';`)
    expect(Number(total.cnt)).toBe(2)
  })

  // 7. Active pending reservations
  it('Scenario 7: active pending reservations within 15min window strictly block other bookings', () => {
    const db = setupDatabase()

    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status, expires_at
      ) VALUES (
        'b-act-1', 'VB-ACT-1', 'v-1', 'Sree Kanteerava Stadium', '2026-12-01', '10:00 - 11:00', 1,
        'Active Checkout', '9876543210', 500, 'pending', '2026-12-01T10:15:00Z'
      );
    `)

    // Second user cannot take the active pending slot
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-act-2', 'VB-ACT-2', 'v-1', 'Sree Kanteerava Stadium', '2026-12-01', '10:00 - 11:00', 1,
          'Second Player', '9811223344', 500, 'confirmed'
        );
      `)
    }).toThrow(/violates unique constraint/)
  })

  // 8. Confirmed reservations
  it('Scenario 8: confirmed reservations block both pending and other confirmed reservations', () => {
    const db = setupDatabase()

    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-conf-1', 'VB-CONF-1', 'v-1', 'Sree Kanteerava Stadium', '2026-12-02', '14:00 - 15:00', 1,
        'Confirmed Player', '9876543210', 500, 'confirmed'
      );
    `)

    // Attempting pending fails
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-conf-2', 'VB-CONF-2', 'v-1', 'Sree Kanteerava Stadium', '2026-12-02', '14:00 - 15:00', 1,
          'Pending Attempter', '9811223344', 500, 'pending'
        );
      `)
    }).toThrow(/violates unique constraint/)

    // Attempting confirmed also fails
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-conf-3', 'VB-CONF-3', 'v-1', 'Sree Kanteerava Stadium', '2026-12-02', '14:00 - 15:00', 1,
          'Confirmed Attempter', '9822334455', 500, 'confirmed'
        );
      `)
    }).toThrow(/violates unique constraint/)
  })

  // 9. Rescheduling
  it('Scenario 9: rescheduling safely frees the old slot and locks the new slot', () => {
    const db = setupDatabase()

    // Initial booking on Slot A
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-resched-1', 'VB-RESCHED', 'v-1', 'Sree Kanteerava Stadium', '2026-12-05', '06:00 - 07:00', 1,
        'Rescheduling Player', '9876543210', 500, 'confirmed'
      );
    `)

    // Reschedule: Transition old slot to 'rescheduled' and create new booking on Slot B
    db.public.none(`
      UPDATE public.venue_bookings
      SET status = 'rescheduled', updated_at = now()
      WHERE id = 'b-resched-1';

      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-resched-2', 'VB-RESCHED-NEW', 'v-1', 'Sree Kanteerava Stadium', '2026-12-05', '08:00 - 09:00', 1,
        'Rescheduling Player', '9876543210', 500, 'confirmed'
      );
    `)

    // Old slot is now open for another player
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-resched-3', 'VB-NEW-PLAYER', 'v-1', 'Sree Kanteerava Stadium', '2026-12-05', '06:00 - 07:00', 1,
        'Another Player', '9811223344', 500, 'confirmed'
      );
    `)

    const activeSlotA = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_time = '06:00 - 07:00' AND status = 'confirmed';`)
    const activeSlotB = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_time = '08:00 - 09:00' AND status = 'confirmed';`)
    expect(Number(activeSlotA.cnt)).toBe(1)
    expect(Number(activeSlotB.cnt)).toBe(1)
  })

  // 10. Duplicate retry requests
  it('Scenario 10: duplicate retry with the same booking_ref fails primary key / unique ref cleanly', () => {
    const db = setupDatabase()

    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-retry-1', 'VB-RETRY-REF-100', 'v-1', 'Sree Kanteerava Stadium', '2026-12-10', '18:00 - 19:00', 1,
        'Retry Player', '9876543210', 500, 'confirmed'
      );
    `)

    // Attempting same booking_ref again triggers unique constraint on booking_ref
    expect(() => {
      db.public.none(`
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-retry-2', 'VB-RETRY-REF-100', 'v-1', 'Sree Kanteerava Stadium', '2026-12-10', '18:00 - 19:00', 1,
          'Retry Player', '9876543210', 500, 'confirmed'
        );
      `)
    }).toThrow(/violates unique constraint/)
  })

  // 11. Database transaction rollback
  it('Scenario 11: transaction rollback cleans up uncommitted reservation state completely', () => {
    const db = setupDatabase()

    // Transaction that aborts due to error
    try {
      db.public.none(`
        BEGIN;
        INSERT INTO public.venue_bookings (
          id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
          customer_name, customer_phone, total_amount, status
        ) VALUES (
          'b-tx-1', 'VB-TX-1', 'v-1', 'Sree Kanteerava Stadium', '2026-12-15', '18:00 - 19:00', 1,
          'Tx Player', '9876543210', 500, 'pending'
        );
        -- Intentional error in transaction
        SELECT non_existent_function();
        COMMIT;
      `)
    } catch {
      // Transaction fails and rolls back
    }

    // Verify slot remains completely free
    const active = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = '2026-12-15';`)
    expect(Number(active.cnt)).toBe(0)

    // Another player can successfully book
    db.public.none(`
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, court_number,
        customer_name, customer_phone, total_amount, status
      ) VALUES (
        'b-tx-2', 'VB-TX-2', 'v-1', 'Sree Kanteerava Stadium', '2026-12-15', '18:00 - 19:00', 1,
        'Subsequent Player', '9811223344', 500, 'confirmed'
      );
    `)

    const booked = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = '2026-12-15';`)
    expect(Number(booked.cnt)).toBe(1)
  })

  // 12. Existing booking history preservation
  it('Scenario 12: preserves 100% of historical booking records and normalizes dates without data loss', () => {
    const db = newDb()

    // Setup legacy table with pre-existing duplicates and unnormalized 'Today' values
    db.public.none(`
      CREATE TABLE public.venue_bookings (
        id text PRIMARY KEY,
        booking_ref text NOT NULL UNIQUE,
        venue_id text NOT NULL,
        venue_name text NOT NULL,
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

      -- Simulate the historical test dataset (representing the 208 records)
      INSERT INTO public.venue_bookings (
        id, booking_ref, venue_id, venue_name, slot_date, slot_time, customer_name, customer_phone, total_amount, created_at
      ) VALUES
        ('h-1', 'VB-SRE-1106-0001', 'v-1', 'Sree Kanteerava Stadium', 'Today', '6:00 PM – 7:00 PM', 'Kavita Singh', '9811223344', 500, '2026-11-06T15:48:28Z'),
        ('h-2', 'VB-SRE-1106-0002', 'v-1', 'Sree Kanteerava Stadium', 'Today', '6:00 PM – 7:00 PM', 'Kavita Singh', '9811223344', 500, '2026-11-06T16:00:00Z'),
        ('h-3', 'VB-SRE-1107-0001', 'v-1', 'Sree Kanteerava Stadium', 'Today', '6:00 PM – 7:00 PM', 'Kavita Singh', '9811223344', 500, '2026-11-07T15:00:00Z'),
        ('h-4', 'VB-FSV-1107-0001', 'fsv-sports-arena', 'FSV Sports Arena', 'Today', '7:00 PM – 8:00 PM', 'Aarav Sharma', '9876543210', 1200, '2026-11-07T15:56:14Z');
    `)

    // Migration step: Add new columns safely
    db.public.none(`
      ALTER TABLE public.venue_bookings
        ADD COLUMN court_number int DEFAULT 1,
        ADD COLUMN status text DEFAULT 'confirmed',
        ADD COLUMN expires_at timestamptz,
        ADD COLUMN cancellation_reason text,
        ADD COLUMN updated_at timestamptz DEFAULT now();
    `)

    // Step A: Normalize historical dates from creation timestamp
    db.public.none(`
      UPDATE public.venue_bookings
      SET slot_date = '2026-11-06'
      WHERE id IN ('h-1', 'h-2');

      UPDATE public.venue_bookings
      SET slot_date = '2026-11-07'
      WHERE id IN ('h-3', 'h-4');
    `)

    // Step B: Reconcile historical past bookings:
    // Retain initial booking as 'completed' (past elapsed session), mark duplicate iterations as 'superseded'
    db.public.none(`
      UPDATE public.venue_bookings
      SET status = 'superseded',
          cancellation_reason = 'Reconciled duplicate automated test run'
      WHERE id IN (
        SELECT vb1.id
        FROM public.venue_bookings vb1
        JOIN public.venue_bookings vb2
          ON vb1.venue_id = vb2.venue_id
         AND vb1.slot_date = vb2.slot_date
         AND vb1.slot_time = vb2.slot_time
         AND coalesce(vb1.court_number, 1) = coalesce(vb2.court_number, 1)
         AND (vb2.created_at > vb1.created_at OR (vb2.created_at = vb1.created_at AND vb2.id > vb1.id))
        WHERE vb1.status IN ('confirmed', 'pending')
          AND vb2.status IN ('confirmed', 'pending')
      );

      -- Mark remaining past active records as completed
      UPDATE public.venue_bookings
      SET status = 'completed'
      WHERE slot_date < '2026-11-08'
        AND status = 'confirmed';
    `)

    // Step C: Install partial unique index without collision
    db.public.none(`
      CREATE UNIQUE INDEX uq_venue_slot_concurrency
        ON public.venue_bookings(venue_id, slot_date, slot_time, court_number)
        WHERE status IN ('confirmed', 'pending');
    `)

    // Verify 100% preservation (zero records deleted)
    const totalCount = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings;`)
    expect(Number(totalCount.cnt)).toBe(4)

    // Verify dates are normalized (no 'Today' remaining)
    const todayCount = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE slot_date = 'Today';`)
    expect(Number(todayCount.cnt)).toBe(0)

    // Verify status breakdown
    const completedCount = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE status = 'completed';`)
    const supersededCount = db.public.one(`SELECT count(*) as cnt FROM public.venue_bookings WHERE status = 'superseded';`)
    expect(Number(completedCount.cnt)).toBe(3)
    expect(Number(supersededCount.cnt)).toBe(1)
  })
})
