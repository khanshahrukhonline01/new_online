# KhelGrid Database Architecture & SQL Catalogue

This directory contains the database schema, versioned migrations, and seed scripts for the KhelGrid platform on Supabase (PostgreSQL).

---

## Directory Overview

```text
supabase/
├── migrations/                # Version-controlled, timestamped schema & data migrations (CI verified)
│   ├── 20261025..._core.sql
│   ├── 20261028..._directory_and_listing_moderation.sql
│   ├── 20261030140000_seed_official_academies_coaches_events.sql
│   └── 20261030170000_seed_live_khelgrid_academies.sql
│
├── seeds/                     # Numbered, standalone runners for Supabase SQL Editor
│   ├── 01_setup_academies.sql
│   ├── 02_setup_coaches.sql
│   ├── 03_setup_events.sql
│   └── 04_seed_all_276_academies.sql
│
├── tests/                     # pgTAP database tests
│
├── setup_academies.sql        # Standalone: Academies schema & initial verified seed
├── setup_coaches.sql          # Standalone: Coaches schema & Dronacharya seed
├── setup_events.sql           # Standalone: Events schema & national championships seed
└── seed_live_khelgrid_academies.sql # Standalone: All 276 verified academies from live website
```

---

## 1. Automated Migrations (`supabase/migrations/`)

These files follow the standard Supabase CLI migration naming convention: `<YYYYMMDDHHMMSS>_<name>.sql`.
* Every file is transactional (`BEGIN; ... COMMIT;`).
* Every file is non-destructive (`CREATE TABLE IF NOT EXISTS`, safe index creation, additive RLS policies).
* GitHub Actions automatically tests every migration in CI before any pull request can merge.

---

## 2. Standalone Seed Runners (`supabase/seeds/`)

If you are setting up a new Supabase environment or running queries manually in the **[Supabase SQL Editor](https://supabase.com/dashboard)**, run these files in order:

| Step | File | Purpose |
| :--- | :--- | :--- |
| **01** | `seeds/01_setup_academies.sql` | Creates `public.academies` and `public.academy_sports` tables, RLS policies, indexes, and initial verified academies. |
| **02** | `seeds/02_setup_coaches.sql` | Creates `public.coaches`, `public.coach_sports`, and `public.coach_academies` tables, RLS policies, and Dronacharya coaches. |
| **03** | `seeds/03_setup_events.sql` | Creates `public.events` table, RLS policies, and national tournaments (Khelo India, Santosh Trophy, Senior Nationals). |
| **04** | `seeds/04_seed_all_276_academies.sql` | Inserts all 276 verified academies across 90+ Indian cities and maps them to sports across the 34-sport taxonomy. |

---

## 3. Row Level Security (RLS) & Access Rules

All catalogue tables strictly enforce Row Level Security:
* **Anonymous & Authenticated Users**: Have read-only access (`SELECT`) to records with `publication_status = 'published'` and `verification_status != 'rejected'`.
* **Public Writes**: No direct inserts, updates, or deletes are permitted from public clients.
* **Listing Submissions**: User suggestions are written to `public.listing_submissions` with `status = 'pending_review'`.
