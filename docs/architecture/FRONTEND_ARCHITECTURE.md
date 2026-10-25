# Frontend Architecture

**Status:** Draft planning baseline · **Stack observed:** React, TypeScript, Vite

## Responsibilities
- Keep route composition in the app layer; feature-specific UI and workflows in `src/modules/`; reusable UI/domain utilities in `src/shared/`; provider adapters in `src/integrations/`; global tokens and layout in `src/styles/`.
- Keep domain types and business rules independent of presentation components where practical.
- Keep data access behind typed adapters. UI components must not invent records or silently convert failed requests into empty success.
- Represent loading, unconfigured, unavailable, empty, ready, not-found and permission-denied states distinctly where relevant.
- Keep server-only credentials and privileged operations out of the Vite client bundle. Vite `VITE_*` variables are public at build time and must never contain secrets.

## Routing and navigation
Use the route catalogue as the proposed route source of truth. Each route must declare public/private classification, canonical URL, page owner, data dependencies, SEO/indexing behaviour and acceptance criteria. Navigation visibility is not authorization.

## Accessibility and responsive behaviour
Use semantic landmarks, keyboard navigation, visible focus, labelled inputs, accessible validation, reduced-motion awareness and responsive layouts. Avoid color-only status communication.

## Data and state
Keep canonical data in the approved backend when persistence is required. Local-only data must be clearly described and must not be mistaken for server-saved data. Add cancellation/error handling and avoid duplicate requests where practical.

## Verification
Before feature completion, run the documented type check, tests, lint/format checks where configured and production build. Add component/route tests for loading, empty, failure, success and unauthorized cases. Record actual command output; do not claim checks passed without evidence.