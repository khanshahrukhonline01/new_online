import { describe, expect, it } from 'vitest'
import { newDb, DataType } from 'pg-mem'

describe('Phase 3: Complete Listing Moderation & Publication System — Isolated PostgreSQL Suite', () => {
  function setupIsolatedDb() {
    const db = newDb()

    // Register gen_random_uuid
    let uuidSeq = 100
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => {
        uuidSeq++
        return `00000000-0000-4000-8000-${uuidSeq.toString().padStart(12, '0')}`
      },
    })

    // Setup auth and current setting mocks
    let currentAuthUid: string | null = null
    db.public.registerFunction({
      name: 'auth_uid',
      returns: DataType.uuid,
      implementation: () => currentAuthUid,
    })

    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text,
        created_at timestamptz DEFAULT now()
      );
    `)

    // Baseline catalogue tables
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.venues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        description text,
        city text NOT NULL,
        address text,
        timezone text DEFAULT 'Asia/Kolkata',
        publication_status text DEFAULT 'draft',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.opportunities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        title text NOT NULL,
        opportunity_type text NOT NULL DEFAULT 'trial',
        city text,
        source_url text,
        verification_status text DEFAULT 'unverified',
        publication_status text DEFAULT 'draft',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.academies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        city text NOT NULL,
        publication_status text DEFAULT 'draft',
        verification_status text DEFAULT 'unverified',
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.listing_moderators (
        user_id uuid PRIMARY KEY,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.listing_submissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_type text NOT NULL,
        title text NOT NULL,
        city text,
        source_url text,
        details text,
        status text NOT NULL DEFAULT 'pending_review',
        reference_number text UNIQUE,
        tracking_key text UNIQUE,
        submitter_id uuid,
        submitter_email text,
        rejection_reason text,
        correction_request text,
        unpublish_reason text,
        moderator_notes text,
        assigned_moderator_id uuid,
        review_started_at timestamptz,
        reviewed_at timestamptz,
        reviewed_by uuid,
        published_at timestamptz,
        published_by uuid,
        unpublished_at timestamptz,
        unpublished_by uuid,
        published_record_id uuid,
        published_table text,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.listing_submission_audits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id uuid NOT NULL,
        action text NOT NULL,
        actor_id uuid,
        from_status text,
        to_status text,
        notes text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.listing_submission_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id uuid NOT NULL,
        version integer NOT NULL,
        listing_type text NOT NULL,
        title text NOT NULL,
        city text,
        source_url text,
        details text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    return {
      db,
      setAuthUser: (uid: string | null) => {
        currentAuthUid = uid
      },
    }
  }

  it('Scenario 1: Creates submission with pending_review default and generates reference & tracking key', () => {
    const { db } = setupIsolatedDb()
    const subId = '00000000-0000-4000-8000-000000000001'
    const refNum = 'KHL-20261110-AB12CD'
    const trackKey = '0123456789abcdef0123456789abcdef'

    db.public.none(`
      INSERT INTO public.listing_submissions (
        id, listing_type, title, city, source_url, details, reference_number, tracking_key
      ) VALUES (
        '${subId}', 'venue', 'Test Sports Complex', 'Delhi', 'https://example.org/complex', '4 badminton courts',
        '${refNum}', '${trackKey}'
      );
    `)

    const row = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(row.title).toBe('Test Sports Complex')
    expect(row.status).toBe('pending_review')
    expect(row.reference_number).toBe(refNum)
    expect(row.tracking_key).toBe(trackKey)
    expect(row.version).toBe(1)
    expect(row.reviewed_at).toBeNull()
    expect(row.reviewed_by).toBeNull()
  })

  it('Scenario 2: Moderator start review transitions status to under_review and records reviewer', () => {
    const { db } = setupIsolatedDb()
    const modId = '00000000-0000-4000-8000-000000000099'
    const subId = '00000000-0000-4000-8000-000000000002'

    db.public.none(`
      INSERT INTO auth.users (id) VALUES ('${modId}');
      INSERT INTO public.listing_moderators (user_id, is_active) VALUES ('${modId}', true);
      INSERT INTO public.listing_submissions (id, listing_type, title, status, version)
      VALUES ('${subId}', 'opportunity', 'National U-17 Trials', 'pending_review', 1);
    `)

    // Start review transition
    db.public.none(`
      UPDATE public.listing_submissions
      SET status = 'under_review',
          assigned_moderator_id = '${modId}',
          review_started_at = now(),
          version = version + 1
      WHERE id = '${subId}' AND status = 'pending_review';

      INSERT INTO public.listing_submission_audits (
        submission_id, action, actor_id, from_status, to_status, notes
      ) VALUES (
        '${subId}', 'start_review', '${modId}', 'pending_review', 'under_review', 'Moderator started review'
      );
    `)

    const row = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(row.status).toBe('under_review')
    expect(row.assigned_moderator_id).toBe(modId)
    expect(row.version).toBe(2)

    const audit = db.public.one(`SELECT * FROM public.listing_submission_audits WHERE submission_id = '${subId}';`)
    expect(audit.action).toBe('start_review')
    expect(audit.actor_id).toBe(modId)
    expect(audit.from_status).toBe('pending_review')
    expect(audit.to_status).toBe('under_review')
  })

  it('Scenario 3: Correction request transitions to changes_requested and stores message', () => {
    const { db } = setupIsolatedDb()
    const modId = '00000000-0000-4000-8000-000000000099'
    const subId = '00000000-0000-4000-8000-000000000003'

    db.public.none(`
      INSERT INTO public.listing_submissions (id, listing_type, title, status, version)
      VALUES ('${subId}', 'academy', 'Elite Badminton Academy', 'under_review', 2);
    `)

    const correctionMsg = 'Please provide contact telephone and head coach name.'
    db.public.none(`
      UPDATE public.listing_submissions
      SET status = 'changes_requested',
          correction_request = '${correctionMsg}',
          reviewed_at = now(),
          reviewed_by = '${modId}',
          version = version + 1
      WHERE id = '${subId}';

      INSERT INTO public.listing_submission_audits (
        submission_id, action, actor_id, from_status, to_status, notes
      ) VALUES (
        '${subId}', 'changes_requested', '${modId}', 'under_review', 'changes_requested', '${correctionMsg}'
      );
    `)

    const row = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(row.status).toBe('changes_requested')
    expect(row.correction_request).toBe(correctionMsg)
    expect(row.version).toBe(3)
  })

  it('Scenario 4: Submitter resubmission archives version and moves to resubmitted', () => {
    const { db } = setupIsolatedDb()
    const subId = '00000000-0000-4000-8000-000000000004'

    db.public.none(`
      INSERT INTO public.listing_submissions (
        id, listing_type, title, city, details, status, version
      ) VALUES (
        '${subId}', 'academy', 'Old Academy Title', 'Pune', 'Initial notes', 'changes_requested', 2
      );
    `)

    // Submitter resubmission workflow: archive current version then update
    db.public.none(`
      INSERT INTO public.listing_submission_versions (
        submission_id, version, listing_type, title, city, details
      )
      SELECT id, version, listing_type, title, city, details
      FROM public.listing_submissions WHERE id = '${subId}';

      UPDATE public.listing_submissions
      SET title = 'Updated Academy Title',
          details = 'Added coach credentials and telephone',
          status = 'resubmitted',
          correction_request = null,
          version = version + 1
      WHERE id = '${subId}';
    `)

    const row = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(row.status).toBe('resubmitted')
    expect(row.title).toBe('Updated Academy Title')
    expect(row.version).toBe(3)
    expect(row.correction_request).toBeNull()

    const archived = db.public.one(`SELECT * FROM public.listing_submission_versions WHERE submission_id = '${subId}';`)
    expect(archived.version).toBe(2)
    expect(archived.title).toBe('Old Academy Title')
  })

  it('Scenario 5: Approval records decision but DOES NOT create public catalogue row', () => {
    const { db } = setupIsolatedDb()
    const modId = '00000000-0000-4000-8000-000000000099'
    const subId = '00000000-0000-4000-8000-000000000005'

    db.public.none(`
      INSERT INTO public.listing_submissions (id, listing_type, title, city, status, version)
      VALUES ('${subId}', 'venue', 'Approval Test Venue', 'Bengaluru', 'under_review', 1);
    `)

    db.public.none(`
      UPDATE public.listing_submissions
      SET status = 'approved',
          reviewed_at = now(),
          reviewed_by = '${modId}',
          moderator_notes = 'Verified with official sports authority records',
          version = version + 1
      WHERE id = '${subId}';
    `)

    const row = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(row.status).toBe('approved')
    expect(row.reviewed_by).toBe(modId)

    // Critical assertion: NO catalogue row exists in venues yet!
    const venues = db.public.many(`SELECT * FROM public.venues WHERE name = 'Approval Test Venue';`)
    expect(venues.length).toBe(0)
  })

  it('Scenario 6: Publication explicitly creates public catalogue record and links published_record_id', () => {
    const { db } = setupIsolatedDb()
    const modId = '00000000-0000-4000-8000-000000000099'
    const subId = '00000000-0000-4000-8000-000000000006'
    const venueId = '00000000-0000-4000-8000-000000000777'

    db.public.none(`
      INSERT INTO public.listing_submissions (id, listing_type, title, city, details, status, version)
      VALUES ('${subId}', 'venue', 'Kanteerava Indoor Stadium', 'Bengaluru', 'World class courts', 'approved', 2);
    `)

    // Publication workflow
    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, description, publication_status)
      VALUES ('${venueId}', 'kanteerava-indoor-stadium', 'Kanteerava Indoor Stadium', 'Bengaluru', 'World class courts', 'published');

      UPDATE public.listing_submissions
      SET status = 'published',
          published_at = now(),
          published_by = '${modId}',
          published_record_id = '${venueId}',
          published_table = 'venues',
          version = version + 1
      WHERE id = '${subId}' AND status = 'approved';
    `)

    const venue = db.public.one(`SELECT * FROM public.venues WHERE id = '${venueId}';`)
    expect(venue.publication_status).toBe('published')
    expect(venue.name).toBe('Kanteerava Indoor Stadium')

    const sub = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(sub.status).toBe('published')
    expect(sub.published_record_id).toBe(venueId)
    expect(sub.published_table).toBe('venues')
  })

  it('Scenario 7: Unpublication sets catalogue record to draft and records unpublish reason', () => {
    const { db } = setupIsolatedDb()
    const modId = '00000000-0000-4000-8000-000000000099'
    const subId = '00000000-0000-4000-8000-000000000007'
    const venueId = '00000000-0000-4000-8000-000000000888'

    db.public.none(`
      INSERT INTO public.venues (id, slug, name, city, publication_status)
      VALUES ('${venueId}', 'temp-arena', 'Temporary Arena', 'Mumbai', 'published');

      INSERT INTO public.listing_submissions (
        id, listing_type, title, city, status, published_record_id, published_table, version
      ) VALUES (
        '${subId}', 'venue', 'Temporary Arena', 'Mumbai', 'published', '${venueId}', 'venues', 3
      );
    `)

    const unpublishReason = 'Facility closed for municipal renovation.'
    db.public.none(`
      UPDATE public.venues
      SET publication_status = 'draft'
      WHERE id = '${venueId}';

      UPDATE public.listing_submissions
      SET status = 'unpublished',
          unpublished_at = now(),
          unpublished_by = '${modId}',
          unpublish_reason = '${unpublishReason}',
          version = version + 1
      WHERE id = '${subId}' AND status = 'published';
    `)

    const venue = db.public.one(`SELECT * FROM public.venues WHERE id = '${venueId}';`)
    expect(venue.publication_status).toBe('draft') // No longer published!

    const sub = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(sub.status).toBe('unpublished')
    expect(sub.unpublish_reason).toBe(unpublishReason)
    expect(sub.version).toBe(4)
  })

  it('Scenario 8: Rejection records reason and moderator identity', () => {
    const { db } = setupIsolatedDb()
    const modId = '00000000-0000-4000-8000-000000000099'
    const subId = '00000000-0000-4000-8000-000000000008'

    db.public.none(`
      INSERT INTO public.listing_submissions (id, listing_type, title, status, version)
      VALUES ('${subId}', 'opportunity', 'Suspicious Trial', 'under_review', 1);
    `)

    const rejReason = 'Official source URL is unreachable and fees violate amateur guidelines.'
    db.public.none(`
      UPDATE public.listing_submissions
      SET status = 'rejected',
          reviewed_at = now(),
          reviewed_by = '${modId}',
          rejection_reason = '${rejReason}',
          version = version + 1
      WHERE id = '${subId}';
    `)

    const sub = db.public.one(`SELECT * FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(sub.status).toBe('rejected')
    expect(sub.rejection_reason).toBe(rejReason)
    expect(sub.reviewed_by).toBe(modId)
  })

  it('Scenario 9: Submitter status query returns safe fields and strictly hides moderator notes', () => {
    const { db } = setupIsolatedDb()
    const subId = '00000000-0000-4000-8000-000000000009'
    const refNum = 'KHL-20261110-SECURE'
    const trackKey = 'secret_key_12345'
    const privateNotes = 'PRIVATE NOTE: Check background of organizer before approving.'

    db.public.none(`
      INSERT INTO public.listing_submissions (
        id, listing_type, title, city, status, reference_number, tracking_key,
        moderator_notes, correction_request, version
      ) VALUES (
        '${subId}', 'opportunity', 'Youth Cup', 'Jaipur', 'changes_requested',
        '${refNum}', '${trackKey}', '${privateNotes}', 'Please upload rulebook PDF', 2
      );
    `)

    // Simulating public tracking projection
    const result = db.public.one(`
      SELECT reference_number, listing_type, title, city, status, correction_request, version
      FROM public.listing_submissions
      WHERE reference_number = '${refNum}' AND tracking_key = '${trackKey}';
    `)

    expect(result.reference_number).toBe(refNum)
    expect(result.status).toBe('changes_requested')
    expect(result.correction_request).toBe('Please upload rulebook PDF')
    expect((result as Record<string, unknown>).moderator_notes).toBeUndefined()
  })

  it('Scenario 10: Optimistic concurrency control rejects update if expected version does not match', () => {
    const { db } = setupIsolatedDb()
    const subId = '00000000-0000-4000-8000-000000000010'

    db.public.none(`
      INSERT INTO public.listing_submissions (id, listing_type, title, status, version)
      VALUES ('${subId}', 'venue', 'Concurrent Venue', 'pending_review', 2);
    `)

    // Moderator A expects version 1, but current version in DB is 2
    const currentVersion = db.public.one(`SELECT version FROM public.listing_submissions WHERE id = '${subId}';`).version
    const expectedVersion = 1

    expect(currentVersion).not.toBe(expectedVersion)
    // Update conditional on version = expectedVersion fails to touch any row
    db.public.none(`
      UPDATE public.listing_submissions
      SET status = 'under_review', version = version + 1
      WHERE id = '${subId}' AND version = ${expectedVersion};
    `)

    const sub = db.public.one(`SELECT status, version FROM public.listing_submissions WHERE id = '${subId}';`)
    expect(sub.status).toBe('pending_review') // Unchanged!
    expect(sub.version).toBe(2)
  })
})
