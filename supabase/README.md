# KhelGrid Database Architecture & SQL Catalogue

This directory contains the database schema, versioned migrations, and standalone seed runners for the KhelGrid platform on Supabase (PostgreSQL).

---

## Directory Overview

```text
supabase/
├── migrations/                        # Version-controlled, timestamped schema migrations (CI verified)
│   ├── 20261025..._core.sql
│   ├── 20261028..._directory_and_listing_moderation.sql
│   ├── 20261030140000_seed_official_academies_coaches_events.sql
│   ├── 20261030170000_seed_live_khelgrid_academies.sql
│   ├── 20261030180000_khelchronicle_research_repository.sql
│   ├── 20261031100000_seed_remaining_sports_catalogue.sql
│   ├── 20261031120000_create_athlete_profiles.sql
│   ├── 20261031130000_create_trial_reminders.sql
│   ├── 20261031140000_create_venue_sports.sql
│   ├── 20261031150000_seed_metro_venues_and_venue_sports.sql
│   ├── 20261031160000_seed_verified_coaches_and_coach_sports.sql
│   └── 20261031170000_add_user_id_to_athlete_profiles.sql
│
├── seeds/                             # Numbered, domain-specific runners for Supabase SQL Editor
│   ├── 01_setup_academies.sql
│   ├── 02_setup_coaches.sql
│   ├── 03_setup_events.sql
│   ├── 04_seed_all_276_academies.sql
│   ├── 05_seed_khelchronicle_research.sql
│   ├── 06_seed_athlete_profiles.sql
│   ├── 07_seed_trial_reminders.sql
│   ├── 08_setup_venue_sports.sql
│   ├── 09_seed_metro_venues.sql
│   └── 10_seed_verified_coaches.sql
│
├── tests/                             # pgTAP database tests
│
├── setup_academies.sql                # Standalone: Academies schema & initial verified seed
├── setup_coaches.sql                  # Standalone: Coaches schema & Dronacharya seed
├── setup_events.sql                   # Standalone: Events schema & national championships seed
├── setup_khelchronicle.sql            # Standalone: KhelChronicle research preprints & manuscript intake
├── setup_athlete_profiles.sql         # Standalone: Athlete profiles, player cards, user_id & video telemetry
├── setup_trial_reminders.sql          # Standalone: Trial alerts, calendar sync & WhatsApp reminders
├── setup_venue_sports.sql             # Standalone: public.venue_sports junction table & SAI mappings
├── setup_metro_venues.sql             # Standalone: 16 Metro Cities Premier Stadiums & sports mappings
├── setup_coaches_expansion.sql        # Standalone: 25 Verified coaches & coach-sports mapping
└── seed_live_khelgrid_academies.sql   # Standalone: All 276 verified academies from live website
```

---

## 1. Automated Migrations (`supabase/migrations/`)

These files follow the standard Supabase CLI migration naming convention: `<YYYYMMDDHHMMSS>_<name>.sql`.
* Every file is transactional (`BEGIN; ... COMMIT;`).
* Every file is non-destructive (`CREATE TABLE IF NOT EXISTS`, safe index creation, additive RLS policies).
* Fully decoupled domain schemas allow independent deployments and testing.

---

## 2. Standalone Seed Runners (`supabase/seeds/`)

If you are setting up a new Supabase environment or executing queries manually in the **[Supabase SQL Editor](https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql)**, run these files in order:

| Step | File | Purpose |
| :--- | :--- | :--- |
| **01** | `seeds/01_setup_academies.sql` | Creates `public.academies` and `public.academy_sports` tables, RLS policies, indexes, and initial verified academies. |
| **02** | `seeds/02_setup_coaches.sql` | Creates `public.coaches`, `public.coach_sports`, and `public.coach_academies` tables, RLS policies, and Dronacharya coaches. |
| **03** | `seeds/03_setup_events.sql` | Creates `public.events` table, RLS policies, and national tournaments (Khelo India, Santosh Trophy, Senior Nationals). |
| **04** | `seeds/04_seed_all_276_academies.sql` | Inserts all 276 verified academies across 90+ Indian cities and maps them to sports across the 34-sport taxonomy. |
| **05** | `seeds/05_seed_khelchronicle_research.sql` | Creates `public.chronicle_papers` & `public.chronicle_submissions`, RLS policies, and seeds flagship preprints. |
| **06** | `seeds/06_seed_athlete_profiles.sql` | Creates `public.athlete_profiles` (with `user_id` auth reference), RLS policies, and seeds flagship grassroots athletes. |
| **07** | `seeds/07_seed_trial_reminders.sql` | Creates `public.trial_reminders`, RLS policies, indexes, and seeds trial deadline notification queues. |
| **08** | `seeds/08_setup_venue_sports.sql` | Creates `public.venue_sports` junction table, RLS policies, and maps SAI NCOE venues to sports. |
| **09** | `seeds/09_seed_metro_venues.sql` | Inserts 48 premier sports complexes across 16 metro cities (Wankhede, JLN, Kanteerava, Balewadi) and maps to `venue_sports`. |
| **10** | `seeds/10_seed_verified_coaches.sql` | Inserts 25 verified NIS / Dronacharya coaches and links all coaches to `coach_sports`. |

---

## 3. Dedicated Module Runners

For single-module updates, use the standalone SQL files in the root of `supabase/`:

- **Venue-Sport Taxonomy (P1)**: [`setup_venue_sports.sql`](./setup_venue_sports.sql)
  - Creates `public.venue_sports` junction table and maps all venues to their sports.
- **Coach Directory Expansion (P2)**: [`setup_coaches_expansion.sql`](./setup_coaches_expansion.sql)
  - Adds 25 verified Dronacharya and NIS certified coaches and populates `coach_sports`.
- **16 Metro Stadiums & Venues (P3)**: [`setup_metro_venues.sql`](./setup_metro_venues.sql)
  - Inserts 48 premier metropolitan sports complexes and stadiums into `public.venues` and links to sports.
- **Athlete Profiles & Auth Linkage (P4)**: [`setup_athlete_profiles.sql`](./setup_athlete_profiles.sql)
  - Manages `public.athlete_profiles` with `user_id` foreign key referencing `auth.users(id)` and self-service RLS.
- **Trial Reminders & Notifications**: [`setup_trial_reminders.sql`](./setup_trial_reminders.sql)
  - Manages `public.trial_reminders` (WhatsApp alert dispatcher, Google Calendar deep-links, Apple `.ics`).
- **Research Repository**: [`setup_khelchronicle.sql`](./setup_khelchronicle.sql)
  - Manages `public.chronicle_papers` and `public.chronicle_submissions`.

---

## 4. Row Level Security (RLS) & Access Rules

All catalogue tables strictly enforce Row Level Security:
* **Anonymous & Authenticated Users**: Have read-only access (`SELECT`) to records with `publication_status = 'published'`.
* **Athlete Self-Publishing**: Grassroots athletes can insert their own profiles into `public.athlete_profiles`, and authenticated owners (`auth.uid() = user_id`) can update or delete their profiles.
* **Trial Reminders**: Anyone can schedule reminders in `public.trial_reminders`.
* **Listing Submissions**: User suggestions are written to `public.listing_submissions` with `status = 'pending_review'`.
