# Product Requirements Document

**Status:** Draft baseline · **Owner:** Project owner · **Review:** Before Stage A release

## Product purpose
KhelGrid helps people discover sports, credible selection opportunities/trials, venues and courts, and create a Sports CV. Trustworthy information and clear source attribution take priority over listing volume.

## Audiences
- Athletes and families looking for sports pathways and trials.
- Coaches, academies, organisers and venue operators.
- Visitors researching sports and facilities.

## Stage A scope
- Responsive home, navigation, search/discovery foundations.
- Published sports directory.
- Opportunities/trials with source, eligibility, dates, location, fee (only if sourced), contact/source links and status.
- Venue directory with verified factual fields; no invented pricing or availability.
- Sports CV creation with explicit privacy/data-retention explanation.
- Legal/policy routes and accessible footer.
- SEO fundamentals, error states, testing and safe deployment.

## Explicitly out of scope until separately approved
Accounts, applications, saved items, booking/holds, payments/refunds, user messaging, community submissions, notifications, personalized tracking, and live-score feeds.

## Non-functional requirements
- Mobile-first responsive layout and keyboard accessibility.
- Honest loading, empty, unavailable and error states.
- Secure-by-default data access; no service-role credentials in browser code.
- Source provenance and freshness for time-sensitive listings.
- No fake or simulated records represented as real.
- Automated checks, review, rollback plan and explicit production approval.

## Core journeys
1. Discover a sport and browse relevant published information.
2. Evaluate an opportunity using the original source and eligibility/date details.
3. Explore venues without implying booking or live availability.
4. Create/export a Sports CV without silently transmitting personal information.

## Acceptance
Each in-scope page has documented requirements, responsive and accessibility checks, source/data rules, error/empty states, tests, and reviewed SEO/privacy impact. Unimplemented functionality is clearly labelled unavailable or planned.

## Open questions
Confirm target audience priorities, support/contact details, applicable legal jurisdictions, content ownership, and success metrics before approval.