# KhelGrid — Phase 6: Data Classification & Privacy Matrix
## DPDP Act 2023 Compliance & Data Sensitivity Hierarchy

**Document:** Data Classification & Privacy Matrix  
**Programme:** KhelGrid 10-Phase Security & Authorization Programme  
**Phase:** Phase 6 — Athlete and Personal Data Privacy  
**Target Database:** Supabase Development Instance `hznsbxvovjxvmnchzzqt`  
**Date:** November 8, 2026  

---

## 1. Data Classification Tiers

| Tier | Category | Description | Storage Entities | Access Rules & Masking Controls |
|:---:|---|---|---|---|
| **Tier 1** | **Public Discovery** | Public sports directory and catalogue metadata | `sports`, `academies`, `venues`, `events`, `cities`, `site_announcements`, `chronicle_categories` | Unrestricted anonymous read (`TO anon, authenticated`). No personal contact data allowed. |
| **Tier 2** | **Sanitized Public Profile** | Athlete name, athletic discipline, bio, combine benchmark percentiles, video drills | `athlete_profiles` (Sanitized view / `get_athlete_public_cv`) | Anonymous read permitted ONLY when `public_consent_granted = true`. Minor athletes (< 18) must have verified guardian consent. Exact DOB, phone, and email are stripped. |
| **Tier 3** | **Private Account Data** | User email address, mobile phone number, city, auth IDs | `profiles`, `auth.users` | Owner-only read (`auth.uid() = id`). Direct Data API SELECT revoked from `anon`. Direct table access strictly barred. |
| **Tier 4** | **Minor Personal Data** | Full date of birth, school name, parent/guardian phone, Aadhaar card scans | `guardian_consents`, `athlete_profiles` (restricted columns), `cv-documents` bucket | Owner and guardian access only. Direct anonymous access completely prohibited (`USING (false)`). Signed URLs required with 15-minute TTL. |
| **Tier 5** | **Commercial & Transactional** | Booking vouchers, subscription orders, billing amounts, settlement account numbers | `venue_bookings`, `listing_subscriptions`, `khelgrid_payments` | Authenticated owner read (`user_id = auth.uid()`) OR verified 192-bit cryptographic token. Masked name and email for receipts; phone numbers and payment keys omitted. |
| **Tier 6** | **Authentication & Security Audit** | Security audit events, role grants, rate-limit keys, password reset tokens | `auth_security_events`, `user_role_audit_logs`, `api_rate_limits` | Restricted strictly to `service_role` and platform `admin`. Zero anonymous read or write. |

---

## 2. Sensitive Personal Field Directory

| Field Name | Table / Object | Classification | Masking & Redaction Strategy | Purpose |
|---|---|---|---|---|
| `phone` | `profiles` | Private Account (Tier 3) | Direct table read denied. Never exposed in public profile RPC. | Account authentication & SMS OTP. |
| `email` | `profiles` | Private Account (Tier 3) | Direct table read denied. Masked as `a***@domain.com` in owner-authorized receipts. | Account notifications & password recovery. |
| `date_of_birth` | `athlete_profiles` | Minor Personal Data (Tier 4) | Full date hidden for public queries; only birth year or age displayed. | Age-group trial categorization (U-14, U-16, U-19). |
| `customer_phone` | `venue_bookings` | Commercial PII (Tier 5) | Completely omitted from `get_venue_booking_voucher`. | Turf entry gate check-in verification. |
| `guardian_phone` | `guardian_consents` | Minor Guardian PII (Tier 4) | Owner & guardian only. Masked as `+91 98*** **210`. | Statutory DPDP guardian consent for minors. |
| `access_token` | `listing_subscriptions` | Cryptographic Token (Tier 5) | 192-bit hex string; unselectable by public table query. | Unguessable subscription receipt retrieval. |
| `voucher_token` | `venue_bookings` | Cryptographic Token (Tier 5) | 192-bit hex string; unselectable by public table query. | Booking voucher gate access. |
