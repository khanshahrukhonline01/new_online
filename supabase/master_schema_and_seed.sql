-- ==============================================================================
-- KHELGRID PLATFORM: MASTER CONSOLIDATED DATABASE SCHEMA & SEED
-- File: supabase/master_schema_and_seed.sql
-- Target: Supabase Free Tier PostgreSQL (Standard SQL, Zero Paid Extensions)
--
-- Instructions:
-- Paste this entire file into your Supabase Dashboard -> SQL Editor and click "Run".
-- This script is completely idempotent (uses IF NOT EXISTS and ON CONFLICT).
-- ==============================================================================

BEGIN;

-- 1. SPORTS CATALOGUE
CREATE TABLE IF NOT EXISTS public.sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ACADEMIES DIRECTORY
CREATE TABLE IF NOT EXISTS public.academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 180),
  description text CHECK (description IS NULL OR char_length(description) <= 5000),
  city text NOT NULL CHECK (char_length(trim(city)) BETWEEN 1 AND 120),
  state text CHECK (state IS NULL OR char_length(state) <= 120),
  website_url text,
  public_contact_url text,
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. VENUES & TURFS
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 180),
  description text,
  city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 120),
  state text,
  address text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. SELECTION TRIALS & OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  sport_id uuid REFERENCES public.sports(id) ON DELETE RESTRICT,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('trial', 'combine', 'scholarship', 'camp', 'job', 'other')),
  organizer_name text,
  city text,
  venue_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  application_deadline timestamptz,
  source_url text,
  source_name text,
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected')),
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. ATHLETE DIGITAL IDENTITIES & SPORTS CV
CREATE TABLE IF NOT EXISTS public.athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(username) BETWEEN 3 AND 50),
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  sport text NOT NULL CHECK (char_length(trim(sport)) BETWEEN 2 AND 80),
  playing_position text NOT NULL DEFAULT 'Athlete',
  city text NOT NULL DEFAULT 'India',
  state text,
  date_of_birth date,
  team_or_academy text,
  coach text,
  experience_years text,
  primary_foot_or_hand text,
  height_cm integer CHECK (height_cm IS NULL OR (height_cm BETWEEN 100 AND 250)),
  weight_kg integer CHECK (weight_kg IS NULL OR (weight_kg BETWEEN 25 AND 200)),
  summary text CHECK (summary IS NULL OR char_length(summary) <= 2000),
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_clips jsonb NOT NULL DEFAULT '[]'::jsonb,
  fitness_benchmarks jsonb NOT NULL DEFAULT '{}'::jsonb,
  player_card_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_status text NOT NULL DEFAULT 'community' CHECK (verification_status IN ('community', 'verified', 'pro')),
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. COACHES & NIS CREDENTIALS
CREATE TABLE IF NOT EXISTS public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 140),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 5000),
  city text NOT NULL CHECK (char_length(trim(city)) BETWEEN 1 AND 120),
  state text CHECK (state IS NULL OR char_length(state) <= 120),
  sport text NOT NULL DEFAULT 'Multi-Sport',
  sport_category text NOT NULL DEFAULT 'Field & Court',
  avatar_url text,
  certification text NOT NULL DEFAULT 'NIS Certified · SAI Diploma',
  credential_authority text NOT NULL DEFAULT 'sai-nis',
  authority_label text NOT NULL DEFAULT 'SAI / National Institute of Sports (NIS)',
  experience_years integer NOT NULL DEFAULT 5 CHECK (experience_years >= 0),
  academy_affiliation text DEFAULT 'Independent Elite Academy',
  monthly_fee text NOT NULL DEFAULT '₹3,500/month',
  fee_range_category text NOT NULL DEFAULT '3k-7k' CHECK (fee_range_category IN ('under-3k', '3k-7k', 'premium', 'subsidized')),
  student_track_record text DEFAULT 'Trained state champions and national school games medalists.',
  specialties jsonb NOT NULL DEFAULT '["Technique & Biomechanics", "Match Strategy"]'::jsonb,
  languages jsonb NOT NULL DEFAULT '["English", "Hindi"]'::jsonb,
  rating numeric(3, 2) NOT NULL DEFAULT 4.90 CHECK (rating BETWEEN 1.0 AND 5.0),
  review_count integer NOT NULL DEFAULT 48 CHECK (review_count >= 0),
  verified_badge text NOT NULL DEFAULT 'NIS Verified',
  available_for_one_on_one boolean NOT NULL DEFAULT true,
  available_for_batches boolean NOT NULL DEFAULT true,
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected')),
  website_url text,
  public_contact_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. COACH SESSION INQUIRIES
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

-- 8. TOURNAMENTS & GRASSROOTS CHAMPIONSHIPS
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

-- 9. REAL-TIME VENUE SLOT BOOKINGS (ZERO DOUBLE-BOOKING CONSTRAINT)
CREATE TABLE IF NOT EXISTS public.venue_slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  venue_id text NOT NULL,
  venue_name text NOT NULL CHECK (char_length(trim(venue_name)) >= 2),
  city text NOT NULL CHECK (char_length(trim(city)) >= 1),
  sport text NOT NULL,
  court_or_turf_number text DEFAULT 'Turf 1 (Main Pitch)',
  slot_date text NOT NULL, -- Format YYYY-MM-DD
  slot_time text NOT NULL, -- e.g. "06:00 AM - 07:00 AM"
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_slot_active_unique 
  ON public.venue_slot_bookings (venue_id, slot_date, slot_time)
  WHERE (status != 'cancelled');

-- 10. TRIAL APPLICATIONS
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

-- 11. ACADEMY ADMISSION ENQUIRIES
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

-- 12. USER BOOKMARKS & CROSS-DEVICE SAVED ITEMS
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

-- 13. COMMUNITY LIVE MATCHES & REAL-TIME BROADCASTS
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

CREATE TABLE IF NOT EXISTS public.live_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL REFERENCES public.live_matches(match_id) ON DELETE CASCADE,
  event_sequence integer NOT NULL CHECK (event_sequence >= 1),
  over_or_minute text NOT NULL,
  scoring_team text NOT NULL CHECK (scoring_team IN ('team_a', 'team_b', 'neutral')),
  event_type text NOT NULL,
  delta_score text,
  player_involved text,
  commentary_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_match_event_seq UNIQUE (match_id, event_sequence)
);

-- 14. ROW LEVEL SECURITY (RLS) ACTIVATION
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments_and_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_slot_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_score_events ENABLE ROW LEVEL SECURITY;

-- 15. PUBLIC READ & USER PERMISSION POLICIES
DO $$ BEGIN
  CREATE POLICY "Public can view sports" ON public.sports FOR SELECT USING (true);
  CREATE POLICY "Public can view academies" ON public.academies FOR SELECT USING (publication_status = 'published');
  CREATE POLICY "Public can view venues" ON public.venues FOR SELECT USING (publication_status = 'published');
  CREATE POLICY "Public can view opportunities" ON public.opportunities FOR SELECT USING (publication_status = 'published');
  CREATE POLICY "Public can view athlete profiles" ON public.athlete_profiles FOR SELECT USING (publication_status = 'published');
  CREATE POLICY "Public can view published coaches" ON public.coaches FOR SELECT USING (publication_status = 'published');
  CREATE POLICY "Public can submit coach inquiries" ON public.coach_inquiries FOR INSERT WITH CHECK (true);
  CREATE POLICY "Users can view their own coach inquiries" ON public.coach_inquiries FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  CREATE POLICY "Public can view published tournaments" ON public.tournaments_and_events FOR SELECT USING (publication_status = 'published');
  CREATE POLICY "Public can check slot booking availability" ON public.venue_slot_bookings FOR SELECT USING (true);
  CREATE POLICY "Public can insert venue slot bookings" ON public.venue_slot_bookings FOR INSERT WITH CHECK (true);
  CREATE POLICY "Users can update their own venue slot bookings" ON public.venue_slot_bookings FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = booked_by_user_id);
  CREATE POLICY "Public can submit trial applications" ON public.trial_applications FOR INSERT WITH CHECK (true);
  CREATE POLICY "Users can view their own trial applications" ON public.trial_applications FOR SELECT USING (true);
  CREATE POLICY "Public can submit academy enquiries" ON public.academy_enquiries FOR INSERT WITH CHECK (true);
  CREATE POLICY "Users can view their own academy enquiries" ON public.academy_enquiries FOR SELECT USING (true);
  CREATE POLICY "Users can view their own bookmarks" ON public.user_bookmarks FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  CREATE POLICY "Users can insert their own bookmarks" ON public.user_bookmarks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  CREATE POLICY "Users can delete their own bookmarks" ON public.user_bookmarks FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  CREATE POLICY "Public can view live matches" ON public.live_matches FOR SELECT USING (true);
  CREATE POLICY "Scorers can insert and update live matches" ON public.live_matches FOR ALL USING (true);
  CREATE POLICY "Public can view live score events" ON public.live_score_events FOR SELECT USING (true);
  CREATE POLICY "Scorers can insert score events" ON public.live_score_events FOR INSERT WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 16. PERMISSIONS GRANT (ANON & AUTHENTICATED)
GRANT SELECT ON public.sports TO anon, authenticated;
GRANT SELECT ON public.academies TO anon, authenticated;
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT SELECT ON public.athlete_profiles TO anon, authenticated;
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
