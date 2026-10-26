# KhelGrid Homepage — Visual Reference & Preservation Contract

**Reference captured:** 25 October 2026  
**Reference source:** current live homepage screenshot supplied by the project owner in the development conversation (`screencapture-khelgrid-2026-10-25-18_19_26.png`).  
**Purpose:** use the existing production homepage as the visual baseline for the separate `khelgrid-platform` development repository.

> This is a design-preservation requirement, not permission to change the production site. Keep all work in this development repository and its preview deployments until explicitly approved.

## Design intent

Preserve the existing KhelGrid identity and the overall information hierarchy visible in the reference:

- White / very-light cool-gray page surfaces with restrained borders, rounded cards, subtle shadows and generous spacing.
- KhelGrid navy/dark ink typography, green primary actions and green status accents; retain the official KhelGrid logo.
- Compact top navigation with the sport/category chips and a narrow left-side icon rail on desktop.
- A long, editorial homepage composed of clearly separated sections rather than a generic template or a single hero-only landing page.
- Small, dense information cards and horizontal card rows for sports, trials/combines, venue booking, sports CV, editorial content and featured opportunities.
- Dark, high-contrast promotional panels used selectively between lighter sections.
- Trust / authoritative-source content, FAQ, city/venue discovery and a substantial multi-column footer remain part of the page structure.
- Responsive behavior must retain the same visual identity and content priorities on mobile; prevent horizontal overflow and ensure cards, chips and navigation remain usable.

## Homepage section order to preserve

Use the screenshot as the visual guide for section order and relative emphasis. The visible page includes:

1. Header, navigation and sport/category chips.
2. Introductory sports discovery heading and compact sport tiles.
3. Selection trials / combines.
4. Venue and court booking discovery.
5. Sports CV / athlete profile promotion.
6. KhelGrid editorial / Chronicle content.
7. Mobile app promotion.
8. Featured training / opportunities cards.
9. Authoritative grassroots sports network / selection-grid information.
10. Sports opportunity audit / trust and data-quality content.
11. FAQ and support prompt.
12. Utility links, sports discovery and top sports complexes by city.
13. Multi-column footer and secondary navigation.

Treat this list as the reference's content hierarchy, not as evidence that every data source or listing is currently available.

## Non-negotiable implementation rules

- **Do not redesign from scratch.** Match the reference before introducing a new visual system.
- Preserve the existing KhelGrid logo, navy/green palette, compact rounded card language, section spacing and overall information architecture.
- Build reusable components and shared tokens for colors, typography, spacing, borders, radii, card layouts and breakpoints instead of styling each section independently.
- Compare desktop and mobile previews against the reference screenshot at representative viewport sizes; fix visual regressions before marking the homepage complete.
- Do not invent live scores, venues, prices, availability, trials, verification badges, statistics or claims. Render genuine provider/database content only; show honest loading, empty, unavailable and error states where needed.
- Preserve current Supabase-backed data integrity, access controls and provider licensing requirements. A visual reference does not authorize mock data or weakening security.
- Keep the production site and its database unchanged. Develop in this repository and validate via preview/CI; production rollout requires explicit approval.
- Do not remove existing functional routes or working behavior merely to achieve a screenshot match.

## Acceptance checklist

- [ ] The reference image is checked into the repository under `docs/design-reference/` so future contributors can open the original directly.
- [ ] Homepage layout and section order are compared against the reference.
- [ ] Desktop header, side rail, cards, section spacing, typography and navy/green palette are visually consistent.
- [ ] Mobile layout has been reviewed at narrow and tablet widths.
- [ ] No fabricated listings, scores, prices, availability or trust claims have been introduced.
- [ ] Existing routes, backend integrations, accessibility and responsive interactions continue to work.
- [ ] Build, lint and relevant tests pass; a preview URL and visual comparison are recorded before merge.

## Reference asset note

The source screenshot was supplied as a conversation attachment and is identified above by its original filename. It still needs to be committed as a binary asset at `docs/design-reference/homepage-reference-2026-10-25.png`; do not replace it with a newly generated mockup. Until the asset is committed, this document records the visual baseline and the rules future implementation must follow.
