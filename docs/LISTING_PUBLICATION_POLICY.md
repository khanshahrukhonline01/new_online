# KhelGrid Listing Publication Policy

**Document Version:** 1.0  
**Effective Date:** 2026-11-10  
**Scope:** KhelGrid Platform Catalogue Publication, Moderation Standards, and Discovery Rules  

---

## 1. Core Principle: Separation of Approval and Publication

A cornerstone of KhelGrid's catalogue governance is the strict separation between **moderation approval** and **public publication**:

1. **Moderation Approval (`approved` status):**
   - Approval signifies that human moderators have evaluated the submitted information for safety, authenticity, community value, and compliance with anti-spam standards.
   - Approval is strictly internal. **Approval does not create a public record in any public catalogue table, nor does it make the submission visible to public search or discovery.**

2. **Public Publication (`published` status):**
   - Publication is a distinct, explicit, secondary action executed by an authorized moderator.
   - Publication validates technical criteria (e.g. required schema fields, unique URL slugs, location normalization) and maps attributes into the production catalogue tables.
   - Only when a listing is in `published` status and has its active publication flags enabled does it appear in public search results, city directories, and sports detail routes.

---

## 2. Category-Specific Publication Requirements

To be published, a submission must satisfy both general platform quality benchmarks and category-specific mandatory fields:

### 2.1 Sports Opportunities & Trials (`opportunities`)
- **Target Table:** `public.opportunities`
- **Mandatory Fields:**
  - `title`: Minimum 5 characters, specifying age category and sport.
  - `city`: Standardized Indian city.
  - `source_url`: Official HTTPS link to club, academy, or federation announcement.
- **Published State:** `status = 'published'`, `is_active = true`.
- **Public Visibility:** Visible in `/opportunities`, trial alerts, and sport-specific trials feeds.

### 2.2 Sports Venues & Facilities (`venues`)
- **Target Table:** `public.venues`
- **Mandatory Fields:**
  - `name`: Official facility name.
  - `city`: Standardized Indian city.
  - `slug`: Unique, lower-case, URL-safe identifier (e.g., `sarjapur-turf-park`).
- **Published State:** `publication_status = 'published'`, `is_published = true`.
- **Public Visibility:** Visible in `/venues`, interactive map, city pages, and `/venues/:slug`.

### 2.3 Academies (`academies`)
- **Target Table:** `public.academies`
- **Mandatory Fields:**
  - `name`: Academy brand or institution name.
  - `city`: Standardized Indian city.
  - `slug`: Unique, lower-case, URL-safe identifier (e.g., `tata-archery-academy`).
- **Published State:** `publication_status = 'published'`, `is_published = true`.
- **Public Visibility:** Visible in `/academies`, `/academies/:slug`, and sports hub hubs.

### 2.4 Coaches & Trainers (`coaches`)
- **Target Table:** `public.coaches`
- **Mandatory Fields:**
  - `full_name`: Verified coach name.
  - `city`: Operating city.
  - `slug`: Unique URL-safe identifier.
- **Published State:** `is_published = true`, `is_active = true`.
- **Public Visibility:** Visible in `/coaches` and coach inquiries.

### 2.5 Events & Grassroots Tournaments (`events`)
- **Target Table:** `public.events`
- **Mandatory Fields:**
  - `title`: Tournament / competition name.
  - `city`: Host location.
  - `source_url`: Official rulebook or registration portal.
- **Published State:** `status = 'published'`, `is_active = true`.
- **Public Visibility:** Visible in `/events` and sports calendar.

### 2.6 Pickup Games (`pickup_games`)
- **Target Table:** `public.pickup_games`
- **Mandatory Fields:**
  - `title`: Game title.
  - `city`: Operating city.
- **Published State:** `status = 'published'`, `is_active = true`.
- **Public Visibility:** Visible in `/play` and city pickup discovery.

### 2.7 Sports Directory (`sports`)
- **Target Table:** `public.sports`
- **Mandatory Fields:**
  - `name`: Official discipline name.
  - `slug`: Unique identifier.
- **Published State:** `is_active = true`.
- **Public Visibility:** Visible in `/sports` and navigation ribbons.

---

## 3. Idempotent Publication & Slug Collision Policy

- **Slug Generation:** If a moderator does not provide a custom slug, the system automatically derives one via `generate_catalogue_slug(title)` (normalizing special characters, spaces, and diacritics to hyphenated ASCII).
- **Collision Resolution:** If the candidate slug already exists on another catalogue record, a short deterministic or random hexadecimal suffix is appended (e.g., `smash-badminton-arena-a1b2c3d4`) to preserve uniqueness.
- **Idempotency Guarantee:** If `publish_listing_submission` is invoked on an already published record, the function returns the existing `published_record_id` and does NOT generate a duplicate catalogue row.

---

## 4. Unpublication & Archival Policy

When a listing is no longer valid, accurate, or safe:

1. **Mandatory Reason Requirement:** A listing cannot be unpublished without recording a substantive justification in `unpublish_reason`.
2. **Reversible Soft-State:** Unpublication changes catalogue status flags (e.g. `is_published = false`, `status = 'archived'`). It **never** issues destructive `DELETE` or `TRUNCATE` statements.
3. **Audit Trail Persistence:** Every unpublish action logs the actor ID, timestamp, reason, and previous state to `public.listing_submission_audits`.
4. **Submitter Tracking Notice:** The submitter tracking view displays an informative `Listing Unpublished` status with an explanation that the listing was retired from the public catalogue.
