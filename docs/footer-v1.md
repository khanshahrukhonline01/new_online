# KhelGrid Footer — V1 Product and Engineering Specification

**Implementation:** `src/App.tsx`, `src/styles.css`  
**Scope:** Global site footer on desktop, tablet, and mobile.

## Purpose and ownership

The footer provides brand context, links to currently implemented public catalogue pages, organizer contact routes, careful-use guidance, and a compact legal/status line. It is a shared site-shell component and must not alter sidebar navigation, top navigation, or page-specific state.

## Content structure

1. **Brand column:** KhelGrid logo, positioning statement, and “India · 16 cities in the current grid.”
2. **Explore:** Explore sports, Trials & opportunities, Book venues, Search catalogue. These links point only to routes currently implemented in the platform.
3. **For the sports community:** Sports CV Wizard marked “Coming soon”; email links for venue listing, trial submission, and general contact.
4. **Use information carefully:** Remind users to check organiser source, dates, eligibility, fees, and venue. Do not claim listings are independently verified unless that process exists.
5. **Legal/status row:** Honest development status (live feeds and account services are not connected yet; not a booking or live-score service), plus IPR, AI use, copyright notice, and copyright ownership labels.

The IPR/AI/copyright labels are plain text in V1 because dedicated policy routes have not been confirmed as implemented. Do not turn them into dead links or imply legal pages exist until those pages are created and reviewed.

## Visual system

- White/light neutral background, subtle top border and divider, navy headings, muted blue-grey body text, KhelGrid green hover/focus accents.
- Compact logo with preserved aspect ratio; clear positioning statement below.
- Four columns on wide desktop: brand, explore, community, careful-use guidance.
- Two-column grid on tablet; on narrow mobile the brand and guidance span the full width, with link columns beside one another.
- Small but readable text, generous row gaps, no oversized promotional panels, and no heavy shadows.
- The footer participates in normal document flow and never overlays page content.

## Responsive behavior

| Viewport | Layout |
|---|---|
| Wide desktop | Four-column grid; legal row split between status and legal labels. |
| Tablet (≤1000 px) | Two-column grid. |
| Mobile (≤600 px) | Two columns for link groups; brand and guidance span full width; legal row stacks vertically. |
| Very narrow phone (≤360 px) | Single-column layout. |
| Mobile with bottom navigation | Additional bottom padding respects the floating bottom nav and safe-area inset. |

## Interaction and accessibility

- Use semantic `footer`, `nav`, headings, and ordinary links.
- Footer links to internal routes must use the app navigation handler and preserve browser modifier-click behavior.
- Email links use the official contact address `khelgrid@gmail.com` and clear subjects.
- “Sports CV Wizard” remains non-clickable and visibly marked Coming soon until its route is available.
- Keyboard focus must be visible; hover must not be the only interaction cue.
- Maintain meaningful contrast and avoid tiny low-contrast legal text.
- Avoid duplicate logo/search/header actions in the footer.

## Truthfulness and content governance

- Do not invent social links, app-store links, legal policy URLs, venue inventory, user counts, or service capabilities.
- “16 cities in the current grid” is approved footer wording, but should be revisited if the current catalogue coverage changes.
- Keep the current limitation notice until live feeds, authentication, booking, and related account services are actually implemented and tested.
- The footer must not imply the platform verifies every listing. Users should be directed to check organiser/source details.
- Update the footer and this document together when route availability or legal policies change.

## Verification checklist

- [ ] Footer renders after page content on every implemented route.
- [ ] No footer overlap with the sidebar, sticky header, or mobile bottom navigation.
- [ ] All internal links lead to implemented routes.
- [ ] Email links open the expected mail recipient and subject.
- [ ] “Coming soon” items are not clickable.
- [ ] Desktop, tablet, 600 px, 360 px, and 320 px layouts checked.
- [ ] Keyboard focus and contrast reviewed.
- [ ] Existing status/disclaimer tests pass.
- [ ] Typecheck, lint, tests, build, and Vercel preview verified before merge.

**Maintenance rule:** This file is the V1 reference for future footer work. Keep content truthful, links live, and the shared shell responsive.
