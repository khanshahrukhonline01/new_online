# Roadmap and Dependencies

**Status:** Draft planning baseline

## Route prioritization
Use the [Navigation and Route Catalogue](NAVIGATION_AND_ROUTE_CATALOGUE.md) as the full candidate route list. A route does not automatically belong in Stage A; sequence it according to product priority, dependencies, privacy/security risk and capacity. See the [Documentation Audit and Gap Register](../DOCUMENTATION_AUDIT_AND_GAP_REGISTER.md) for unresolved overlaps and gaps.

## Stage A — Discovery MVP
App shell; sports discovery; sourced opportunities; published venue directory; local-first Sports CV; footer/legal routes; SEO basics; responsive/accessibility checks; CI and release controls.

## Stage B — Trust and operations
Editorial review workflow, freshness/expiry handling, correction and takedown workflow, stronger search, monitoring, tested backups/restores, privacy controls matching actual integrations.

## Stage C — Accounts and transactions (separate approval)
Authentication, profiles, saved items, applications, notifications, booking holds, court-specific availability and payments. Requires security, legal, provider, reconciliation and database concurrency review.

## Stage D — Live sports data and community (separate approval)
Authorized provider integration, attribution, quota/caching policy, outage behaviour, social/community features and moderation.

## Dependencies and gates
- Content features depend on provenance, expiry, publication status and source-link rules.
- Database-backed features depend on reviewed schema, RLS, migrations and seed/test separation.
- Booking depends on trusted server-side authorization, atomic overlap protection, published venue/court, operating hours, approved pricing and expiry of holds.
- Payments depend on booking correctness, provider approval, reconciliation, refund policy and incident handling.
- Live feeds depend on provider contract/terms, rights, quotas, attribution and fallback states.
- Production release depends on passing CI, review, preview validation, rollback plan and explicit approval.

Prioritize trust, data correctness and safety over adding feature count. Dates and estimates should be added only after the project owner confirms capacity.