# Pillar 2 — Live Sports & Cricket Discovery

**Status:** Implemented in development branch; CI and provider/legal release gates pending

## Changes

- Preserve the existing live sports engine, periodic refresh, sport/format/status filters, score cards and scorekeeper workflow.
- Remove hardcoded Bengaluru sample community fixtures and clean those legacy fixture IDs from browser storage.
- Require a real tournament name, both team names, actual venue, city and scorer/host name when a community scorekeeper creates a match.
- Separate external ESPN scoreboard-feed records from locally stored community scorekeeper entries. The external-feed indicator no longer turns on just because a local entry exists.
- Skip external events that lack both team names or a competition name instead of inventing placeholder labels.
- Attribute the current endpoint as an external ESPN scoreboard feed, not an “official” feed.
- Remove unsupported “Fastest”, permanent WPL/ICC coverage and ball-by-ball claims from live-page metadata.
- Keep page-level `WebPage` JSON-LD only. Do not emit `SportsEvent` or `LiveBlogPosting` markup from cards without canonical event URLs, verified event dates and actual venue addresses.
- Remove the hardcoded WPL season from the filter label.

## Deliberately unchanged

- No live-score provider replacement, paid API, credentials or subscription.
- No production database, DNS, Vercel environment or production deployment changes.
- No changes to refresh interval, cache policy, match filters, sound alerts or match-card interactions.
- No claim that provider terms authorize redistribution.

## Release gates

1. Confirm provider permitted use, attribution, caching limits, branding/logo permissions and commercial restrictions.
2. Verify source freshness and stale-feed handling against an approved provider contract.
3. Define stable match detail URLs; only add event markup when date, location, status and provenance are complete.
4. Confirm rendered HTML, canonical metadata and preview/production robots behaviour before enabling indexing.
5. Run typecheck, full Vitest suite, lint, production build and browser acceptance tests. Verify no sample fixtures appear in a clean browser profile.
6. Production smoke test only after explicit release approval.

Passing tests does not replace provider permission, legal review or live-feed monitoring.
