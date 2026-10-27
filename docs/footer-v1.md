# KhelGrid Footer — V1.1 Product and Engineering Specification

**Implementation:** `src/App.tsx`, `src/styles.css`  
**Reference:** User-provided screenshot of the live KhelGrid homepage, captured 25 October 2026.  
**Scope:** Global site footer on desktop, tablet, mobile, and narrow phones.

## Design direction

Follow the live site's richer footer hierarchy rather than a minimal footer: brand and Go Pro area, multiple navigation columns, quick-access catalogue chips, careful-use guidance, and a separate legal/status row. Preserve KhelGrid's light background, navy text, green accents, rounded controls, and restrained borders.

## Content and structure

1. **Brand column:** KhelGrid logo, positioning statement, current-grid region line, and Go Pro action (₹499/month).
2. **Explore:** All sports, Trials & opportunities, Sports venues, Search catalogue, Sports calendar.
3. **Play & train:** Find a game, Book venues, Coaches, Academies, Sports CV Wizard labelled Coming soon.
4. **Learn:** Sports guides, Sports & learning hub, KhelChronicle, Live scores.
5. **Grow with KhelGrid:** List your venue, Submit a trial, Contact KhelGrid, About KhelGrid, and careful-use guidance.
6. **Product showcase and IPR:** Six compact product tiles (Sports CV, Talent Scanner, Find Trials, AI Sports Guide, Book Venues, Play & Match), followed by an IPR/AI/copyright notice and the published IPR contact address. Do not claim exclusive ownership of autonomous AI output or provide legal guarantees.
7. **Sports network index:** A compact set of working route links for sports, opportunities, venues, calendar, games and search.
8. **Quick access chips:** Sports trials, Sports venues, Find a game, Sports calendar, Live scores, Search KhelGrid.
9. **Careful-use note:** Listings and availability depend on source-published information; users should confirm with organisers.
10. **Legal/status row:** Preserve the existing development/live-feed/account-services disclaimer, plus IPR, AI use, copyright notice, and © KhelGrid labels.

## Route and truthfulness rules

- The product showcase follows the live homepage hierarchy, but items without confirmed working routes are informational, non-clickable tiles. This avoids dead links while preserving the product names shown on the live reference.
- The IPR/AI text is a general site notice, not legal advice. Do not state that all AI output is protected or that scraping is prohibited in all circumstances; refer legal enquiries to `ipr@khelgrid.com`.

- Before merge, confirm each internal destination remains a real route. If a route is unavailable, render it as non-clickable “Coming soon” text rather than introducing a dead link.
- Organizer submission/contact links use `khelgrid@gmail.com` with descriptive subjects.
- Go Pro pricing is displayed as ₹499/month based on current KhelGrid product copy; verify the destination and offer before release.
- Do not invent social URLs, app-store URLs, inventory totals, ratings, venue counts, or legal-page URLs.
- IPR, AI-use, and copyright labels remain plain text until their dedicated reviewed pages/routes exist.
- Preserve the existing disclaimer until live feeds and account services are implemented and tested. Do not imply all listings are independently verified.

## Responsive layout

| Viewport | Behavior |
|---|---|
| Wide desktop | Five columns: brand plus four link/support columns. Quick chips in one row of six. |
| Tablet (≤1100 px) | Three-column link grid; brand spans the row; quick chips form two rows of three. |
| Mobile (≤700 px) | Two-column link grid; brand spans full width; quick chips in two columns; legal row stacks. |
| Narrow phone (≤380 px) | Single-column footer and quick chips. |
| Mobile with bottom navigation | Bottom padding respects the fixed bottom navigation and safe-area inset. |

## Accessibility and behavior

- Semantic `footer`, labelled `nav` groups, descriptive headings, and standard anchors.
- Visible keyboard focus; no hover-only functionality.
- Decorative chip symbols are hidden from assistive technology; text provides accessible names.
- Footer stays in normal document flow and must not overlap sidebar, top navigation, sports strip, or mobile bottom navigation.
- Internal navigation must preserve browser modifier-click behavior via the shared handler.

## Verification checklist

- [ ] Previously existing footer content and disclaimer remain present.
- [ ] Brand, four link groups, six quick-access chips, careful-use note, and legal/status row render.
- [ ] All internal routes confirmed; unavailable routes are not linked.
- [ ] Contact links use the correct email and subject.
- [ ] Go Pro destination and price are current.
- [ ] Desktop, 1100 px, 700 px, 380 px, and 320 px checked.
- [ ] Footer does not overlap sidebar or fixed mobile navigation.
- [ ] Keyboard focus and contrast checked.
- [ ] Typecheck, lint, tests, build, and Vercel preview pass before merge.

**Maintenance rule:** Update this document and the footer together when routes, pricing, legal pages, or the live-site hierarchy changes.
