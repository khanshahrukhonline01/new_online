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

## Permanent KhelGrid sidebar boundary

The current sidebar is a component-owned navigation surface:

- `src/shared/components/Sidebar.tsx` owns navigation rendering, route links, active states, section expansion, drawer interactions, focus management and mobile navigation markup.
- `src/shared/components/Sidebar.css` owns sidebar dimensions, icon sizing, collapsed/expanded presentation, hover/focus expansion, independent scrolling, mobile drawer and bottom-navigation presentation, and the shell reservation needed to integrate the rail.
- `src/shared/navigation/navigationRegistry.ts` owns navigation groups, labels, icons, destinations and availability.
- `src/App.tsx` owns application-level route composition and the collapsed/mobile menu state. It should not contain sidebar visual rules.
- `src/styles.css` owns global design tokens and general site styles. Do not add component-specific sidebar selectors or append sidebar override blocks there.

### Desktop layout contract

Reserve exactly `64px` for the sidebar in the application workspace and footer. The desktop sidebar is fixed below the `68px` site header. Its collapsed width is `64px`; hover or keyboard focus temporarily overlays the page at `256px`. The overlay must not alter workspace, page-shell, catalogue, hero-carousel or footer dimensions. Pointer leave returns it to the compact rail. The main menu button may explicitly toggle the persistent expanded state.

### Mobile layout contract

At `700px` and below, remove the desktop rail reservation. Use the separate off-canvas drawer and fixed bottom navigation. The drawer must retain Escape-to-close, focus return, focus containment and accessible labels.

### Change policy

For normal visual or navigation presentation changes, edit `Sidebar.tsx`, `Sidebar.css`, or the navigation registry as appropriate. Change `App.tsx` only when the application-shell state or integration contract changes. Update sidebar tests and this documentation in the same pull request. Do not duplicate sidebar CSS in global styles.
