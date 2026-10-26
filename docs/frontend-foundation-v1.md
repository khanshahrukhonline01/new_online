# Frontend Foundation V1

## Goal
Bring the development frontend closer to the live KhelGrid homepage reference while preserving current route behavior, data integration contracts, and honest unavailable/loading states.

## Design tokens
- **Page:** cool near-white `#F6F8FB`; surfaces white.
- **Brand navy:** `#10233F` for headings and strong text.
- **Brand green:** `#07964F` for primary actions, selected states, and positive accents.
- **Typography:** system/Inter-style sans-serif; compact labels, strong editorial headings, readable body copy.
- **Cards:** white, thin cool-gray border, 12–18px radii, restrained shadow.
- **Controls:** pill-style primary and secondary actions; visible keyboard focus.
- **Layout:** centered max-width content, compact sticky header, responsive sidebar, generous section spacing.

## Implemented in this foundation pass
- Switch global design tokens from dark to light surfaces.
- Apply the shared navy/green system to the existing header, nav, sidebar, cards, catalogue status, hero, form controls and footer.
- Add responsive tablet/mobile refinements and reduced-motion support.
- Keep existing page modules, routes, Supabase catalogue calls and status copy intact.

## Component contracts
- Reuse existing semantic building blocks and class patterns; add new variants through shared tokens rather than page-specific colors.
- Navigation links must remain real links and retain `aria-current`, skip navigation and focus states.
- Catalogue counts only display when returned by the configured public catalogue; no invented scores, venues, opportunities, prices, or availability.
- Keep loading, unconfigured, unavailable and empty states distinct.
- Do not wire a service or live feed until its provider, licensing and failure behavior are documented and tested.

## Verification required before merge
- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` in a Node version satisfying the repository's `>=22` engine.
- Compare desktop, tablet and mobile screenshots against the owner-provided homepage reference.
- Validate sidebar focus handling and keyboard navigation.
- Confirm Supabase errors/empty results still render honestly.
