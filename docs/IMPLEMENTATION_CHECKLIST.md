# KhelGrid Implementation Checklist

- Status: Initial execution checklist derived from the frozen planning baseline
- Baseline date: 2026-10-25
- Repository: `khelgrid-platform`
- Branch: `feat/app-shell-discovery-modules`
- This checklist tracks implementation work; unchecked items are not complete. Do not infer successful tests from documentation alone.

## Gate 0 — Establish a reproducible baseline
- [ ] Confirm the intended private repository, branch, commit SHA and Node/npm versions.
- [ ] Run lockfile-based install in a real checkout.
- [ ] Run typecheck, lint, unit tests and production build; record exact command, SHA, exit code and logs.
- [ ] Inventory CI workflows and retrieve actual run results for the exact commit.
- [ ] Record existing failures before feature work; do not hide baseline failures.
- [ ] Confirm no development environment points to production Supabase or production secrets.

## Gate 1 — Route and page parity
- [ ] Inventory every production page route, alias, redirect, API endpoint, static/technical endpoint and mobile/deep link.
- [ ] Record each route's target, disposition (rebuild/merge/defer/retire), phase, access class, source and acceptance test.
- [ ] Implement approved public MVP routes using the shared route registry.
- [ ] Test direct load, refresh, back/forward, aliases, unknown routes, canonical behaviour and responsive layouts.
- [ ] Confirm deferred capabilities are not shown as available.

## Gate 2 — Public app foundation and content quality
- [ ] Finalize design tokens, responsive shell, shared navigation, footer, search and accessible states.
- [ ] Support a data-driven catalogue of at least 100 sports with reusable detail templates and aliases.
- [ ] Audit every sport page for unique, useful, source-backed content; no mass-generated interchangeable pages.
- [ ] Create URL-level content inventory and index/noindex/consolidate/withhold decision.
- [ ] Verify titles, descriptions, canonical URLs, robots, sitemap and structured data against visible content.
- [ ] Review privacy, editorial, correction, contact and other trust/legal pages against actual practices.

## Gate 3 — Opportunities, editorial workflow and archive
- [ ] Implement one authoritative data source for active listings, details, APIs and archive.
- [ ] Build the KhelGrid editorial template with provenance, source/evidence, checked time, dates, eligibility, fees, contact, status, attribution, reviewer and recheck/expiry.
- [ ] Implement separate review states: verified by KhelGrid, source listed—not independently verified, under review, expired/closed, cancelled and rejected/removed.
- [ ] Prevent under-review, rejected and insufficiently checked records from public active pages.
- [ ] Implement automatic expiry/archive with stable IDs and preserved history.
- [ ] Ensure active queries exclude overdue records even if scheduled reconciliation fails.
- [ ] Test deadline rollover, multi-day events, cancellation, evidence-backed extensions, missing/conflicting dates, time zones, retry/idempotency and scheduler outage.
- [ ] Ensure homepage, search, category/city pages, API, sitemap, metadata and caches agree on lifecycle status.
- [ ] Build a public archive with accurate status and suitable filters; never imply expired items are open.

## Gate 4 — Venue directory
- [ ] Publish only reviewed, evidence-backed venue information.
- [ ] Show missing information as unknown; never fabricate price, hours, amenities, reviews, photos or availability.
- [ ] Ensure public queries exclude unpublished/internal records.
- [ ] Keep booking, availability holds, payments and booking CTAs disabled for this release.
- [ ] Test mobile usability, search/filter behaviour, source attribution and empty/error states.

## Gate 5 — Private Sports CV
- [ ] Approve the comprehensive CV field schema and mandatory/optional rules.
- [ ] Implement CV create/edit, preview and PDF export without requiring login.
- [ ] Support optional relevant sections, concise/full layout, reordering and Unicode text.
- [ ] Document local-first storage and browser-data-loss limitations.
- [ ] Ensure CV content is not sent to backend or analytics by default.
- [ ] Exclude sensitive address, emergency/guardian contacts and sensitive identifiers from default export.
- [ ] Test validation, empty sections, long content, page breaks, PDF/preview consistency, save/edit, delete/reset and no unintended network transmission.
- [ ] Do not implement server sync, public profiles or sharing in this release.

## Gate 6 — Security, privacy and data operations
- [ ] Verify effective development database grants and RLS policies, including anonymous/owner/cross-user tests.
- [ ] Confirm project identity before any database operation; no production writes.
- [ ] Review secrets, server/client environment separation, input validation, safe errors, rate limits and logs.
- [ ] Complete third-party script and consent inventory; defer ad/analytics activation until approved.
- [ ] Complete isolated backup restoration drill and document recovery objectives.
- [ ] Document incident response, rollback and operational ownership.

## Gate 7 — AdSense/content re-review
- [ ] Audit every indexable public URL, including archives, filters and location/category variants.
- [ ] Improve, consolidate, noindex or withhold thin, duplicate, empty or unsupported pages.
- [ ] Confirm all factual claims, statistics, images and editorial claims are appropriately sourced/licensed.
- [ ] Check navigation, mobile readability, broken links, privacy disclosures and ads-to-content balance.
- [ ] Review current Google AdSense publisher policies before reapplication.
- [ ] Record final human content-review sign-off; do not guarantee approval.

## Gate 8 — Release decision
- [ ] All MVP acceptance tests pass on the exact release commit.
- [ ] CI evidence and staging smoke tests are linked and reviewed.
- [ ] No unresolved P0 security, privacy, content-integrity or data-integrity blocker remains.
- [ ] Backup/restore, monitoring, incident contact and rollback are ready.
- [ ] Explicit owner approval recorded for the release commit and target environment.
- [ ] Deploy only after that approval; run post-deployment smoke tests and record results.

## Change control
Any scope change must record: request, reason, affected requirements/routes, dependencies, security/content/SEO/cost impact, acceptance tests, decision owner and approval date. Changes do not silently alter the approved first-release scope. Production migration, credentials, merge and deployment approval remain separate decisions.
