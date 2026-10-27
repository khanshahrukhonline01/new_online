# KhelGrid Sidebar — V1 Product and Engineering Specification

**Document version:** V1  
**Applies to:** KhelGrid Platform frontend foundation  
**Implementation references:** `src/shared/components/Sidebar.tsx`, `src/shared/navigation/navigationRegistry.ts`, `src/styles.css`  
**Purpose:** Preserve the intended appearance, responsive layout, navigation behavior, accessibility, and maintenance rules for future work.

> **Status note:** This is the maintenance specification. It describes the current implementation where directly confirmed in code and records requirements/checks where browser testing is still needed. It is not evidence that every device/browser has already been tested. Update the verification checklist with real results before marking a release complete.

## 1. Design intent and ownership

The sidebar is a secondary navigation surface for moving between KhelGrid areas. The top navigation owns the KhelGrid brand, global search, and primary header actions. Do not add a duplicate logo or global search to the desktop sidebar unless a future product decision explicitly changes that rule.

The sidebar should be compact, calm, legible, accessible, and consistent with KhelGrid's existing visual language. V1 is a refinement of the existing design, not a new navigation product.

### Visual principles

- Use the existing light sidebar surface, navy text, muted blue-grey secondary text, pale dividers, and KhelGrid green active state.
- Keep icon dimensions, baseline alignment, row heights, and horizontal padding consistent.
- Active navigation should be obvious without using a large filled block; the current foundation uses a pale green background and a green inset edge.
- Hover states should be subtle and must not look like the active state when a route is not active.
- Disabled/future destinations must be visually muted and must not appear to be actionable links.
- Keep the help/feedback destination anchored at the bottom where the available height permits.
- Avoid visual noise: no oversized scrollbar, unnecessary borders, duplicate search/brand, or new decorative panels without a separate design decision.

## 2. Layout anatomy

### Desktop sidebar

The desktop sidebar is a vertical flex layout with three functional zones:

1. **Navigation list** — grouped links; this is the independently scrollable region.
2. **Optional Sports CV promo** — shown in expanded desktop mode by the current component.
3. **Bottom utility area** — Help & feedback and a small KhelGrid note when expanded.

The sidebar sits alongside the page content. The page content should retain its own independent document scrolling. The sidebar's navigation region, rather than the entire page, should scroll when navigation content exceeds the available height.

### Collapsed icon rail

- The collapsed rail shows icons without full link labels or section headings.
- Current CSS baseline sets the collapsed width to approximately **68 px** in the `.foundation-v1` styles; earlier base styles use a different rail width. Keep the active CSS cascade in mind when adjusting dimensions.
- Icons remain centered and links retain useful hit areas.
- Available links expose an accessible name and a title tooltip based on their label.
- Disabled items use a title that explains they are coming soon.
- The Sports CV promo and explanatory notes are hidden while collapsed.
- Do not assume hover expansion is a required behavior unless it is deliberately implemented and tested; do not rely on hover-only access on touch devices.

### Mobile drawer

On small screens, the desktop sidebar is hidden and navigation is presented in a slide-in drawer:

- Drawer is fixed to the left edge and sized to the smaller of 330 px or viewport width minus 42 px in the base CSS.
- A dimmed backdrop sits behind the drawer. Tapping it closes the drawer.
- A close button is available in the drawer header.
- Drawer content scrolls independently.
- A five-item fixed bottom quick-navigation bar remains separate from the drawer.
- The drawer uses the same navigation modules as desktop; it is not a separate destination registry.
- Safe-area padding is applied for devices with display cutouts/home indicators where supported.
- Keep the page content and mobile bottom bar usable when the drawer is open; avoid accidental horizontal overflow.

## 3. Responsive behavior

The current CSS has rules from the base sidebar styles and later `.foundation-v1` overrides. Breakpoint values therefore need careful review whenever responsive CSS changes.

| Viewport class | Current intended behavior | Required validation |
|---|---|---|
| Wide desktop (above 1000 px) | Expanded sidebar is available; collapse control may be used to switch to icon rail. Main content sits beside it. | Check long labels, full navigation, independent scroll, and page content width. |
| Tablet / compact desktop (roughly 761–1000 px) | CSS forces a narrow icon rail in this range; labels and section headings are hidden by responsive rules. | Check icon-only clarity, title/accessibility labels, hit targets, and no content overlap. |
| Small tablet / large mobile (around 701–760 px) | Breakpoint rules overlap: base styles and `.foundation-v1` styles use different thresholds. Verify actual computed behavior rather than assuming a single breakpoint. | Explicitly test 701, 720, 760, and 761 px widths. |
| Mobile (700 px and below in base sidebar rules) | Desktop sidebar is hidden; menu button opens the drawer; fixed bottom navigation is visible. | Test narrow widths, landscape, drawer scrolling, backdrop, safe areas, and on-screen keyboard interactions. |
| Very narrow phones | Drawer width is constrained by viewport width; bottom quick links share available width. | Check labels, clipping, focus, and horizontal overflow at 320–375 px. |
| Large desktop / zoomed UI | Sidebar should not stretch arbitrarily; page content should remain readable. | Check 125%, 150%, and 200% zoom and high-DPI scaling. |

**Breakpoint maintenance rule:** do not change only one of the duplicate/overlapping media-query blocks and assume all devices are covered. Review the full cascade in `src/styles.css`; ideally consolidate breakpoints in a future dedicated responsive-cleanup task.

## 4. Navigation source and destination behavior

### Single source of truth

- `navigationModules` in `src/shared/navigation/navigationRegistry.ts` defines section IDs, labels, items, hrefs, icons, and availability.
- Desktop sidebar and mobile drawer render the same grouped modules.
- Mobile bottom quick navigation is separately defined inside `Sidebar.tsx`; changes to those five items must be intentional and tested.
- Header actions are separate from feature navigation and should not be copied into the sidebar.

### Current groups

The registry currently groups destinations into:

- **Your Space**
- **Play & Match Center**
- **Scouting & Athlete Pipeline**
- **Knowledge & Community**
- **Network & Ecosystem**

The registry is the authority for exact labels and route destinations. This document deliberately does not duplicate every route so the document does not silently become stale when labels change.

### Available, disabled, and active states

- Items with `available: true` render as links and use the application's navigation handler.
- Items without availability render as non-link disabled text with a “Soon” label in expanded mode.
- Disabled destinations must not navigate or be announced as ordinary links.
- Active route matching is handled by `isActive()` in `Sidebar.tsx`. It includes special route families for opportunities/trials and venues/bookings; preserve and test these aliases when changing routing.
- Active links set `aria-current="page"`.
- Do not mark a route available until the destination actually exists and has a working user-facing state.

### Expandable groups

- Section state is maintained in the sidebar component.
- V1 defaults: **Your Space** and **Play & Match Center** open; **Scouting & Athlete Pipeline**, **Knowledge & Community**, and **Network & Ecosystem** closed.
- Group buttons expose `aria-expanded` and `aria-controls`.
- Keep group controls keyboard-operable and preserve clear focus states.
- Do not remove items or rename routes as part of visual-only changes.

### Mobile quick navigation

The current mobile bottom bar has Home, Sports, Trials, Venues, and Search. It is a quick-access strip, not a full copy of the sidebar. The global search also exists in the top navigation on larger layouts; mobile header behavior is separately responsive. Do not add duplicate quick-navigation items without a product decision.

## 5. Scrolling and scrollbar standard

### Scroll container

- `.sidebar-navigation` is the scrollable region inside the desktop sidebar and mobile drawer.
- Scrolling navigation must not scroll the page behind it as a side effect of normal navigation-list scrolling.
- Keep the navigation region flexible and min-height-safe inside the flex column, so the promo and bottom utility area remain visible when possible.
- Use `overscroll-behavior: contain` to reduce scroll chaining where supported.
- Preserve wheel, trackpad, touch, and keyboard scrolling.

### V1 scrollbar appearance

- Target a scrollbar around **5 px** wide in WebKit-based browsers.
- Use `scrollbar-width: thin` and a light neutral thumb where supported.
- Track is transparent; thumb is rounded and slightly darker on hover.
- The scrollbar styling applies only to sidebar/drawer navigation, not the page's main scrollbar.
- Native scrollbar appearance varies with browser, operating system, overlay-scrollbar settings, and input device. CSS cannot guarantee the same visible thickness on every system. Some systems show a scrollbar only while scrolling.
- Do not set `overflow: hidden` to make the scrollbar disappear; navigation must remain discoverable and scrollable.

## 6. Appearance tokens and measurements

These are approximate V1 targets based on the current CSS, not a promise that all declarations use one centralized token yet.

| Element | V1 target |
|---|---|
| Expanded desktop sidebar | Approximately 258 px in base styles; verify the effective width after foundation overrides. |
| Collapsed rail | Approximately 68 px in foundation styles. |
| Desktop top offset | Align immediately below the site header; foundation sidebar uses 70 px. |
| Navigation row | About 40 px minimum height in foundation styles; preserve a comfortable hit target. |
| Icon | Consistent 18 px rendered size in the current component. |
| Row radius | About 8 px in foundation styles. |
| Active state | Pale green background, dark green text, inset green left edge. |
| Dividers | Very light neutral grey. |
| Scrollbar | About 5 px where the browser supports the WebKit width rule. |
| Mobile drawer | Up to 330 px wide, constrained by viewport. |
| Mobile quick-nav | Five equal columns, fixed near bottom, safe-area aware. |

When changing dimensions, test the full page layout, not only the sidebar in isolation. Sidebar width affects the available content width and can expose wrapping/overflow in the page header and main content.

## 7. Interaction and state requirements

- Collapse/expand state must remain operable using the existing menu/collapse control supplied by the app shell.
- Group toggles open/close only their group and expose current state accessibly.
- Clicking an available link uses the application's navigation callback; do not bypass routing behavior during a CSS task.
- Opening the mobile drawer moves focus to the close control.
- Escape closes the drawer and returns focus to the menu toggle.
- The backdrop closes the drawer and returns focus to the menu toggle.
- Drawer tab handling traps focus within the drawer while it is open.
- Closing the drawer must restore normal pointer interaction with the page.
- The promo link and Help & feedback mail link should remain reachable when shown.
- Ensure disabled items cannot accidentally trigger navigation.
- Avoid adding hover-only controls or actions that cannot be reached on touch/keyboard.

## 8. Accessibility requirements

- Use semantic navigation landmarks and meaningful accessible labels.
- Icon-only links in collapsed mode must have accessible names; tooltips are supplemental, not the only accessible name.
- Use `aria-current="page"` for the active route and `aria-expanded` / `aria-controls` for group toggles.
- Preserve a clearly visible focus ring for keyboard users.
- Keep text and icons legible against their backgrounds; verify contrast for muted and disabled states.
- Disabled items should not be included as normal keyboard navigation links.
- Drawer should have a dialog role, modal state while open, and an accessible name.
- Respect `prefers-reduced-motion`; drawer and collapse transitions should not cause excessive movement.
- Ensure touch targets are comfortably sized, especially on mobile.
- Test with keyboard only and at 200% zoom; use a screen reader for a smoke test where possible.

## 9. Device and browser support expectations

The target is responsive behavior across current desktop and mobile browsers, not pixel-identical scrollbar rendering.

At minimum, validate:
- Windows desktop Chrome and Edge.
- macOS Safari and Chrome if available.
- Android Chrome.
- iOS Safari.
- Tablet portrait and landscape.
- Trackpad and mouse-wheel scrolling where available.
- Keyboard-only navigation.
- Browser zoom and OS text scaling.

If a device/browser is not available for testing, record it as **not tested** rather than assuming success. Verify scrollbar rendering separately from scroll functionality.

## 10. Performance and stability

- Keep the navigation list CSS-only for scrolling; do not add polling, timers, or scroll listeners without a demonstrated need.
- Avoid layout shifts when the scrollbar appears/disappears; use stable gutter behavior only where supported and visually appropriate.
- Keep transitions short and restrained.
- Do not add new dependencies solely for scrollbar styling.
- Preserve the shared registry; do not duplicate the entire navigation configuration for mobile.
- Avoid broad selectors that alter the main page scrollbar or unrelated scroll containers.

## 11. Change boundaries

### Allowed for a visual maintenance change

- Scrollbar width, thumb, track, and hover appearance.
- Small spacing/alignment refinements that do not change destination or interaction semantics.
- Visual consistency for hover, active, focus, disabled, and expanded/collapsed states.
- Responsive CSS adjustments that preserve the documented behavior and are tested at boundary widths.

### Requires separate review

- Adding/removing/reordering destinations or groups.
- Changing route paths or availability.
- Changing the five mobile quick-nav destinations.
- Changing header content or moving global search/brand into the sidebar.
- Replacing the KhelGrid theme.
- Changing authentication, booking, live-score, data-source, or backend behavior.
- Changing mobile drawer interaction/focus behavior.

## 12. Testing and release checklist

Record results in the PR or release notes; do not mark unchecked items as passed without evidence.

### Visual and responsive
- [ ] Wide desktop: expanded sidebar, labels, active route, promo, and bottom utility.
- [ ] Wide desktop: collapsed rail, centered icons, accessible labels, and no clipped controls.
- [ ] Tablet: icon rail at each relevant breakpoint.
- [ ] Breakpoint boundaries: 700, 701, 760, 761, 1000, and 1001 px.
- [ ] Mobile portrait at 320, 360, 375, and 430 px.
- [ ] Mobile landscape and tablet portrait/landscape.
- [ ] 125%, 150%, and 200% browser zoom.
- [ ] No horizontal overflow or obscured page content.

### Scrolling
- [ ] Sidebar navigation scrolls independently of page content.
- [ ] Scrollbar is visually slim and does not crowd the icon rail.
- [ ] Thumb remains usable and discoverable.
- [ ] Wheel, trackpad, touch, and keyboard scrolling work.
- [ ] Drawer content scrolls while open.
- [ ] Main page scrollbar is unchanged.
- [ ] Scroll chaining does not unexpectedly move the background page.

### Interaction and accessibility
- [ ] Every available link navigates to the expected destination.
- [ ] Disabled items are not clickable links and show their unavailable state.
- [ ] Active route aliases remain correct.
- [ ] Expand/collapse buttons expose the right ARIA state.
- [ ] Open drawer moves focus to close control.
- [ ] Escape/backdrop/close button close the drawer and restore focus.
- [ ] Tab and Shift+Tab remain within the open drawer.
- [ ] Keyboard focus is visible.
- [ ] Reduced-motion preference is respected.
- [ ] Mobile bottom quick-nav remains usable and has no overlap with page content.

### Engineering and release
- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Run unit and component tests.
- [ ] Run production build.
- [ ] Review the actual Vercel preview at desktop, tablet, and mobile widths.
- [ ] Confirm production is not changed until the PR is approved and merged.

## 13. Known implementation notes to preserve

- Base sidebar CSS and `.foundation-v1` overrides coexist; check computed styles and the cascade before changing widths or breakpoints.
- The base sidebar styles and foundation overrides have different responsive thresholds. The 701–760 px interval is a particular risk area and must be browser-tested.
- The component includes a Sports CV promo link to `/sports-cv`; confirm that route is available before treating the promo as a guaranteed working destination.
- The registry's availability flags and the app's actual routes can change independently. Tests should prevent an unavailable/future route from being accidentally presented as functional.
- Native scrollbar styling differs across operating systems and browser settings.

## 14. Source files

- Sidebar component: `src/shared/components/Sidebar.tsx`
- Shared navigation registry: `src/shared/navigation/navigationRegistry.ts`
- Styles and responsive overrides: `src/styles.css`
- V1 reference: `docs/sidebar-v1.md`

**Maintenance rule:** This file is the V1 reference for future sidebar work. Update it when a later version intentionally changes layout, responsive breakpoints, interaction behavior, accessibility, or design tokens. If code and this document disagree, do not assume either is correct—inspect the implementation, decide the intended behavior, update the code and document together, and record the verification result.
