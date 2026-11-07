# KhelGrid — Phase 6: Athlete Privacy & Profile Security Architecture
## Private-by-Default Profiles, Consent Controls & Sanitized CV Projections

**Document:** Athlete Privacy & Profile Security Architecture  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 6 — Athlete and Personal Data Privacy  
**Target Database:** Supabase Development Instance `hznsbxvovjxvmnchzzqt`  
**Date:** November 8, 2026  

---

## 1. Core Principles

1. **Private-by-Default**: Athlete profiles created on KhelGrid default to private (`public_consent_granted = false`). Only athletic information explicitly consented to by the athlete (or their legal guardian, if a minor) is rendered in public discovery.
2. **Decoupled Identity & Projections**: Direct Data API queries to `public.profiles` or `public.athlete_profiles` cannot scrape private fields (`email`, `phone`, exact `date_of_birth`, or uploaded identity cards).
3. **Statutory Consent Ledger**: All consents are recorded with timestamp, IP address, user-agent, and consent version in `public.user_consents` under the Digital Personal Data Protection Act (DPDP Act 2023).
4. **Data Portability & Erasure**: Compliant export (`public.export_user_data`) and right-to-be-forgotten (`public.anonymize_user_account`) procedures are provided at the database level.

---

## 2. Profile RLS Policy Enforcement

```sql
-- Direct table access: Authenticated owners can only read/update their own profile
CREATE POLICY "athlete_profiles_owner_read"
  ON public.athlete_profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "athlete_profiles_owner_write"
  ON public.athlete_profiles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Public discovery is gated on explicit consent & minor safety
CREATE POLICY "athlete_profiles_public_read"
  ON public.athlete_profiles FOR SELECT TO anon, authenticated
  USING (
    publication_status = 'published'
    AND public_consent_granted = true
    AND (
      is_minor = false
      OR EXISTS (
        SELECT 1 FROM public.guardian_consents
        WHERE minor_user_id = athlete_profiles.user_id AND is_active = true
      )
    )
  );
```

---

## 3. Sanitized Public CV Projection (`public.get_athlete_public_cv`)

To eliminate inadvertent data exposure through GraphQL or PostgREST schema reflection, public athlete profiles are served via `public.get_athlete_public_cv(p_username)`.

### Shielded vs. Public Fields:
- **Exposed Publicly**: `username`, `full_name`, `sport`, `playing_position`, `city`, `state`, `birth_year` (only year, not full date), `team_or_academy`, `coach`, `experience_years`, `primary_foot_or_hand`, `height_cm`, `weight_kg`, `summary`, `achievements`, `video_clips`, `fitness_benchmarks`, `player_card_stats`, `verification_status`.
- **Completely Shielded**: Mobile phone, email, full date of birth, Aadhaar/document IDs, home address, school name, and guardian contact details.
