# Frontend and System Architecture

**Status:** Draft aligned with current implementation

## Current baseline
React + TypeScript + Vite. Keep route/page composition, domain types, shared UI, integrations and styles separated. The current lightweight route shell is not a substitute for a router if route complexity grows.

## Suggested boundaries
- `src/app/`: application bootstrap, route composition and global providers.
- `src/shared/`: domain types, reusable UI and non-feature utilities.
- `src/modules/<feature>/`: feature pages and feature-specific logic.
- `src/integrations/<provider>/`: isolated external service adapters.
- `src/styles/`: tokens and global styling.
- `tests/`: integration, contract and end-to-end tests as the suite grows.

## Data flow
UI calls typed feature functions; integration adapters handle network and parsing; UI maps results to explicit states. Validate untrusted response data before rendering. Keep provider-specific logic out of page components.

## Architecture rules
No secrets in client bundles. Keep public read access constrained by RLS and published status. Avoid duplicated domain types. Avoid localStorage for authoritative booking/availability state. Keep errors observable but do not leak tokens or sensitive records.

## Growth path
Introduce a routing library, server/API layer, state/cache library or background jobs only when requirements justify them. Document decisions and migration impact before adding infrastructure.