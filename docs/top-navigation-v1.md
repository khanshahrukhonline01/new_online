# KhelGrid Top Navigation Bar — V1 Product and Engineering Specification

**Document version:** V1  
**Applies to:** KhelGrid Platform frontend foundation  
**Implementation references:** `src/App.tsx`, `src/styles.css`, `src/shared/components/SiteIcon.tsx`, `src/shared/routing`  
**Purpose:** Preserve the top navigation bar's visual design, responsive layout, interactions, accessibility, and maintenance requirements across devices.

> **Status note:** This is the V1 reference specification, not proof of cross-device testing. The component markup and current CSS are inspected, but final behavior depends on CSS cascade, browser rendering, and live testing. Record untested devices as “not tested.” Update this document when an intentional design or behavior change is made.

## 1. Purpose and ownership

The top navigation bar is the global entry point for KhelGrid. It owns the brand, catalogue-wide search, primary submission actions, and account/utility actions. The sidebar owns feature navigation between sections.

### Ownership rules

- The KhelGrid logo/wordmark belongs in the top navigation; do not duplicate it in the desktop sidebar.
- Global catalogue search belongs in the top navigation. Do not add a second desktop sidebar search.
- “List your venue” and “Submit a trial” are prominent submission actions and remain in the header on layouts where space permits.
- Notifications, Settings help, Login status, and Go Pro are header utility actions; do not copy them into the feature sidebar.
- The header menu button controls the desktop sidebar collapse state or opens the mobile drawer, depending on viewport.
- Header actions must not imply services are operational if they are currently disabled, coming soon, or only linked to an enquiry email.

## 2. V1 visual direction

Preserve the existing KhelGrid light header, navy text, green primary actions, muted blue-grey icons, subtle borders, and restrained rounded shapes.

- Keep the header visually separate from page content with a thin bottom border.
- Keep the header sticky at the top during page scrolling.
- Align all controls vertically around the same center line.
- Maintain consistent icon sizes and comfortable click/tap areas.
- Use a clear green filled style for the primary “List your venue” action and “Go Pro”; use a quieter outlined treatment for “Submit a trial.”
- Search is a wide, low-contrast input with rounded corners, a leading search icon, and a trailing submit control.
- Hover, focus, disabled, and active states must be visually distinct.
- Avoid excessive shadows, extra dividers, duplicate brand/search, or a second competing primary CTA.
- Do not change the KhelGrid navy/green theme as part of unrelated functionality work.

## 3. Desktop layout anatomy

The header currently contains these elements in order:

1. **Main menu toggle** — collapses/expands the desktop sidebar.
2. **KhelGrid brand** — logo and wordmark, links to the home page.
3. **Global search form** — searches sports, trials, venues, athletes, and the catalogue.
4. **Primary header actions** — “List your venue” and “Submit a trial.”
5. **Notifications** — currently disabled and labeled “coming soon.”
6. **Settings help** — currently links to a KhelGrid settings-help email.
7. **Login** — labeled “Coming Soon”; it must not be presented as working account authentication.
8. **Go Pro** — currently links to a Pro enquiry email, not a checkout flow.

The exact rendered availability of items varies by responsive breakpoint. Preserve their semantic order and importance when adjusting the layout.

### Sizing and alignment

- The current foundation CSS uses a sticky header with a nominal minimum height around **68 px** on desktop.
- Desktop horizontal padding is fluid with a maximum-content-width formula, with additional overrides at smaller widths.
- Use flex layout and allow the search field to absorb remaining horizontal space without pushing essential controls off-screen.
- Keep the brand, search, and action controls from shrinking below usable widths.
- Avoid horizontal page overflow at common desktop widths or browser zoom levels.

## 4. Brand and menu control

### Brand

- The brand link points to `/` and has the accessible name “KhelGrid home.”
- The image uses `/assets/kg-logo.webp`; its alternative text is empty because the surrounding link has the accessible name.
- The visible wordmark is “KHELGRID.”
- Keep the logo aspect ratio and use `object-fit: contain`.
- Do not make the brand depend on hover to reveal its meaning.

### Menu toggle

- The menu button has the accessible name “Toggle main navigation.”
- On desktop, it toggles the sidebar collapsed state.
- On mobile, it opens/closes the navigation drawer and reflects the close icon while the drawer is open.
- `aria-expanded` and `aria-controls` must reflect the state and target appropriate to the viewport.
- Preserve a visible keyboard focus indicator.
- The control should remain a clear, easy-to-hit target, including at narrow widths.

## 5. Global search behavior

- Use a semantic `form` with `role="search"`.
- The input accessible name is “Search KhelGrid catalogue.”
- Placeholder text communicates the search scope: sports, trials, venues, and athletes.
- Typing updates the controlled input; submitting trims surrounding whitespace.
- Submission navigates to `/search`; a non-empty query is URL-encoded in the `q` parameter.
- Empty submission opens the search page without a query.
- The trailing arrow button submits the form and must have a meaningful accessible name (“Submit search”).
- Search input must not lose its content unexpectedly during unrelated UI state changes. Back/forward navigation should restore the query from the URL.
- Keep a visible focus treatment on the form when its input or submit button receives focus.
- Use `min-width: 0` on the input/flex child so it can shrink without overflowing the header.
- Do not claim search results include data sources that are not actually connected.

## 6. Header actions and honest service status

### List your venue

- Primary green action with a plus icon.
- Current target is an email enquiry link to `khelgrid@gmail.com` with a venue-listing subject.
- Do not describe this as a completed online venue-submission workflow unless such a workflow is implemented.

### Submit a trial

- Secondary outlined action with a calendar/check icon.
- Current target is an email enquiry link to `khelgrid@gmail.com` with a trial/opportunity submission subject.
- Do not imply a submission form or automated review pipeline exists if the link only opens email.

### Notifications

- Currently disabled and labeled “Notifications coming soon.”
- Disabled state must be obvious to mouse, keyboard, and assistive-technology users.
- Do not remove the disabled state until a real notification feature is connected.

### Settings help

- Current link opens an email to KhelGrid support with a settings-help subject.
- Accessible name and title should describe it as settings help, not imply a functional preferences panel if none exists.

### Login

- Current header says “Login” with “Coming Soon” and links to the existing login URL.
- Do not present authentication as available until the route and auth flow are confirmed working.
- Preserve the “Coming Soon” status until product owners explicitly approve the real flow.

### Go Pro

- Green pill-style action with a star icon.
- Current target is a Pro enquiry email, not a payment/checkout flow.
- Do not imply the user has purchased or activated a membership by clicking it.

## 7. Responsive layout

The stylesheet contains base rules and several later `.foundation-v1` overrides. Multiple breakpoints exist, so the effective behavior must be checked in the computed style cascade rather than inferred from one media query.

| Viewport class | Intended V1 behavior | Validation required |
|---|---|---|
| Wide desktop (above ~1180 px) | Full header: menu, brand, wide search, submission actions, utilities, login, Go Pro. | Confirm all elements fit on one row and remain aligned. |
| Desktop / compact desktop (~1001–1180 px) | Compact header spacing and selected text/secondary labels may be reduced. | Confirm actions remain understandable and no controls overlap. |
| Tablet / narrow desktop (~761–1000 px) | Header action labels may become icons; search is narrower; sidebar becomes a compact icon rail. | Check icon-only labels, hit targets, and search usability. |
| Near breakpoint (~701–760 px) | Multiple CSS rules overlap; header may wrap, while some utility actions are hidden. | Explicitly test 701, 720, 740, 760, and 761 px. |
| Mobile (700 px and below) | Header wraps; menu and brand remain in first row; search moves to its own full-width row; submission and utility actions are hidden by current responsive rules. | Check order, spacing, search visibility, drawer toggle, and no horizontal overflow. |
| Very narrow phone (320–380 px) | Compact menu/brand row and full-width search; header may need multiple lines. | Check logo/wordmark, menu target, search submit button, and page overflow. |
| Landscape, zoom, text scaling | Header must remain usable and controls must not overlap content. | Test mobile landscape, 125/150/200% browser zoom, and enlarged text. |

**Breakpoint maintenance rule:** the current CSS has several media-query thresholds (including 700, 720, 760, 980, 1000, 1120, and 1180 px). Before changing responsive behavior, inspect all rules affecting `.site-header`, `.header-search-form`, `.header-actions`, `.header-icon-button`, `.header-login-link`, `.header-go-pro`, `.brand`, and `.menu-toggle`. Consolidate duplicate rules in a separate, tested cleanup rather than making a partial change.

## 8. Mobile layout rules

- Keep the menu toggle and KhelGrid brand visible in the top row.
- Place the global search form on its own row when the viewport is too narrow for a single-row layout.
- Search should span the available width, retain its leading icon and submit button, and not force horizontal scrolling.
- Header submission actions and secondary utility links may be hidden at the narrow breakpoint; do not silently remove their underlying destination or alter desktop behavior.
- The mobile bottom navigation and drawer are owned by the sidebar component; coordinate changes with `docs/sidebar-v1.md`.
- The menu toggle must open the mobile drawer rather than merely collapsing the desktop rail.
- Avoid fixed heights that clip wrapped header rows.
- Account for safe-area and browser chrome where relevant; test on real mobile browsers when possible.

## 9. Interaction, routing, and browser history

- Brand click navigates home through the app navigation handler.
- The menu toggle controls the sidebar/drawer based on the current viewport.
- Search submit updates browser history and app route state; preserve URL query encoding and back/forward support.
- Header action links use their documented targets. If a target changes, update this document and tests.
- Do not intercept modified clicks or non-primary clicks in a way that breaks standard browser link behavior.
- When navigating internally, reset page scroll as the application currently does.
- Preserve route handling and search query restoration when the user uses browser Back/Forward.
- Do not couple visual CSS changes to unrelated routing or backend logic.

## 10. Accessibility requirements

- Use a semantic `header`, brand link, search form, and labeled `nav` for actions.
- Ensure icon-only controls have accessible names; decorative icons should not duplicate screen-reader labels.
- Keep focus rings visible on menu, search submit, action links, utilities, login, and Go Pro.
- Maintain adequate text/background contrast for placeholder, secondary, disabled, and small “Coming Soon” labels.
- Disabled controls must use the correct disabled semantics and not activate on click or keyboard.
- Keep DOM order meaningful for keyboard navigation and screen readers.
- Ensure responsive hiding does not leave invisible controls focusable.
- Support keyboard-only use and 200% zoom without clipped content.
- Respect `prefers-reduced-motion` for transitions.
- Avoid hover-only meaning or controls; touch and keyboard users need equivalent access.
- Test the menu button's `aria-expanded` and `aria-controls` in both desktop and mobile states.

## 11. Performance and stability

- Keep the header sticky without causing content to be obscured by its height.
- Use lightweight CSS transitions; do not add new JavaScript listeners for styling-only changes unless necessary.
- Avoid layout shift as search/actions change at breakpoints.
- Keep the search input flexible and prevent long text from widening the page.
- Do not add a dependency solely to style the header.
- Preserve the single source of routing behavior in the app; don't duplicate search or navigation state in multiple components without a clear reason.

## 12. Change boundaries

### Allowed in a visual-only update

- Spacing, alignment, dimensions, border, shadow, radius, typography, and color refinements within the current KhelGrid theme.
- Responsive wrapping and sizing adjustments that preserve actions and are tested at breakpoint boundaries.
- Focus, hover, disabled, and reduced-motion styling improvements.
- Search field visual refinements that preserve submission behavior and URL semantics.

### Requires separate product/engineering review

- Adding/removing/reordering header actions.
- Changing destinations, email addresses, query parameters, or routing behavior.
- Enabling login, notifications, membership purchases, venue submission forms, or trial submission forms.
- Duplicating global search or brand in the sidebar.
- Changing the top navigation into a different theme or information architecture.
- Changing shared app state or browser history behavior.

## 13. Verification checklist

Record actual results in the PR or release notes. Do not mark untested items as passed.

### Visual and responsive
- [ ] Wide desktop full header at 1440 px and 1920 px.
- [ ] Desktop at 1180, 1120, 1000, 980, 900, 800, and 761 px.
- [ ] Breakpoint boundary at 701, 720, 740, 760, and 761 px.
- [ ] Mobile at 700, 430, 390, 375, 360, and 320 px.
- [ ] Mobile landscape and tablet portrait/landscape.
- [ ] Browser zoom at 125%, 150%, and 200%.
- [ ] No horizontal overflow, clipped controls, or obscured content.
- [ ] Sticky header remains aligned while scrolling.

### Functionality
- [ ] Menu toggle collapses/expands desktop sidebar.
- [ ] Menu toggle opens/closes mobile drawer.
- [ ] Brand link returns to home.
- [ ] Search trims input and submits the correct URL/query.
- [ ] Empty search submission behaves intentionally.
- [ ] Back/Forward restores path and search query.
- [ ] Venue and trial actions open the expected email target.
- [ ] Notifications remain disabled until implemented.
- [ ] Login and Go Pro labels accurately represent their current status.
- [ ] No hidden mobile controls remain keyboard-focusable.

### Accessibility and engineering
- [ ] Keyboard-only navigation and visible focus states.
- [ ] Screen-reader smoke test for menu, search, action links, and disabled notifications.
- [ ] Color contrast for placeholder, disabled, and small text.
- [ ] Reduced-motion preference.
- [ ] Run typecheck, lint, unit/component tests, and production build.
- [ ] Review actual Vercel preview on desktop, tablet, and mobile.
- [ ] Do not change production until the PR is approved and merged.

## 14. Known implementation notes

- The header markup is in `src/App.tsx`; most presentation is in `src/styles.css`.
- The CSS contains multiple layers of legacy/base styles and `.foundation-v1` overrides. The last matching declaration may determine actual appearance.
- The markup currently has a real search form, email-based venue/trial submission links, disabled notifications, email-based settings help, a “Coming Soon” login link, and a Pro enquiry link. These are not equivalent to full submission, authentication, notifications, preferences, or checkout systems.
- The current breakpoint behavior hides header actions/utilities at narrow widths and moves search to a separate row. Verify actual rendered order and visibility at the breakpoint boundaries.
- The brand image path is `/assets/kg-logo.webp`; if it changes, update the asset reference and test the logo at high-DPI and narrow widths.
- The sidebar's responsive behavior is documented separately in `docs/sidebar-v1.md`; update both documents if a change affects the boundary between header and sidebar.

## 15. Source files

- Header markup and state: `src/App.tsx`
- Header and responsive styles: `src/styles.css`
- Icon rendering: `src/shared/components/SiteIcon.tsx`
- Sidebar coordination: `src/shared/components/Sidebar.tsx`
- Sidebar V1 reference: `docs/sidebar-v1.md`

**Maintenance rule:** This file is the V1 reference for future top-navigation work. If code and documentation disagree, inspect the live implementation, decide the intended behavior, update code and documentation together, and record the verification result.
