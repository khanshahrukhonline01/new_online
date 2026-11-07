-- ==============================================================================
-- Migration: 20261107181000_seed_tournaments_and_coaches_expansion.sql
-- Description: Seed initial tournaments and grassroots championships, verified coaches,
--              and sample live match scoreboards into public tables.
-- ==============================================================================

BEGIN;

-- 1. Insert Grassroots Tournaments and Championships
INSERT INTO public.tournaments_and_events (
  slug, title, hindi_title, sport, category, sanctioning_body, edition,
  start_date, end_date, registration_deadline, city, state, venue,
  age_categories, gender, prize_pool, entry_fee, team_or_individual,
  official_notice_url, registration_url, organizer, contact_phone, contact_email,
  verified_badge, featured, description, qualification_requirements, publication_status
)
VALUES
  (
    'khelo-india-youth-games-2026',
    'Khelo India Youth Games (KIYG) 2026',
    'खेलो इंडिया यूथ गेम्स 2026',
    'Multi-Sport',
    'championship',
    'Khelo India / SAI',
    '8th National Edition',
    '2026-12-10',
    '2026-12-22',
    '2026-11-25',
    'Bhopal',
    'Madhya Pradesh',
    'Tatya Tope Stadium & MP Sports Complex, Bhopal',
    '["U-17", "U-19"]'::jsonb,
    'Boys & Girls',
    '₹5 Lakh SAI Annual Scholarship for Top 8 Podium Finishers',
    'Free (State Selection Quota)',
    'Individual & Team',
    'https://kheloindia.gov.in/',
    'https://kheloindia.gov.in/athlete-portal',
    'Sports Authority of India (SAI) & Ministry of Youth Affairs',
    '+91 11 2436 8393',
    'support@kheloindia.gov.in',
    true,
    true,
    'The flagship national grassroots games for school and college athletes across 27 Olympic and traditional disciplines.',
    '["Must have represented State at SGFI National School Games or National Junior Championship", "Valid SAI Khelo India Athlete UID card", "Aadhaar age authenticity certificate issued prior to cut-off year"]'::jsonb,
    'published'
  ),
  (
    'sgfi-national-school-badminton-championship-2026',
    '68th SGFI National School Badminton Games',
    '68वीं एसजीएफआई राष्ट्रीय विद्यालय बैडमिंटन प्रतियोगिता',
    'Badminton',
    'school_games',
    'SGFI',
    '68th SGFI Games',
    '2026-12-04',
    '2026-12-09',
    '2026-11-20',
    'Bengaluru',
    'Karnataka',
    'Prakash Padukone Badminton Academy, CSE, Yelahanka, Bengaluru',
    '["U-14", "U-17", "U-19"]'::jsonb,
    'Boys & Girls',
    'Merit Medals & Ministry of Education Board Grace Marks',
    'Sponsored by State School Education Department',
    'Individual & Team',
    'https://sgfi.org.in/',
    'https://sgfi.org.in/state-nominations',
    'School Games Federation of India (SGFI)',
    '+91 562 252 0011',
    'info@sgfi.org.in',
    true,
    true,
    'Premier inter-state school badminton tournament qualifying student-athletes for national junior camps and university sports quota admissions.',
    '["Regular full-time enrolled student in a recognised state/CBSE/ICSE school", "Selected via District & State School Games qualifiers", "Original School Principal bonafide letter with photo attested"]'::jsonb,
    'published'
  ),
  (
    'subroto-cup-international-football-tournament-2026',
    'Subroto Cup International Football Tournament',
    'सुब्रतो कप अंतरराष्ट्रीय फुटबॉल टूर्नामेंट',
    'Football',
    'school_games',
    'AIFF',
    '64th Edition',
    '2026-11-28',
    '2026-12-14',
    '2026-11-18',
    'New Delhi',
    'Delhi NCR',
    'Ambedkar Stadium & Tejas Football Ground, Subroto Park, New Delhi',
    '["U-14", "U-17"]'::jsonb,
    'Boys & Girls',
    '₹25,00,000 Total Prize Purse & ISL Youth Academy Contracts',
    'Free for Qualified State Champion Schools',
    'Team',
    'https://subrotocup.in/',
    'https://subrotocup.in/registration-login',
    'Subroto Mukerjee Sports Education Society & Indian Air Force',
    '+91 11 2568 7194',
    'subrotocup@gmail.com',
    true,
    true,
    'Asia’s oldest and most prestigious inter-school football championship bringing together champion state schools, army schools, and international guest squads.',
    '["School team must have won District and State Inter-School Football Championship", "AIFF Central Registration System (CRS) player IDs required for all 18 squad members", "Mandatory TW3 bone age verification test prior to group stage"]'::jsonb,
    'published'
  ),
  (
    'afi-national-junior-athletics-championships-2026',
    '39th AFI National Junior Athletics Championships',
    '39वीं एएफआई राष्ट्रीय जूनियर एथलेटिक्स चैंपियनशिप',
    'Athletics',
    'championship',
    'AFI',
    '39th Edition',
    '2026-12-18',
    '2026-12-22',
    '2026-11-30',
    'Bhubaneswar',
    'Odisha',
    'Kalinga Stadium Athletics Complex, Bhubaneswar',
    '["U-14", "U-17", "U-19"]'::jsonb,
    'Boys & Girls',
    'Medals, National Camp Invitations & Target Olympic Podium Scheme (TOPS) Scout Pool',
    '₹350 per event (State Affiliate Entry)',
    'Individual',
    'https://indianathletics.in/',
    'https://indianathletics.in/athlete-entry-portal',
    'Athletics Federation of India (AFI)',
    '+91 11 4010 4030',
    'afi@indianathletics.in',
    true,
    true,
    'The pinnacle track & field proving ground where Neeraj Chopra and Hima Das first set national junior records.',
    '["AFI UID registration and biometric entry verified by State Athletics Association", "Must have achieved AFI Junior Qualifying Standard mark at State meet", "AFI medical panel age verification card required"]'::jsonb,
    'published'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  hindi_title = EXCLUDED.hindi_title,
  sport = EXCLUDED.sport,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  registration_deadline = EXCLUDED.registration_deadline,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  venue = EXCLUDED.venue,
  age_categories = EXCLUDED.age_categories,
  prize_pool = EXCLUDED.prize_pool,
  entry_fee = EXCLUDED.entry_fee,
  updated_at = now();

-- 2. Update coaches with full biographical and pricing attributes
UPDATE public.coaches
SET
  sport = 'Cricket',
  sport_category = 'Bat & Ball',
  certification = 'BCCI Level 3 Master Coach · Dronacharya Nominee',
  credential_authority = 'bcci',
  authority_label = 'Board of Control for Cricket in India (BCCI)',
  experience_years = 24,
  academy_affiliation = 'Mumbai Cricket Association Academy',
  monthly_fee = '₹8,500/month',
  fee_range_category = 'premium',
  student_track_record = 'Coached 6 Ranji Trophy winning squads and 18 Indian first-class cricketers.',
  specialties = '["Multi-Day Red Ball Tactical Discipline", "Pace & Spin Strokeplay Fundamentals", "Match Captaincy Psychology"]'::jsonb,
  rating = 4.98,
  review_count = 142,
  verified_badge = 'BCCI Level 3 Certified'
WHERE slug = 'chandrakant-pandit';

UPDATE public.coaches
SET
  sport = 'Football',
  sport_category = 'Field Team',
  certification = 'AFC Pro License · AIFF Elite Instructor',
  credential_authority = 'aiff-afc',
  authority_label = 'Asian Football Confederation (AFC) & AIFF',
  experience_years = 16,
  academy_affiliation = 'FC Goa Youth Academy',
  monthly_fee = '₹5,500/month',
  fee_range_category = '3k-7k',
  student_track_record = 'Guided young Indian talents to ISL first team debuts and India U-17/U-20 callups.',
  specialties = '["High-Intensity Pressing Transitions", "Positional Play & Tactical Intelligence", "Wing Play & 1v1 Attacking"]'::jsonb,
  rating = 4.92,
  review_count = 88,
  verified_badge = 'AFC Pro Licensed'
WHERE slug = 'clifford-miranda';

UPDATE public.coaches
SET
  sport = 'Badminton',
  sport_category = 'Racquet',
  certification = 'Dronacharya Awardee · BWF High Performance Mentor',
  credential_authority = 'bwf-bai',
  authority_label = 'Badminton World Federation (BWF) & BAI',
  experience_years = 28,
  academy_affiliation = 'Prakash Padukone Badminton Academy (PPBA)',
  monthly_fee = '₹9,000/month',
  fee_range_category = 'premium',
  student_track_record = 'Coached Saina Nehwal to World No. 1 and Lakshya Sen to Commonwealth Games Gold.',
  specialties = '["Olympic singles biomechanics", "Explosive multi-shuttle footwork", "Deciding set mental resilience"]'::jsonb,
  rating = 4.99,
  review_count = 210,
  verified_badge = 'Dronacharya Awardee'
WHERE slug = 'vimal-kumar';

-- 3. Seed Sample Grassroots Live Matches and Events
INSERT INTO public.live_matches (
  match_id, sport, tournament_name, stage, status, venue_name, city,
  team_a_name, team_a_short, team_a_score, team_a_overs_or_time,
  team_b_name, team_b_short, team_b_score, team_b_overs_or_time,
  current_possession_or_striker, current_run_rate_or_pace, highlight_note, scorer_name
)
VALUES
  (
    'live-cricket-delhi-cup-2026',
    'Cricket',
    'Delhi Grassroots Premier League 2026',
    'Semi-Final 1',
    'LIVE',
    'Ambedkar Stadium Cricket Ground',
    'Delhi NCR',
    'Delhi Colts CC',
    'DCC',
    '154/4',
    '17.2 Ov',
    'Sonnet CC',
    'SCC',
    '148/7',
    '20.0 Ov',
    'Aarav Sharma (42* off 28b)',
    'Req RR: 5.62 · Target: 149',
    'Aarav Sharma smashes a boundary through extra cover to seal the chase!',
    'Delhi District Scorer Desk'
  ),
  (
    'live-football-karnataka-youth-2026',
    'Football',
    'Karnataka Youth State Super League 2026',
    'Final Match',
    'LIVE',
    'Bangalore Football Stadium',
    'Bengaluru',
    'Bengaluru FC U-17',
    'BFC',
    '2',
    '74’',
    'Kickstart FC Academy',
    'KFC',
    '1',
    '74’',
    'BFC Counter-Attack',
    'High Pressing',
    'Spectacular left-footed curling goal into top corner from 22 yards out.',
    'KSFA Match Commission'
  )
ON CONFLICT (match_id) DO UPDATE SET
  team_a_score = EXCLUDED.team_a_score,
  team_b_score = EXCLUDED.team_b_score,
  team_a_overs_or_time = EXCLUDED.team_a_overs_or_time,
  highlight_note = EXCLUDED.highlight_note,
  updated_at = now();

-- 4. Seed Live Score Events for the Delhi Match
INSERT INTO public.live_score_events (
  match_id, event_sequence, over_or_minute, scoring_team, event_type, delta_score, player_involved, commentary_text
)
VALUES
  ('live-cricket-delhi-cup-2026', 1, '16.4 Ov', 'team_a', 'four', '+4', 'Aarav Sharma', 'Driven firmly on the up through extra cover for a cracking boundary!'),
  ('live-cricket-delhi-cup-2026', 2, '16.5 Ov', 'team_a', 'run', '+1', 'Rohan Verma', 'Pushed down to long-on for a brisk single.'),
  ('live-cricket-delhi-cup-2026', 3, '17.1 Ov', 'team_a', 'six', '+6', 'Aarav Sharma', 'Massive hit over mid-wicket! Clears the rope with authority.'),
  ('live-cricket-delhi-cup-2026', 4, '17.2 Ov', 'team_a', 'four', '+4', 'Aarav Sharma', 'Boundary through backward point! Delhi Colts win by 6 wickets!')
ON CONFLICT (match_id, event_sequence) DO NOTHING;

COMMIT;
