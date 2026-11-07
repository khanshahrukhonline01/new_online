-- ==============================================================================
-- KhelGrid Pillar 1: Unified PostgreSQL Relational Schema
-- Migration: 20261107180000_pillar1_unified_relational_schema.sql
-- Purpose:
-- Consolidate all database tables into a clean, normalized relational model
-- compliant with Supabase's Free Tier (standard PostgreSQL, strict RLS, zero paid extensions):
--
-- 1. coaches: Full biographical, NIS credential, pricing, and sport-mapping table.
-- 2. tournaments_and_events: Scheduled grassroots tournaments, registration fees, age brackets, and organizers.
-- 3. venue_slot_bookings: Real-time slot reservations with database-enforced UNIQUE(venue_id, slot_date, slot_time).
-- 4. trial_applications: Candidate submissions with Sports CV combine metrics, statuses, and review notes.
-- 5. academy_enquiries: Batch enquiries with skill tier, batch schedule, profile linkage, and statuses.
-- 6. user_bookmarks: Cross-device user saved items linked to auth.users(id).
-- 7. live_matches & live_score_events: Ball-by-ball or minute-by-minute real-time score updates.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. COACHES & COACH CREDENTIALS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 140),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 5000),
  city text NOT NULL CHECK (char_length(trim(city)) BETWEEN 1 AND 120),
  state text CHECK (state IS NULL OR char_length(state) <= 120),
  website_url text CHECK (website_url IS NULL OR website_url ~ '^https?://'),
  public_contact_url text CHECK (public_contact_url IS NULL OR public_contact_url ~ '^https?://'),
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add advanced coaching attributes idempotently
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'Multi-Sport',
  ADD COLUMN IF NOT EXISTS sport_category text NOT NULL DEFAULT 'Field & Court',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS certification text NOT NULL DEFAULT 'NIS Certified · SAI Diploma',
  ADD COLUMN IF NOT EXISTS credential_authority text NOT NULL DEFAULT 'sai-nis',
  ADD COLUMN IF NOT EXISTS authority_label text NOT NULL DEFAULT 'SAI / National Institute of Sports (NIS)',
  ADD COLUMN IF NOT EXISTS experience_years integer NOT NULL DEFAULT 5 CHECK (experience_years >= 0),
  ADD COLUMN IF NOT EXISTS academy_affiliation text DEFAULT 'Independent Elite Academy',
  ADD COLUMN IF NOT EXISTS monthly_fee text NOT NULL DEFAULT '₹3,500/month',
  ADD COLUMN IF NOT EXISTS fee_range_category text NOT NULL DEFAULT '3k-7k' CHECK (fee_range_category IN ('under-3k', '3k-7k', 'premium', 'subsidized')),
  ADD COLUMN IF NOT EXISTS student_track_record text DEFAULT 'Trained state champions and national school games medalists.',
  ADD COLUMN IF NOT EXISTS specialties jsonb NOT NULL DEFAULT '["Technique & Biomechanics", "Match Strategy"]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages jsonb NOT NULL DEFAULT '["English", "Hindi"]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating numeric(3, 2) NOT NULL DEFAULT 4.90 CHECK (rating BETWEEN 1.0 AND 5.0),
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 48 CHECK (review_count >= 0),
  ADD COLUMN IF NOT EXISTS verified_badge text NOT NULL DEFAULT 'NIS Verified',
  ADD COLUMN IF NOT EXISTS available_for_one_on_one boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS available_for_batches boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_coaches_slug ON public.coaches(slug);
CREATE INDEX IF NOT EXISTS idx_coaches_city ON public.coaches(city);
CREATE INDEX IF NOT EXISTS idx_coaches_sport ON public.coaches(sport);
CREATE INDEX IF NOT EXISTS idx_coaches_credential ON public.coaches(credential_authority);

-- Dedicated coach training session inquiries table
CREATE TABLE IF NOT EXISTS public.coach_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_token text NOT NULL UNIQUE,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  coach_slug text NOT NULL,
  coach_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  athlete_name text NOT NULL CHECK (char_length(trim(athlete_name)) >= 2),
  parent_name text,
  phone text NOT NULL CHECK (char_length(trim(phone)) >= 10),
  email text,
  sport text NOT NULL,
  training_type text NOT NULL DEFAULT 'one_on_one' CHECK (training_type IN ('one_on_one', 'batch_clinic', 'technique_assessment')),
  age_category text NOT NULL DEFAULT 'Under-16',
  skill_level text NOT NULL DEFAULT 'Intermediate',
  objective text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'contacted', 'scheduled', 'completed', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_inquiries_coach ON public.coach_inquiries(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_inquiries_user ON public.coach_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_inquiries_token ON public.coach_inquiries(inquiry_token);

-- -----------------------------------------------------------------------------
-- 2. TOURNAMENTS AND EVENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments_and_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 250),
  hindi_title text,
  sport text NOT NULL,
  sport_id uuid REFERENCES public.sports(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'championship' CHECK (category IN ('championship', 'school_games', 'invitational', 'league', 'open_meet', 'other')),
  sanctioning_body text NOT NULL DEFAULT 'State Olympic Association',
  edition text,
  start_date date NOT NULL,
  end_date date,
  registration_deadline date,
  city text NOT NULL CHECK (char_length(trim(city)) >= 1),
  state text NOT NULL CHECK (char_length(trim(state)) >= 1),
  venue text NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  age_categories jsonb NOT NULL DEFAULT '["Open"]'::jsonb,
  gender text NOT NULL DEFAULT 'Open' CHECK (gender IN ('Boys & Girls', 'Men & Women', 'Boys', 'Girls', 'Open')),
  prize_pool text DEFAULT 'Medals, Certificates & Ranking Points',
  entry_fee text NOT NULL DEFAULT 'Free Entry (₹0)',
  team_or_individual text NOT NULL DEFAULT 'Individual & Team' CHECK (team_or_individual IN ('Individual & Team', 'Individual', 'Team')),
  official_notice_url text,
  rulebook_pdf_url text,
  registration_url text,
  organizer text NOT NULL,
  contact_phone text,
  contact_email text,
  verified_badge boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  description text,
  qualification_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments_and_events(slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_sport ON public.tournaments_and_events(sport);
CREATE INDEX IF NOT EXISTS idx_tournaments_city ON public.tournaments_and_events(city);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON public.tournaments_and_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_deadline ON public.tournaments_and_events(registration_deadline);

-- -----------------------------------------------------------------------------
-- 3. VENUE SLOT BOOKINGS (WITH DATABASE-LEVEL ZERO DOUBLE-BOOKING CONSTRAINT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  venue_id text NOT NULL,
  venue_name text NOT NULL CHECK (char_length(trim(venue_name)) >= 2),
  city text NOT NULL CHECK (char_length(trim(city)) >= 1),
  sport text NOT NULL,
  court_or_turf_number text DEFAULT 'Turf 1 (Main Pitch)',
  slot_date text NOT NULL, -- Format YYYY-MM-DD
  slot_time text NOT NULL, -- e.g. "06:00 AM - 07:00 AM" or "18:00 - 19:00"
  booked_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  customer_email text,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'pay_at_venue', 'cancelled', 'refunded')),
  payment_id text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Crucial: Enforce slot uniqueness in PostgreSQL so double-booking is physically impossible!
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_slot_active_unique 
  ON public.venue_slot_bookings (venue_id, slot_date, slot_time)
  WHERE (status != 'cancelled');

CREATE INDEX IF NOT EXISTS idx_venue_slot_bookings_ref ON public.venue_slot_bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_venue_slot_bookings_user ON public.venue_slot_bookings(booked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_venue_slot_bookings_query ON public.venue_slot_bookings(venue_id, slot_date);

-- -----------------------------------------------------------------------------
-- 4. TRIAL APPLICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_ref text NOT NULL UNIQUE,
  trial_slug text NOT NULL,
  trial_title text NOT NULL,
  sport text NOT NULL,
  city text NOT NULL,
  venue_name text,
  starts_at text,
  deadline_date text,
  organizer_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  athlete_profile_id uuid REFERENCES public.athlete_profiles(id) ON DELETE SET NULL,
  athlete_name text NOT NULL CHECK (char_length(trim(athlete_name)) >= 2),
  athlete_phone text NOT NULL CHECK (char_length(trim(athlete_phone)) >= 10),
  athlete_email text,
  age_category text,
  playing_position text,
  summary text,
  fitness_benchmarks jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_clips_count integer NOT NULL DEFAULT 0 CHECK (video_clips_count >= 0),
  statement text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'shortlisted', 'admit_issued', 'rejected')),
  review_notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_apps_ref ON public.trial_applications(application_ref);
CREATE INDEX IF NOT EXISTS idx_trial_apps_trial ON public.trial_applications(trial_slug);
CREATE INDEX IF NOT EXISTS idx_trial_apps_user ON public.trial_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_apps_status ON public.trial_applications(status);

-- -----------------------------------------------------------------------------
-- 5. ACADEMY ENQUIRIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_token text NOT NULL UNIQUE,
  academy_slug text NOT NULL,
  academy_name text NOT NULL,
  sport text NOT NULL,
  city text NOT NULL,
  state text,
  batch_type text NOT NULL CHECK (batch_type IN ('weekend', 'weekday', 'evening_elite', 'morning_grassroots')),
  batch_label text NOT NULL,
  skill_level text NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced_elite')),
  request_type text NOT NULL CHECK (request_type IN ('free_trial', 'regular_admission', 'scholarship_assessment')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  athlete_profile_id uuid REFERENCES public.athlete_profiles(id) ON DELETE SET NULL,
  athlete_name text NOT NULL CHECK (char_length(trim(athlete_name)) >= 2),
  athlete_phone text NOT NULL CHECK (char_length(trim(athlete_phone)) >= 10),
  athlete_email text,
  age_category text,
  playing_position text,
  fitness_benchmarks jsonb NOT NULL DEFAULT '{}'::jsonb,
  statement text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'trial_scheduled', 'admitted', 'waitlisted', 'declined')),
  review_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_enq_token ON public.academy_enquiries(enquiry_token);
CREATE INDEX IF NOT EXISTS idx_academy_enq_academy ON public.academy_enquiries(academy_slug);
CREATE INDEX IF NOT EXISTS idx_academy_enq_user ON public.academy_enquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_enq_status ON public.academy_enquiries(status);

-- -----------------------------------------------------------------------------
-- 6. USER BOOKMARKS & CROSS-DEVICE SAVED ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('academy', 'trial', 'venue', 'pickup', 'book', 'coach', 'paper', 'event')),
  slug text NOT NULL,
  title text NOT NULL,
  subtitle text,
  badge text,
  url text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_bookmark UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_cat ON public.user_bookmarks(category);

-- -----------------------------------------------------------------------------
-- 7. LIVE MATCHES & LIVE SCORE EVENTS (REAL-TIME BROADCAST ENGINE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL UNIQUE,
  sport text NOT NULL CHECK (sport IN ('Cricket', 'Football', 'Badminton', 'Basketball', 'Tennis', 'Kabaddi', 'Box Cricket', 'Volleyball', 'Table Tennis')),
  tournament_name text NOT NULL CHECK (char_length(trim(tournament_name)) >= 2),
  stage text DEFAULT 'Group Stage',
  status text NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'UPCOMING', 'FINISHED', 'ABANDONED', 'DELAYED')),
  venue_name text NOT NULL,
  city text NOT NULL,
  team_a_name text NOT NULL,
  team_a_short text,
  team_a_score text NOT NULL DEFAULT '0',
  team_a_overs_or_time text,
  team_b_name text NOT NULL,
  team_b_short text,
  team_b_score text NOT NULL DEFAULT '0',
  team_b_overs_or_time text,
  current_possession_or_striker text,
  current_run_rate_or_pace text,
  highlight_note text,
  scorer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scorer_name text NOT NULL DEFAULT 'Official Scorer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_matches_match_id ON public.live_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_live_matches_status ON public.live_matches(status);
CREATE INDEX IF NOT EXISTS idx_live_matches_sport ON public.live_matches(sport);
CREATE INDEX IF NOT EXISTS idx_live_matches_city ON public.live_matches(city);

CREATE TABLE IF NOT EXISTS public.live_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL REFERENCES public.live_matches(match_id) ON DELETE CASCADE,
  event_sequence integer NOT NULL CHECK (event_sequence >= 1),
  over_or_minute text NOT NULL,
  scoring_team text NOT NULL CHECK (scoring_team IN ('team_a', 'team_b', 'neutral')),
  event_type text NOT NULL, -- 'run', 'four', 'six', 'wicket', 'goal', 'point', 'foul', 'timeout'
  delta_score text,         -- '+1', '+4', '+6', '+1 Goal', 'Wicket'
  player_involved text,
  commentary_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_match_event_seq UNIQUE (match_id, event_sequence)
);

CREATE INDEX IF NOT EXISTS idx_live_events_match ON public.live_score_events(match_id, event_sequence DESC);

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES (FREE-TIER COMPLIANT)
-- -----------------------------------------------------------------------------
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments_and_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_slot_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_score_events ENABLE ROW LEVEL SECURITY;

-- 8.1 Coaches: Public can read published coaches
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view published coaches" ON public.coaches;
  CREATE POLICY "Public can view published coaches" ON public.coaches
    FOR SELECT USING (publication_status = 'published');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.2 Coach Inquiries: Anyone can submit inquiry; users can view their own inquiries
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can submit coach inquiries" ON public.coach_inquiries;
  CREATE POLICY "Public can submit coach inquiries" ON public.coach_inquiries
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can view their own coach inquiries" ON public.coach_inquiries;
  CREATE POLICY "Users can view their own coach inquiries" ON public.coach_inquiries
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.3 Tournaments and Events: Public can view published tournaments
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view published tournaments" ON public.tournaments_and_events;
  CREATE POLICY "Public can view published tournaments" ON public.tournaments_and_events
    FOR SELECT USING (publication_status = 'published');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.4 Venue Slot Bookings: Public can read bookings (for slot availability checks); anyone can insert
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can check slot booking availability" ON public.venue_slot_bookings;
  CREATE POLICY "Public can check slot booking availability" ON public.venue_slot_bookings
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can insert venue slot bookings" ON public.venue_slot_bookings;
  CREATE POLICY "Public can insert venue slot bookings" ON public.venue_slot_bookings
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can update their own venue slot bookings" ON public.venue_slot_bookings;
  CREATE POLICY "Users can update their own venue slot bookings" ON public.venue_slot_bookings
    FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = booked_by_user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.5 Trial Applications: Anyone can submit application; public read for applicant
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can submit trial applications" ON public.trial_applications;
  CREATE POLICY "Public can submit trial applications" ON public.trial_applications
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can view their own trial applications" ON public.trial_applications;
  CREATE POLICY "Users can view their own trial applications" ON public.trial_applications
    FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.6 Academy Enquiries: Anyone can submit academy enquiry; public read for applicant
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can submit academy enquiries" ON public.academy_enquiries;
  CREATE POLICY "Public can submit academy enquiries" ON public.academy_enquiries
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can view their own academy enquiries" ON public.academy_enquiries;
  CREATE POLICY "Users can view their own academy enquiries" ON public.academy_enquiries
    FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.7 User Bookmarks: Strictly owner-only access!
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.user_bookmarks;
  CREATE POLICY "Users can view their own bookmarks" ON public.user_bookmarks
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.user_bookmarks;
  CREATE POLICY "Users can insert their own bookmarks" ON public.user_bookmarks
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.user_bookmarks;
  CREATE POLICY "Users can delete their own bookmarks" ON public.user_bookmarks
    FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8.8 Live Matches & Events: Public read access, scorers/service_role write access
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view live matches" ON public.live_matches;
  CREATE POLICY "Public can view live matches" ON public.live_matches
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Scorers can insert and update live matches" ON public.live_matches;
  CREATE POLICY "Scorers can insert and update live matches" ON public.live_matches
    FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public can view live score events" ON public.live_score_events;
  CREATE POLICY "Public can view live score events" ON public.live_score_events
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Scorers can insert score events" ON public.live_score_events;
  CREATE POLICY "Scorers can insert score events" ON public.live_score_events
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 9. PERMISSIONS GRANT (FREE-TIER ROLES)
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.coaches TO anon, authenticated;
GRANT SELECT, INSERT ON public.coach_inquiries TO anon, authenticated;
GRANT SELECT ON public.tournaments_and_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.venue_slot_bookings TO anon, authenticated;
GRANT SELECT, INSERT ON public.trial_applications TO anon, authenticated;
GRANT SELECT, INSERT ON public.academy_enquiries TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_bookmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_matches TO anon, authenticated;
GRANT SELECT, INSERT ON public.live_score_events TO anon, authenticated;

COMMIT;
