# Data Quality, Lifecycle and Provenance

**Status:** Draft baseline

## Required provenance for opportunities
Record original source URL, source publisher, source publication date when known, event date/deadline, retrieval/review time, sport, location, eligibility, fee only if explicitly sourced, contact/source route, verification status and expiry/archive status.

## Status vocabulary
Distinguish draft, pending review, published, corrected, expired, withdrawn and rejected. “Officially verified” may be used only when the defined verification procedure and evidence support it. A source link alone is not proof of current validity.

## Quality controls
Reject malformed dates, invalid URLs, contradictory status/date combinations, unsupported prices, duplicate source records and missing mandatory fields. Keep an audit trail for material edits and approval changes.

## Freshness and expiry
Define review intervals by content type. Expired opportunities should not appear as open/current. If the status cannot be confirmed, label it accordingly or remove it from active discovery pending review.

## Copyright and privacy
Store only the minimum excerpt/metadata necessary. Link to original sources, respect publisher terms, copyright, personal data and access controls. Do not copy entire articles or publish private contact details without a lawful basis.

## Test data
Fixtures must be marked as test-only, isolated from production data and never presented as genuine public listings.