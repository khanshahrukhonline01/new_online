# KhelGrid Sidebar — V2 Product and Engineering Specification

**Document version:** V2 (Authoritative)  
**Applies to:** KhelGrid Platform frontend foundation  
**Implementation references:** [src/shared/components/Sidebar.tsx](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/src/shared/components/Sidebar.tsx), [src/shared/navigation/navigationRegistry.ts](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/src/shared/navigation/navigationRegistry.ts), [src/styles.css](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/src/styles.css)  
**Purpose:** Maintain the single source of truth for appearance, layout, navigation groups, responsive states, accessibility, and interaction standards for the KhelGrid universal sidebar and mobile drawer.

---

## 1. Design Intent & Ownership

The sidebar is KhelGrid's secondary discovery and module-exploration surface. It operates in synergy with the [Top Navigation Bar](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/docs/top-navigation-v1.md) (V2):

- **Top Navigation Bar (V2):** Owns brand identity, quick player actions (`Play`, `Athlete`), global spotlight search (`Ctrl + K`), B2B workspaces (`Organizations`, `Campaigns`), primary intake CTAs (`+ List on KhelGrid`, `Submit Paper`), notifications, appearance settings, and user auth.
- **Sidebar & Mobile Drawer:** Owns deep module navigation, structured catalog browsing, personalized spaces, scouting pipelines, and knowledge resources across 6 primary navigation groups.
- **Independence:** The desktop sidebar does not duplicate the brand logo or search bar. On mobile, the hamburger menu (`header-nav-toggle`) in the top navbar opens the full navigation drawer.

### Visual Principles

- **Surface & Hierarchy:** Cool near-white surface (`#F6F8FB` / white cards), deep navy typography (`#10233F`), muted blue-grey secondary text (`#64748B`), delicate borders (`#E2E8F0`), and emerald accents (`#059669` / `#07964F`).
- **Row Anatomy:** Minimum 40 px touch target, 8 px border radius, 18 px icons with consistent baseline alignment.
- **Active Navigation:** High-contrast yet calm active indicator using pale green pill highlight (`#DCFCE7`), emerald label text (`#059669`), and a solid emerald inset left border (`3 px`).
- **Disabled/Coming Soon Items:** Clearly rendered with muted styling and a subtle “Soon” badge; non-interactive and inaccessible to accidental click/tab events.
- **Utility Anchor:** Help & feedback (`khelgrid@gmail.com`) and copyright notes anchored cleanly at the base.

---

## 2. Layout Anatomy & Responsive Breakpoints

### 2.1 Desktop Sidebar (Expanded)
- **Width:** Fixed at `258 px` on wide desktop displays (`> 1000 px`).
- **Offset:** Sticky positioning below top header (`top: 70 px`).
- **Zones:**
  1. **Scrollable Navigation List (`.sidebar-navigation`):** Independently scrollable container using slim 5 px scrollbars (`overscroll-behavior: contain`).
  2. **Sports CV Promo Card:** Direct callout card driving athletes to `/sports-cv`.
  3. **Bottom Utility Bar:** Help mailto trigger and copyright attribution.

### 2.2 Collapsed Icon Rail (Tablet & Desktop Compact)
- **Width:** `68 px` narrow rail active between `761 px – 1000 px` (or when collapsed via toggle).
- **Behavior:** Text labels, section headings, and promotional cards are hidden.
- **Tooltips & Accessibility:** Icons remain centered (`18 px`); accessible names and native tooltips (`title`) indicate target module or "Coming soon".

### 2.3 Mobile Slide-in Drawer (`<= 760 px`)
- **Drawer Size:** Responsive slide-over panel clamped to `min(330px, 100vw - 42px)`.
- **Backdrop:** Semi-transparent dark overlay (`rgba(16, 35, 63, 0.45)`). Tapping backdrop or pressing `Escape` closes the drawer.
- **Focus Management:** Traps focus inside the drawer while open, moving focus to the close button upon opening and returning focus to `header-nav-toggle` on close.
- **Mobile Bottom Quick Bar:** Companion 5-item quick navigation (`Home`, `Sports`, `Trials`, `Venues`, `Search`) remains docked at the bottom of the viewport with safe-area insets.

---

## 3. Navigation Modules (Single Source of Truth)

All sidebar and mobile drawer links are driven strictly by `navigationModules` in [src/shared/navigation/navigationRegistry.ts](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/src/shared/navigation/navigationRegistry.ts):

```
+-----------------------------------------------------------------------------------+
| MODULE 1: YOUR SPACE                                                              |
|   • Home (/)                          • Workspace (/workspace)                    |
|   • Parent & Athlete Passbook         • My Passes & Vouchers (/my-passes)         |
|     (/parent-portal)                  • Saved Items (/saved)                      |
+-----------------------------------------------------------------------------------+
| MODULE 2: DISCOVER                                                                |
|   • All Sports (/sports)              • Sports Venues (/venues)                   |
|   • Trials & Opportunities            • Search Catalogue (/search)                |
|     (/opportunities)                  • For You (/for-you)                        |
+-----------------------------------------------------------------------------------+
| MODULE 3: PLAY & MATCH CENTER                                                     |
|   • Play · Find games (/play)         • Coaches Directory (/coaches)              |
|   • Lacrosse Sixes Game               • Sports Academies (/academies)             |
|     (/play/lacrosse-sixes)            • Events & Tournaments (/events)            |
|   • Turf Hourly Slots (/turf-calendar)|                                           |
+-----------------------------------------------------------------------------------+
| MODULE 4: SCOUTING & ATHLETE PIPELINE                                             |
|   • Sports CV Wizard (/sports-cv)     • Talent Scanner (/talent-scanner)          |
|   • Athlete Directory (/athletes)     • Scout Portal (/scout-portal)              |
|   • Athlete Verification (/verification)                                          |
+-----------------------------------------------------------------------------------+
| MODULE 5: KNOWLEDGE & COMMUNITY                                                   |
|   • Sports & Learning Hub (/learning) • Sports Tools & Calculators (/tools)       |
|   • Sports Guides (/guides)           • Sports Community (/community)             |
|   • AI Sports Guide (/ai-guide)       • KhelChronicle Research (/khelchronicle)   |
+-----------------------------------------------------------------------------------+
| MODULE 6: NETWORK & ECOSYSTEM                                                     |
|   • Organizations Hub (/organizations)• Trust & Verification Center (/trust)      |
|   • Creator Campaigns (/campaigns)    • Pricing & Plans (/pricing)                |
|   • Partner with KhelGrid (/partner)  • Support & Help (/help)                    |
+-----------------------------------------------------------------------------------+
```

---

## 4. Interaction, State & Active Route Matching

1. **Active Route Resolver (`isActive`):**
   - Matches current route path exactly or handles route family aliases:
     - `/opportunities`, `/trials`, `/combines`, `/scholarships`, `/camps` activate the Trials item.
     - `/venues`, `/book` activate the Sports Venues item.
     - `/sports/:slug` activates All Sports when browsing specific disciplines.
   - Active link sets `aria-current="page"`.
2. **Expandable Section Groups:**
   - Default expanded state: **Your Space**, **Discover**, and **Play & Match Center** open; others collapsed.
   - Accordion controls expose `aria-expanded` and `aria-controls`.
3. **Smooth Scrolling & Scroll Isolation:**
   - Independent overflow: `overflow-y: auto; overscroll-behavior: contain;`.
   - Scrollbar styled with `scrollbar-width: thin;` and translucent thumb. Does not chain or trigger parent page scroll jumps.

---

## 5. Accessibility & Verification Gates

- **Landmark Semantics:** Semantic `<nav aria-label="Main navigation">` with appropriate role attributes.
- **Keyboard Navigation:** Full Tab/Shift+Tab support with visible focus ring (`2px solid #059669`).
- **Reduced Motion:** Respects `prefers-reduced-motion: reduce` by disabling slide transitions.
- **Verification Commands:**
  ```bash
  npm run typecheck
  npm run lint
  npx vitest run src/shared/navigation/navigationRegistry.test.ts src/App.test.tsx
  npm run build
  ```
