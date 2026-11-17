# Pillar 3 — Athlete Profile Privacy & Publication Audit

**Project:** KhelGrid development Supabase `hznsbxvovjxvmnchzzqt`  
**Audit date:** 15 November 2026  
**Scope:** Read-only schema, RLS, RPC and migration-history inspection  
**Status:** Critical privacy and trust gaps found; public athlete profile publication remains paused

## Findings

### P0 — Public CV RPC does not enforce the intended consent boundary

The installed `public.get_athlete_public_cv(text)` function is `SECURITY DEFINER`, executable by `anon` and `authenticated`, and filters by `publication_status='published'`. Its live definition does not check `is_public_cv`, a public-profile consent record, or guardian consent.

A read-only aggregate query confirmed that it currently returns three published athlete rows. All three rows have `is_public_cv=false` and `consent_scout_sharing=false`. Publication status alone currently makes these records retrievable through the public RPC.

**Impact:** athlete profile and performance details can be exposed even though the database's explicit public-CV flag is false.

### P0 — Consent schema expected by Phase 6 is absent

The development database does not contain `public.user_consents` or `public.guardian_consents`. The hosted migration history does not show `20261108080000_phase6_athlete_privacy_and_minor_protection` as applied.

The migration file is older than multiple migrations already applied to the hosted database. Its schema and function assumptions need reconciliation before it is applied.

**Impact:** the intended adult public-display consent and guardian-consent gates cannot currently be proven from the hosted database.

### P0 — Owner update policy does not protect verification/publication fields

The current `athlete_profiles_owner_update` policy uses only the owner predicate `user_id = auth.uid()` for both `USING` and `WITH CHECK`. Authenticated users have table-level UPDATE privilege. No column-level restriction was observed in this policy.

**Impact:** an athlete owner may be able to update their own `publication_status` or `verification_status` directly, bypassing the separate moderator RPC.

### P1 — Verification label cannot be trusted by the frontend

The database contains a guarded `moderate_athlete_profile` RPC and an audit table, but the owner update policy above still permits direct row updates under the current policy. A plain `verification_status='verified'` value is not sufficient evidence of a trusted moderation action.

**Impact:** a UI badge based only on the status string can make unsupported verification claims.

### P1 — Khel ID is not a globally unique identity credential

The current client generator hashes a username into a limited serial range. It is deterministic for a given handle but collisions are possible, and changing the handle changes the generated value unless a separate stored value is provided.

**Impact:** it must not be described as permanent, globally unique, government-backed, or proof of identity.

## Changes staged in Pillar 3 PR

- Public athlete routes fail closed rather than showing showcase or local-storage profiles.
- The client no longer publishes rows as verified/published or reports a successful public publication.
- Athlete profile routes are marked `noindex, nofollow` until the server-side eligibility gate is proven.
- Verification badges require an explicit trusted-server marker.
- Sports CV and Khel ID copy no longer implies verification or official identity status.

## No database changes

This audit used read-only queries. No migrations were applied, no rows were updated, no policies/functions were changed, and no production system was touched.

## Required remediation before public launch

1. Reconcile and safely install consent/guardian schema.
2. Enforce explicit public CV consent and verified guardian consent for minors in the public RPC.
3. Require `is_public_cv=true` before returning public profile data.
4. Remove owner ability to directly set publication and verification fields.
5. Return a minimal public projection and server-derived eligibility/verification provenance.
6. Add database tests for consent, revocation, minors, owner updates, non-owner access and moderator-only state changes.
7. Only then re-enable public profile rendering, dynamic metadata, structured data, social previews and sitemap entries.
