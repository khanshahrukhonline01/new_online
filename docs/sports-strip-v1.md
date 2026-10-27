# KhelGrid Sports Strip — V1 Reference

**Scope:** Horizontal sport navigation directly below the global top navigation.  
**Implementation:** `src/shared/components/SportsBar.tsx`, `src/App.tsx`, `src/styles.css`, `src/shared/sports/sportIcons.tsx`.

## Purpose

Provide a consistent, horizontally scrollable way to reach sport-specific catalogue pages without duplicating the KhelGrid logo or global search. The strip is shared across routes and uses the local sport icon manifest. It must render inside the main content column, never as a sibling before the workspace, so it cannot push down, resize, or alter the universal sidebar.

## Appearance

- Light neutral background, subtle bottom border, rounded pale-green chips, navy/muted labels, and KhelGrid green active state.
- Each chip contains a sport icon and label. “All Sports” uses a grid icon.
- Keep the strip compact and visually subordinate to the global header; target a 48 px desktop band and 42 px mobile band. Chips should be about 32–34 px high.
- Use fixed circular left/right controls to scroll the chip row.
- The chip row itself supports horizontal touch, trackpad, and wheel scrolling; its scrollbar is visually hidden while the controls remain available.
- Respect reduced-motion preferences.

## Behavior

- “All Sports” links to `/sports` in catalogue context.
- On home and sports routes, sport chips navigate to `/sports/:slug`.
- On other routes, a sport chip opens the real catalogue search at `/search?q=<sport name>`, because the current public Opportunity and Venue models do not expose a sport relationship suitable for safe in-place filtering. Do not describe this as a sport-filtered opportunities/venues view.
- The active sport chip is indicated for matching `/sports/:slug` routes; All Sports is active on `/` and `/sports`.
- All navigation uses the app's shared route handler to preserve history, scrolling, and mobile drawer behavior.
- Sport labels/icons come from `sportIconManifest`; this list is a navigation taxonomy, not a claim that every sport currently has published listings in Supabase.

## Responsive behavior

- Desktop/tablet: a single horizontal row; chips do not wrap. Use arrow controls or horizontally scroll the strip.
- Mobile: smaller spacing and arrow controls, with touch scrolling enabled.
- Render the strip as the first child of the main content column. It spans the content column only, visually extending to its edges, and must not occupy space in the sidebar column.
- On desktop, the strip is sticky at the bottom edge of the top header (68 px target, aligned to the actual rendered header height). On mobile, it follows the wrapped header in normal document flow; do not guess a fixed sticky offset for a variable-height header.
- Keep the strip touching the header visually, with no extra vertical gap. The strip may add spacing below itself before page content, but must not add height to or change the sidebar.
- Avoid horizontal overflow of the document itself; only the chip list should scroll horizontally.

## Accessibility

- Section has the accessible name “Browse sports.”
- Arrow controls have clear labels.
- Each sport link has a meaningful accessible name and keyboard focus ring.
- Active links expose `aria-current="page"`.
- Sport illustrations are decorative inside links because the link label conveys the sport.
- Do not rely on color alone to communicate the selected state; preserve text and route semantics.

## Data integrity

- Do not fabricate sport counts, live scores, trials, venues, or availability in this strip.
- Keep the icon manifest aligned with `public/assets/sports/sport-icons.svg`.
- A listed taxonomy item may have no published catalogue records; the destination must show the existing loading/empty/unavailable state rather than fake records.
- In-place sport filtering of opportunities and venues is out of scope until the data model has an explicit sport relation and the query safely selects it.

## Verification checklist

- [ ] All Sports navigates to `/sports` from catalogue context.
- [ ] Sport chip navigates to the matching `/sports/:slug` route from home/sports.
- [ ] Other routes use catalogue search with the selected sport query.
- [ ] Active state matches the current sport route.
- [ ] Left/right controls scroll the strip.
- [ ] Touch/trackpad scrolling works on mobile/tablet.
- [ ] Sports strip is inside the main content column and does not push the sidebar down.
- [ ] Strip touches the header with no gap; desktop target height is 48 px and mobile target height is 42 px.
- [ ] No document-level horizontal overflow.
- [ ] Sticky position is checked with the actual wrapped mobile header.
- [ ] Keyboard focus and reduced-motion behavior work.
- [ ] Typecheck, lint, tests, build, and Vercel preview are checked before merge.

**Maintenance rule:** If the data model later supports sport-linked opportunities and venues, replace the search fallback with real route-level filtering and update this document and tests in the same PR.
