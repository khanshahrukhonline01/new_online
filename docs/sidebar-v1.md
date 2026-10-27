# KhelGrid Sidebar — V1 Reference

**Status:** Design and behavior reference for the KhelGrid Platform frontend foundation.  
**Scope:** Sidebar and mobile navigation drawer. This records the intended V1 baseline; it does not promise that every destination is implemented.

## 1. Purpose

The sidebar provides navigation between KhelGrid areas while the top navigation remains responsible for the KhelGrid brand, global search, and prominent header actions. The sidebar should be compact, legible, accessible, and visually quiet.

## 2. Visual design

- Preserve the current KhelGrid light surface with navy text and green active-state accents.
- Do not duplicate the KhelGrid logo or global search inside the desktop sidebar; both are already in the top navigation.
- On desktop, support an expanded sidebar and a compact icon rail. The collapsed rail is approximately **68 px** wide in the current CSS baseline.
- Keep navigation icons consistently sized and aligned. Use restrained hover feedback and a clear green active indicator.
- Keep section headings smaller and quieter than navigation labels.
- Keep help/feedback visually anchored at the bottom where layout space allows.
- Do not introduce a new theme, new navigation features, or new destinations as part of a scrollbar-only styling change.

## 3. Scroll behavior

- The navigation list scrolls independently of the main page content.
- The scrollbar must not dominate the narrow icon rail or compete with the active navigation state.
- Use a slim scrollbar approximately **5 px** wide in WebKit-based browsers and `scrollbar-width: thin` where supported.
- Use a light neutral thumb on a transparent track; darken the thumb on hover.
- Preserve keyboard, touch, wheel, and trackpad scrolling.
- Apply the treatment to desktop sidebar navigation and mobile drawer navigation, not to the page's main scrollbar.
- Browser and operating-system scrollbar rendering varies. The CSS requests a thin scrollbar where supported; it cannot force identical rendering in every environment.

## 4. Navigation and behavior

- Navigation items and section groupings are sourced from the shared navigation registry.
- Sections can expand and collapse. Unavailable destinations are presented as disabled/coming soon rather than treated as functional pages.
- Active routes receive an active visual state.
- Desktop collapsed mode keeps icon navigation usable with accessible labels/tooltips.
- The mobile menu is a drawer with a backdrop, close control, Escape-key dismissal, and focus handling. The mobile quick-navigation bar remains separate.
- Do not add duplicate logo or search entries to the sidebar.
- Header actions such as venue listing, trial submission, notifications, settings, login status, and Go Pro remain in the header rather than being copied into the sidebar.

## 5. Accessibility and responsive requirements

- Keep visible keyboard focus indicators.
- Preserve accessible names for icon-only links and controls.
- Do not hide navigation content from keyboard users solely to achieve a visual effect.
- Respect reduced-motion preferences for transitions.
- Keep mobile drawer and bottom navigation behavior intact.
- Verify expanded and collapsed states at desktop widths and the drawer at mobile widths.

## 6. Change boundaries for V1

Allowed within the V1 appearance baseline:
- Scrollbar width, thumb, track, and hover styling.
- Small spacing/alignment refinements that do not alter navigation behavior.
- Visual consistency for hover, active, focus, and disabled states.

Out of scope without a separate decision:
- Adding or removing navigation destinations.
- Changing route URLs or availability.
- Changing top navigation content.
- Replacing the current visual theme.
- Reworking authentication, data access, or booking/live-score behavior.

## 7. Verification checklist

- [ ] Sidebar scrolls independently from page content.
- [ ] Scrollbar is visually slim and does not cover or crowd icons.
- [ ] Scrollbar thumb remains discoverable and usable.
- [ ] Wheel, touch, keyboard, and trackpad scrolling still work.
- [ ] Active and disabled navigation styles remain unchanged.
- [ ] Collapsed desktop rail remains usable.
- [ ] Mobile drawer scrolling remains usable.
- [ ] Main page scrollbar is unchanged.
- [ ] Run typecheck, lint, tests, and production build before merge.
- [ ] Review the Vercel preview before approving the PR.

## 8. Implementation location

- Component: src/shared/components/Sidebar.tsx
- Styling: src/styles.css (rules scoped to .foundation-v1)
- Shared destinations: src/shared/navigation/navigationRegistry.ts
- This reference: docs/sidebar-v1.md

This document is the V1 reference point for future sidebar appearance changes. Update it when a later version intentionally changes these standards.
