-- Migration: Create sports_books table for dynamic open-access athlete manuals and tactical coaching books
BEGIN;

create table if not exists public.sports_books (
  id text primary key,
  title text not null,
  subtitle text not null,
  author text not null,
  author_role text,
  category text not null,
  sport text not null,
  reading_time_minutes integer not null default 30,
  total_pages integer not null default 100,
  cover_emoji text not null default '📚',
  cover_gradient text not null default 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
  rating numeric(3,2) not null default 4.90,
  ratings_count integer not null default 1000,
  published_year integer not null default 2026,
  isbn text not null,
  badge text,
  description text not null,
  highlights jsonb not null default '[]'::jsonb,
  chapters jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.sports_books enable row level security;

-- Drop policy if exists then recreate
drop policy if exists "Public read published sports books" on public.sports_books;
create policy "Public read published sports books"
  on public.sports_books
  for select
  using (is_published = true);

-- Indexes for lightning fast catalogue queries
create index if not exists idx_sports_books_category on public.sports_books(category);
create index if not exists idx_sports_books_sport on public.sports_books(sport);
create index if not exists idx_sports_books_rating on public.sports_books(rating desc);

-- Seed Initial 8 Open-Access Sports Books
insert into public.sports_books (
  id, title, subtitle, author, author_role, category, sport, reading_time_minutes, total_pages, cover_emoji, cover_gradient, rating, ratings_count, published_year, isbn, badge, description, highlights, is_published
)
values
(
  'modern-football-tactics',
  'Modern Football Tactics & Spatial Pressing',
  'Positional play, pressing triggers, half-space overloads & build-up structures',
  'Coach Rajeshwar Sen',
  'UEFA & AIFF ‘A’ License Coach · Head of Tactical Analytics',
  'Tactical Play',
  'Football',
  45,
  164,
  '⚽',
  'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #0f172a 100%)',
  4.90,
  3840,
  2026,
  'KG-978-93-8912-01',
  'Popular Manual',
  'A comprehensive tactical manual bridging elite European positional systems with South Asian ground conditions and counter-attack paradigms.',
  '["Master the 5 vertical corridors (wings, half-spaces, central axis)","Rest-defense configurations: 3+2 vs 2+3 structures against low blocks","Cognitive pressing triggers: backward pass, bad touch, touchline trapping","Inverting full-backs to create numerical superiorities in midfield"]'::jsonb,
  true
),
(
  'cricket-fast-bowling-biomechanics',
  'Cricket Fast Bowling: Biomechanics & Speed Mechanics',
  'Kinematic chain, front-knee bracing, spinal torque mitigation & 140+ km/h delivery protocols',
  'Dr. Vikramaditya Rathore',
  'Sports Biomechanist · Consultant to National Bowling Academies',
  'Biomechanics',
  'Cricket',
  40,
  148,
  '🏏',
  'linear-gradient(135deg, #065f46 0%, #059669 50%, #064e3b 100%)',
  4.95,
  4120,
  2026,
  'KG-978-93-8912-02',
  'Elite Coaching',
  'The definitive scientific manual on generating bowling velocity safely. Analyzes ground reaction forces, pelvic-shoulder separation angles, and workload monitoring.',
  '["Master the front-knee lockout: converting 6-8x bodyweight into arm speed","Eliminate mixed actions: aligning back-foot contact with shoulder plane","The run-up speed curve: why acceleration matters more than top-end speed","ACWR guidelines for teenage pace bowlers"]'::jsonb,
  true
),
(
  'athlete-mental-conditioning',
  'The Athlete Mindset: Mental Conditioning & Pressure Resilience',
  'Pre-shot routines, self-talk reprogramming, cortisol regulation & clutch performance',
  'Dr. Ananya Mukherjee',
  'Olympic Sports Psychologist · Mental Performance Consultant',
  'Mental Conditioning',
  'Multi-Sport',
  35,
  132,
  '🧠',
  'linear-gradient(135deg, #701a75 0%, #a21caf 50%, #3b0764 100%)',
  4.88,
  2950,
  2026,
  'KG-978-93-8912-03',
  'Mental Edge',
  'Transform anxiety into hyper-focused execution with actionable mental scripts, breathing protocols, and refocusing routines for championship pressure.',
  '["The 4-7-8 physiological sigh to abort autonomic panic spikes in 20 seconds","Cue-word anchoring: replacing \"Don’t miss\" with direct motor verbs","Mental rehearsal protocol with vivid multisensory kinematic visualization","The 3-Second Error Flush reset routine"]'::jsonb,
  true
),
(
  'grassroots-coaching-handbook',
  'Youth Long-Term Athlete Development (LTAD) Handbook',
  'Age-appropriate motor development, preventing burnout, fun-first skill acquisition',
  'Sandeep Menon',
  'Director of Grassroots Coaching · Former National Youth Selector',
  'Grassroots Coaching',
  'Multi-Sport',
  30,
  118,
  '🌱',
  'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #7c2d12 100%)',
  4.85,
  2210,
  2026,
  'KG-978-93-8912-04',
  'Essential for Coaches',
  'A scientifically validated blueprint for coaching children and adolescents aged 6 to 18 while avoiding early specialization injuries.',
  '["The 7-stage LTAD model: Active Start through Training to Win","Why playing multiple sports until age 14 develops superior spatial athletes","Bio-banding: Grouping young athletes by biological maturity rather than birth date","Transforming static drills into dynamic game-based challenges"]'::jsonb,
  true
),
(
  'sports-nutrition-recovery',
  'Sports Nutrition, Hydration & Rapid Recovery Protocols',
  'Glycogen re-synthesis, heat acclimatization, anti-inflammatory meals & sleep hygiene',
  'Dr. Meera Nambiar',
  'Chief Sports Dietitian · High Performance Advisor',
  'Sports Nutrition',
  'Multi-Sport',
  35,
  136,
  '🥗',
  'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #042f2e 100%)',
  4.92,
  3100,
  2026,
  'KG-978-93-8912-05',
  'Nutrition Guide',
  'Fueling athletic performance under demanding tropical climates with evidence-based meal timing and electrolyte balancing.',
  '["The 4:1 carbohydrate-to-protein post-match window for rapid muscle repair","Managing sodium and sweat loss in Indian summer conditions (>35°C)","Vegetarian and vegan athlete protein profiling (paneer, dal, sprouts, soya)","Sleep stage architecture: maximizing slow-wave deep sleep"]'::jsonb,
  true
),
(
  'badminton-footwork-tactics',
  'Badminton Kinetic Footwork & Deceptive Strokes',
  'Split-step timing, 6-point corner recoveries, deceptive holds & net tumble physics',
  'Coach P. Chandrashekhar',
  'Former National Singles Champion · Master High-Performance Coach',
  'Tactical Play',
  'Badminton',
  30,
  112,
  '🏸',
  'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e1b4b 100%)',
  4.90,
  2640,
  2026,
  'KG-978-93-8912-06',
  'Precision Manual',
  'Master lightning-fast movement patterns, kinetic lunging, center base recovery, and deception at the net tape.',
  '["The split-step trigger: Landing on the balls of your feet at the exact opponent strike frame","The 6-point court coverage grid with minimal stride count","Holding the racket angle: Delaying wrist pronation until the final 0.05 seconds","Front-knee tracking: Preventing patellar tendon shear during deep lunges"]'::jsonb,
  true
),
(
  'athletics-speed-mechanics',
  'Athletics Sprint Mechanics & Acceleration Dynamics',
  'Drive phase angles, ground contact time reduction & top-end velocity kinematics',
  'Devendra Singh',
  'Track & Field Sprint Coach · Speed Consultant to Multi-Sport Federations',
  'Biomechanics',
  'Athletics',
  25,
  98,
  '🏃',
  'linear-gradient(135deg, #b91c1c 0%, #ef4444 50%, #7f1d1d 100%)',
  4.87,
  1980,
  2026,
  'KG-978-93-8912-07',
  'Speed Science',
  'The definitive guide to running faster in any sport, from low acceleration drive angles to ground reaction force production.',
  '["The 45-degree acceleration posture: Driving the ground away rather than pulling","Reducing Ground Contact Time (GCT) below 0.10 seconds during maximum velocity","The \"Whip from the Hip\" cue: Active leg strike directly under the center of mass","Dorsiflexion discipline: Preventing energy bleed through a collapsed ankle joint"]'::jsonb,
  true
),
(
  'injury-prevention-protocols',
  'ACL & Soft Tissue Injury Prevention for Turf Athletes',
  'FIFA 11+ protocols, Nordic hamstring curls, deceleration mechanics & artificial turf risks',
  'Dr. Rohini Deshmukh',
  'Head Sports Physiotherapist · Knee & Ankle Rehabilitation Specialist',
  'Strength & Conditioning',
  'Multi-Sport',
  35,
  124,
  '🛡️',
  'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #14532d 100%)',
  4.96,
  3410,
  2026,
  'KG-978-93-8912-08',
  'High Impact Medical',
  'Clinically validated protocols that reduce non-contact anterior cruciate ligament (ACL) and hamstring strains by up to 60%.',
  '["The biomechanics of non-contact ACL tears: Dynamic knee valgus during deceleration","The Nordic Hamstring Curl progression: Building eccentric strength against high-speed tears","Turf shoe friction selection: Preventing stud lock-in on artificial grass pitches","Weekly 20-minute FIFA 11+ warmup routine implementation"]'::jsonb,
  true
)
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  author = excluded.author,
  author_role = excluded.author_role,
  category = excluded.category,
  sport = excluded.sport,
  reading_time_minutes = excluded.reading_time_minutes,
  total_pages = excluded.total_pages,
  cover_emoji = excluded.cover_emoji,
  cover_gradient = excluded.cover_gradient,
  rating = excluded.rating,
  ratings_count = excluded.ratings_count,
  published_year = excluded.published_year,
  isbn = excluded.isbn,
  badge = excluded.badge,
  description = excluded.description,
  highlights = excluded.highlights,
  updated_at = now();

COMMIT;
