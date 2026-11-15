# KhelGrid Five-Pillar SEO Implementation

**Status:** In progress — development branch only  
**Branch:** `feat/seo-five-pillars-foundation`  
**Production impact:** None intended. Do not merge or enable production indexing until the release gate below is satisfied.

## Goal

Turn the Search Console findings into reusable platform capabilities rather than one-off keyword edits. Preserve the existing public route history where practical, publish only useful verified records, and keep development/preview deployments out of search results.

## Search Console baseline

Use the uploaded Search Console export dated 15 November 2026 as the initial comparison source. Its chart totals report 89 clicks and 3,595 impressions for the displayed period. Recalculate CTR from totals (2.48%); do not reuse the conflicting 1,343-impression / 6.63%-CTR summary. The leading opportunity detail URLs in the supplied analysis include AIU Wushu, KCA U-14 cricket and SGFI Kabaddi. Recheck the exact date range and page/query dimensions before using these figures in an external report.

## Pillar 1 — Sports trials and opportunities (P0)

### Implemented in this branch
- Route resolution now accepts the existing `/trial/:slug` family and compatibility aliases `/trials/:slug`, `/opportunity/:slug`, and `/opportunities/:slug`.
- Existing `/opportunities/:slug/apply` behavior is retained.
- Opportunity lookup tolerates a single leading `t-` difference while preserving the database slug as the canonical URL.
- Detail metadata is derived from the loaded record rather than generic route text.
- Opportunity detail routes start as `noindex`; only a loaded record with `verification_status = verified` is eligible for indexing.
- `SportsEvent` JSON-LD is emitted only for verified trial/combine/camp records with a valid start date and a real venue or city value. Organizer, end date and offer data are included only when supplied.
- Route tests cover the Search Console URL patterns.

### Still required before indexing
- Confirm the exact existing GSC slugs against published verified development records.
- Ensure the direct-request response contains useful page content for crawlers. The current Vite SPA and catch-all rewrite do not provide server-rendered detail HTML or reliable HTTP 404 status for unknown slugs.
- Add server-side/prerendered route output or another tested crawler-readable delivery strategy before claiming full SEO readiness.
- Add browser tests for direct URL loading, missing records, alias/canonical tags, and verified/unverified states.
- Do not create FAQ schema unless the same questions and answers are visibly present on the page.

## Pillar 2 — Live sports and cricket (P0)

### Implemented in this branch
- Live-score metadata no longer promises real-time scores or ball-by-ball commentary.
- The live match centre is marked `noindex, follow` until the development environment has a connected, current match-data source.
- The live-score route is removed from the sitemap while noindex is in force.

### Still required before indexing
- Verify the data provider, freshness timestamp, match identity, score update cadence and error/stale states.
- Build match-specific canonical pages only when genuine match data and stable identifiers exist.
- Add structured data only for visible, current match information. Do not add `LiveBlogPosting` unless the page is actually a timestamped editorial live blog.
- Re-enable indexing only after feed connection and acceptance tests pass.

## Pillar 3 — Athlete identity and Sports CV (P1)

### Implemented in this branch
- Sports CV metadata no longer describes an athlete-entered CV as an independently verified profile or credential.

### Still required
- Treat “Khel ID” as a discovery/search-intent hypothesis, not an existing official identity service.
- Do not claim government/federation recognition, identity issuance or independent athlete verification unless those capabilities and authorities are established.
- Add a dedicated Khel ID landing page only after the product scope, privacy model, profile visibility and actual workflow are approved.
- Keep athlete-entered data clearly distinguished from verified evidence.

## Pillar 4 — Venues, turfs and academies (P1)

### Implemented in this branch
- Venue metadata describes discovery, not completed booking, live availability or hourly slot transactions.
- Academy and venue detail lookups no longer fall back to static curated records; direct Supabase detail queries enforce both published and verified status.
- Academy metadata describes published listings without asserting that every listing is verified.
- Sitemap detail URLs are no longer sourced from static curated/seed arrays.
- The build-time sitemap generator can add venue and academy detail URLs only from Supabase rows filtered by both `publication_status = published` and `verification_status = verified`.

### Still required
- Confirm each listing's source, public address/contact permission, and current status.
- Keep booking/pricing/availability claims disabled until those workflows are actually connected and tested.
- Add dedicated detail-page metadata and structured data based only on the visible verified record fields.

## Pillar 5 — KhelChronicle and Hindi discovery (P2)

### Existing foundation
- KhelChronicle already has repository, category, paper and author route families and a content dataset.
- Its current static sitemap includes the repository, categories, papers and authors.

### Still required
- Review every paper's editorial status, DOI, publication date, author metadata, canonical URL and visible page content before indexing.
- Do not submit the manuscript form route as a search landing page.
- Hindi route delivery, translated page content, reciprocal `hreflang`, language-specific canonicals and human review are not completed by this branch.
- Do not generate `/hi/` URLs until corresponding translated pages exist.

## Shared technical foundation

- Search metadata must match visible content; keywords meta tags are not treated as a ranking strategy.
- One canonical URL per page. SPA route aliases are compatibility paths, not separate sitemap entries.
- Development/local/preview builds default to `noindex, nofollow`. Indexing is explicitly opt-in using `VITE_SITE_INDEXABLE=true` scoped to the production Vercel environment only.
- The Vite HTML transform applies robots directives before React loads; the runtime SEO utility enforces the same deployment rule after navigation.
- Sitemap generation reads only public catalogue slugs from Supabase using the anon key and read-only REST requests, filtering for published + verified records. If variables or network access are unavailable, dynamic detail URLs are omitted and the build remains usable.
- Do not invent `lastmod` values. Emit them only when a source record provides an actual modification/publication date.
- Do not change production DNS, domains, database, secrets, or deployment configuration as part of this branch.

## Latest validation findings (15 November 2026)

- The first GitHub Actions run reached the application typecheck after all isolated PostgreSQL security and payment checks passed.
- That typecheck exposed malformed effect dependency closers in the academy and venue detail pages and an unclosed venue inquiry paragraph. These syntax errors have been corrected on this branch; a new CI run is required to confirm the correction.
- The current Vercel preview checks remain blocked by the account build-rate limit. No preview build or browser acceptance result is being claimed.

## Acceptance gate

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Verify local and Vercel Preview HTML contains `noindex, nofollow` before JavaScript runs.
- [ ] Verify the runtime never overrides preview noindex.
- [ ] Verify production Vercel environment has `VITE_SITE_INDEXABLE=true` only after explicit release approval; do not set this for Preview.
- [ ] Verify the sitemap contains only canonical hubs and records returned as published + verified.
- [ ] Verify no `/trial` detail appears in the sitemap if the catalogue fetch fails.
- [ ] Verify the known GSC trial paths load the correct published record and use its stored slug as canonical.
- [ ] Verify unverified, unpublished, missing and expired records are not incorrectly represented as active verified opportunities.
- [ ] Validate JSON-LD against the visible detail page and Google's current Rich Results Test.
- [ ] Run Playwright/browser checks for mobile rendering and direct navigation.
- [ ] Confirm production branch, production domain and production Supabase project remain unchanged.

## Explicit non-goals

This branch does not promise rankings, guarantee indexing, launch Khel ID, connect live cricket feeds, enable venue booking, create fake listings, publish unreviewed research, or deploy to production.
