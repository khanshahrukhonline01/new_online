# Sports Directory and Search/Discovery

**Status:** Planned specification

## Scope
Browse published sports, open sport detail pages, and discover related opportunities and venues where supported by real data.

## Data
Use canonical sport identifiers, display name, slug, description, approved imagery/licence, publication state and timestamps. Avoid duplicate sport aliases and unsubstantiated popularity counts.

## Search and filtering
Define searchable fields, filters, sort order, empty state and invalid query behaviour. Filters must reflect actual data, not hardcoded promises. Preserve useful URL query state where supported.

## Acceptance
Only published records appear publicly; invalid/unavailable service states are distinct from no results; links are crawlable; mobile and keyboard navigation work; page titles and descriptions are meaningful; tests cover filtering and empty/error states.