# KhelGrid Top Navigation Bar — Reconciled Engineering & Product Specification (V2)

**Document version:** V2 (Reconciled & Authoritative)  
**Last updated:** November 2026  
**Status:** Reconciled with live codebase (`src/shared/components/TopNavbar.tsx`, `src/styles.css`)  
**Implementation references:**
- Primary Component: `src/shared/components/TopNavbar.tsx`
- Stylesheet & Breakpoints: `src/styles.css`
- Action Models & Nav Constants: `src/shared/components/topNavActions.ts`, `src/shared/navigation/navigationRegistry.ts`
- Utility & Modal Handlers: `src/shared/components/NavbarSettingsMenu.tsx`, `src/shared/components/NotificationCenterDrawer.tsx`, `src/shared/components/SpotlightSearchModal.tsx`
- Icons: `src/shared/components/SiteIcon.tsx`
- Routing & App Shell: `src/App.tsx`, `src/shared/routing.ts`

---

## 1. Executive Summary & Purpose

The **KhelGrid Top Navigation Bar** is the persistent global header across the KhelGrid platform. It defines brand identity, instant catalogue search, the core player journey, B2B/institutional workspace access, direct intake CTAs, and account/utility controls.

### Core Architecture Principles
1. **Strict Division of Responsibility (Header vs. Sidebar):**
   * **Top Navbar:** Owns global brand identity, spotlight search, core consumer action links (`Play`, `Athlete`), B2B workspaces (`Organizations`, `Campaigns`), primary submission CTAs (`+ List on KhelGrid`, `Submit Paper`), and personal utilities (Notifications, Settings/Appearance, Auth).
   * **Sidebar Navigation Drawer (`☰`):** Owns full directory navigation across all 7 platform modules and 30+ destinations. There is **no duplicate sitemap dump** inside the top header.
2. **Clear Intent Segmentation:**
   * **Center Rail:** Dedicated 100% to **Athletes, Players & Parents** (`Play`, `Athlete`).
   * **Right Cluster:** Dedicated to **Institutional, Creator & Commercial Actions** (`Organizations`, `Campaigns`, `+ List on KhelGrid`, `Submit Paper`).
3. **Canonical Intake Consolidation:**
   * **`+ List on KhelGrid`** (`/submit-listing`) is the unified entry point for venues, sports selection trials, academies, coaches, tournaments, and pickup games.
   * **`Submit Paper`** (`/khelchronicle/submit`) is the direct academic research manuscript submission link for KhelChronicle.
4. **Honest Service Presentation:**
   * Real, connected components (e.g. `NavbarSettingsMenu`, `NotificationCenterDrawer`, `SpotlightSearchModal`, Auth sessions) are fully wired. Features that are pending backend connections clearly disclose their status without misleading mock data.

---

## 2. Desktop Layout Anatomy (3-Zone Structure)

The top navigation bar is structured into three clean, flex/grid-aligned horizontal zones:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [☰] [KG LOGO]    │     [Play]   [Athlete]     │   [🔍]  Organizations  Campaigns  │  [+ List on KhelGrid]  [Submit Paper]  │  [🔔] [⚙️] [👤]  │
│  Zone 1: Brand   │    Zone 2: Core Player     │                   Zone 3: B2B, Intake & Utilities                      │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Zone 1: Identity & Drawer Control (Left)
1. **Menu Toggle (`.menu-toggle`):**
   * Accessible name: `aria-label="Toggle main navigation"`.
   * On desktop (`> 1040px`): Collapses or expands the permanent sidebar between full and compact icon-rail states.
   * On mobile/tablet (`≤ 1040px`): Opens and closes the modal navigation drawer.
   * Reflects real-time state with `aria-expanded` and `aria-controls="app-sidebar"`.
2. **KhelGrid Brand (`.brand`):**
   * Anchor pointing to `/` with accessible name `aria-label="KhelGrid home"`.
   * Displays the official brand emblem (`/assets/kg-logo.webp`, 32×32 px, `fetchPriority="high"`) and the `"KHELGRID"` wordmark.

### Zone 2: Core Player & Athlete Rail (Center)
Streamlined down to the two highest-intent, non-redundant consumer journeys:
1. **`Play` (`/play`, `.header-primary-link.header-play-pill`):**
   * Primary entry point for players: find local pickup games, book hourly turf slots, and explore community matches.
2. **`Athlete` (`/sports-cv`, `.header-primary-link`):**
   * Direct path to the Sports CV Builder, athletic combine ratings, and scouting profiles.

> **Design Decision Note — Removal of `Discover` and `Learn` from Top Navbar:**  
> In prior V1 drafts, `Discover` (`/sports`) and `Learn` (`/learning`) sat in the center rail. They were intentionally removed to eliminate clutter and redundancy:
> - *Discover* is already served by the Home feed (logo click), the Global Search bar, and the primary sidebar.
> - *Learn* is an educational reference manual that users do not access on every transactional visit; it remains accessible via the `☰` Sidebar under *Learn & Community* and in the site footer.

### Zone 3: B2B Workspaces, Direct Intake & Utilities (Right)
1. **Spotlight Search (`.header-search-trigger`):**
   * Accessible button invoking `SpotlightSearchModal` (`Ctrl + K` or `Cmd + K`).
   * Displays the magnifying glass icon and keyboard shortcut tooltip.
2. **Institutional & Partner Workspaces (`.header-partner-nav`):**
   * **`Organizations` (`/organizations`, `.header-partner-link`):** SaaS hub for academy owners, sports clubs, schools, and tournament organizers.
   * **`Campaigns` (`/campaigns`, `.header-partner-link`):** Creator campaign marketplace connecting sports influencers with athletic brands and sponsors.
3. **Partner Divider (`.header-divider-partner`):**
   * 1px vertical divider separating institutional workspaces from direct submission CTAs.
4. **Primary Direct Intake Actions:**
   * **`+ List on KhelGrid` (`/submit-listing`, `.header-submit-listing`):**
     * High-visibility solid green button (`background: var(--accent)`).
     * Single unified intake for sports selection trials (#1), venues/turfs (#2), academies (#3), coaches (#4), and events (#5).
   * **`Submit Paper` (`/khelchronicle/submit`, `.header-submit-paper`):**
     * Outlined accent action button with `file-text` icon.
     * Direct manuscript submission to KhelChronicle (Open Sports Science Research Repository).
     * Replaces the legacy `Submit a trial` button (since trials are already the primary category inside `+ List on KhelGrid`).
5. **Utility Divider (`.header-divider-utilities`):**
   * 1px vertical divider separating intake CTAs from user account controls.
6. **Utility Cluster (`.header-utility-cluster`):**
   * **Notifications (`.header-notif-trigger`):** Bell icon triggering the `NotificationCenterDrawer` component.
   * **Settings & Appearance (`NavbarSettingsMenu.tsx`):** Dropdown managing light/dark theme toggle, font size adjustments, 10 language locales, and support/feedback dialog.
7. **User / Auth Cluster:**
   * **Unauthenticated:** Shows Login trigger (`.header-login-link`) and optional Go Pro link (`.header-go-pro`).
   * **Authenticated:** `.header-user-btn` displaying the user's avatar image or initials, user role badge, and toggling the personal dashboard menu (`/workspace`, role dashboard, sign out).

> **Design Decision Note — Removal of the `+ More` Popover:**  
> The legacy `+ More` dropdown button and its 110-line popover DOM tree were removed. Having both `☰` (on the left) and `+ More` (on the right) opening identical lists of 30+ links was redundant and caused visual button clashing against `+ List on KhelGrid`. All directory links are canonically maintained in the primary sidebar.

---

## 3. Responsive Breakpoints & Sizing Behavior

The stylesheet (`src/styles.css`) defines fluid and stepped adaptations across standard screen sizes:

| Viewport Width | Visual State & Layout Behavior | Action Accommodations |
|---|---|---|
| **Ultra-Wide Desktop**<br/>(`≥ 1600 px`) | 3-column grid (`auto minmax(0, 1fr) auto`), maximum padding (32px), maximum gap (28px). | All controls fully visible with full labels, icons, and keyboard hints. |
| **Standard Desktop**<br/>(`1221 px – 1599 px`) | Fixed sticky 68px header height. Fluid padding (`clamp(14px, 2vw, 24px)`). | Full text and icons on `Play`, `Athlete`, `Organizations`, `Campaigns`, `+ List on KhelGrid`, `Submit Paper`. |
| **Compact Laptop**<br/>(`1041 px – 1220 px`) | Padding compressed to 14px, gaps reduced to 10px. `font-size: 11.5px` on direct actions. | All actions fit comfortably on a single row without horizontal overflow. |
| **Tablet / Small Laptop**<br/>(`761 px – 1040 px`) | Center rail hidden; `Organizations` & `Campaigns` collapse into `☰` drawer. | `.header-submit-direct span` hidden (`display: none`). `+ List on KhelGrid` and `Submit Paper` display as 38px icon buttons. |
| **Mobile Header**<br/>(`≤ 760 px`) | Compact 56px height. Center rail hidden. Right zone accommodates search, icons, and menu. | Full brand and hamburger menu remain pinned left. Search and compact intake buttons pinned right. |
| **Narrow Phone**<br/>(`≤ 480 px`) | Padding reduced to 10px. Brand wordmark slightly scaled. | Search, submit, and utility buttons maintain accessible 36px touch targets. |

---

## 4. Accessibility & Technical Compliance (WCAG 2.1 AA)

1. **Semantic Structure:**
   * Root `<header className="site-header">` with child `<nav>` containers carrying descriptive `aria-label` tags.
2. **Focus Management:**
   * High-contrast focus rings (`outline: 3px solid var(--accent); outline-offset: 2px;`) across all buttons and interactive anchors.
   * `pointerdown` and `Escape` keyboard handlers properly manage popovers and user account drawers with focus restoration.
3. **Touch Targets:**
   * All clickable elements maintain a minimum target size of 36×36 px (exceeding minimum mobile guidelines).
4. **Color Contrast & Dark Mode:**
   * Full CSS variable support (`var(--surface)`, `var(--text)`, `var(--line)`, `var(--accent)`).
   * Verified in both light mode and `html.dark` mode with text-to-background contrast ratio $\ge 4.5:1$.
5. **Reduced Motion:**
   * `@media (prefers-reduced-motion: reduce)` disables non-essential transform and transition animations across all header controls.

---

## 5. Verification & Testing Requirements

Any pull request modifying the top navigation bar must verify the following battery:

1. **Unit & Shell Tests:**
   * `npx vitest run src/App.test.tsx` (Validates header structure, direct submit targets, and presence of `header-partner-nav`).
   * `npx vitest run src/shared/components/topNavActions.test.ts` (Validates the 5 canonical submission definitions).
   * `npx tsx scripts/topNavActions.node.test.ts` (Ensures Node environment compatibility).
2. **TypeScript Compiler Typechecks:**
   * Main App: `npm run typecheck` (`tsc -b --pretty`).
   * Admin Desk: `npm run typecheck:admin` (`tsc --noEmit -p tsconfig.admin.json`).
3. **Lint & Production Builds:**
   * `npm run lint` (0 errors).
   * `npm run build` (Clean Vite client build, generates sitemap and RSS feeds).
   * `npm run build:admin` (Clean Vite admin build).
4. **Visual & Responsive Verification:**
   * Verify single-row non-wrapping integrity at 1920px, 1440px, 1280px, 1024px, 768px, and 375px.

---

## 6. Document Maintenance Rule

This file is the authoritative V2 reference for the KhelGrid Top Navigation Bar. Whenever navigation actions, routes, or visual layout rules are intentionally modified in `src/shared/components/TopNavbar.tsx` or `src/styles.css`, **this document must be updated in the same pull request** to preserve engineering consistency.
