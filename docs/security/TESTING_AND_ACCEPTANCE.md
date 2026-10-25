# Testing Strategy and Acceptance Criteria

**Status:** Draft baseline

## Required layers
- Unit tests for domain logic and validation.
- Component tests for loading, empty, error and ready states.
- Integration tests for database/API contracts and permissions.
- End-to-end tests for core user journeys.
- Accessibility, responsive and basic performance checks.
- Migration tests and restore tests for data changes.

## CI gates
Install with the committed lockfile and documented runtime version; run formatting/linting, type checks, unit tests and production build. Add integration/e2e tests as capabilities are introduced. Report the actual result and failing log; never infer a pass from a green build alone.

## Data safety
Use isolated fixtures/test projects. Tests must not create fake public records or mutate production data.

## Acceptance record
Each feature PR should state scope, test commands/results, manual checks, known limitations, data/privacy impact and rollback considerations. Required checks must pass before merge.