# KhelGrid Global Footer — V2 Product and Engineering Specification

**Document version:** V2 (Authoritative)  
**Applies to:** KhelGrid Platform frontend foundation  
**Implementation references:** [src/App.tsx](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/src/App.tsx) (`site-footer`), [src/styles.css](file:///c:/Users/7khan/OneDrive/Desktop/Live%20score/src/styles.css)  
**Purpose:** Define the single authoritative layout, content structure, navigation columns, interactive pre-footer widgets, verified social community channels, IPR notices, and legal compliance rows for the global footer across all screen sizes.

---

## 1. Design Intent & Foundation

The KhelGrid footer is a comprehensive sports discovery and trust foundation. Rather than a bare copyright bar, it serves as a persistent platform anchor that connects grassroots athletes, parents, venue managers, coaches, and sports organizations to verified pathways.

### Visual Identity
- **Surface:** Cool near-white `#F6F8FB` to `#FFFFFF` background with crisp `#E2E8F0` top separation.
- **Typography:** Deep navy headings (`#10233F`), charcoal link text (`#334155`), and muted captions (`#64748B`).
- **Accents:** Emerald green (`#059669` / `#10B981`) badges and proactive intake callouts.
- **Responsiveness:** Fluid grid scaling from 5 columns on wide desktop (`> 1100 px`), 3 columns on tablet, 2 columns on mobile, down to stacked single-column on narrow devices (`<= 380 px`).

---

## 2. Structural Anatomy & Zones

The complete footer renders in 7 sequential vertical tiers:

```
+---------------------------------------------------------------------------------------------------+
| TIER 1: PRE-FOOTER INTERACTIVE DISCOVERY                                                          |
|   • Frequently Asked Questions (FAQ Accordion)                                                    |
|   • GameSportPlayAcrossIndia (Regional sports guide matrix)                                       |
|   • TopSportsComplexes (National multi-sport venue index)                                         |
+---------------------------------------------------------------------------------------------------+
| TIER 2: PRIMARY COLUMNS & DIRECTORY (5 Columns)                                                   |
|   [Brand Column]     | [Explore]        | [Play & Train]   | [Learn]        | [Grow with KhelGrid] |
|   • Logo & Tagline   | • All sports     | • Find a game    | • Sports guides| • Fast Partner Setup |
|   • 50+ Cities Note  | • Trials & Opps  | • Book venues    | • Learning hub | • Partner Platform   |
|   • Go Pro ₹499/mo   | • Venues         | • Turf Calendar  | • Chronicle    | • Host Tournament    |
|                      | • Sports cities  | • Parent Passbook| • Live scores  | • List your venue    |
|                      | • Search catalog | • Coaches & Acad |                | • Submit a trial     |
|                      | • Calendar       | • Hubs & Ops     |                | • Join as Coach      |
|                      |                  |                  |                | • Submit Paper       |
|                      |                  |                  |                | • Contact & About    |
+---------------------------------------------------------------------------------------------------+
| TIER 3: QUICK-ACCESS CHIPS                                                                        |
|   • Sports trials • Sports venues • Find a game • Sports calendar • Live scores • Search KhelGrid |
+---------------------------------------------------------------------------------------------------+
| TIER 4: PRODUCTS SHOWCASE GRID                                                                    |
|   • Sports CV • Talent Scanner • Find Trials • AI Sports Guide • Book Venues • Play & Match       |
+---------------------------------------------------------------------------------------------------+
| TIER 5: IPR, AI DISCLOSURE & INTELLECTUAL PROPERTY NOTICE                                         |
|   • Content copyright notice • AI informational use disclosure • Direct IPR inbox (ipr@khelgrid)  |
+---------------------------------------------------------------------------------------------------+
| TIER 6: SPORTS NETWORK INDEX & CARE NOTE                                                          |
|   • Internal navigation index • Independent source verification caveat                            |
+---------------------------------------------------------------------------------------------------+
| TIER 7: VERIFIED SOCIAL COMMUNITY & LEGAL/REGULATORY ROW                                          |
|   • Social Links: Reddit (r/Khelgridonline), LinkedIn, YouTube (@Khelgrid), WhatsApp, X (@Khelgrid)|
|   • Legal Pages: Privacy, Terms, Cancellation, POSH, Editorial, Verification, Cookie Settings     |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Directory Columns Detail

### 3.1 Brand Column (`.footer-about`)
- **Brand Logo:** High-efficiency WebP logo (`/assets/kg-logo.webp`, 118x38 px) linking to `/`.
- **Tagline:** *"India’s grid for sports trials, venues, coaching and athlete profiles."*
- **Grid Footprint:** *"India · 50+ sports cities in the grid (16 metro hubs)"*.
- **Monetization CTA:** `★ Go Pro · ₹499/month` leading to `/pricing`.

### 3.2 Explore Column (`aria-label="Explore KhelGrid"`)
- All sports (`/sports`), Trials & opportunities (`/opportunities`), Sports venues (`/venues`), Sports cities (`/cities`), Search catalogue (`/search`), Sports calendar (`/calendar`).

### 3.3 Play & Train Column (`aria-label="Play and train"`)
- Find a game (`/play`), Book venues (`/venues`), Turf Calendar (`/turf-calendar`, Free), Parent Passbook (`/parent-portal`, Free), Coaches (`/coaches`), Academies (`/academies`), Academy Hub (`/academy-hub`, Free), Coach Hub (`/coach-dashboard`, Free), Tournament Ops (`/tournament-ops`, Free), Sports CV Wizard (Coming soon indicator).

### 3.4 Learn Column (`aria-label="Learn and discover"`)
- Sports guides (`/guides`), Sports & learning hub (`/learning`), KhelChronicle Open Research (`/khelchronicle`), Live scores status (`/live`).

### 3.5 Grow with KhelGrid Column (`aria-label="About and support"`)
- **⚡ Fast Partner Setup (30s):** Direct onboarding route `/partner-signup`.
- **Partner with KhelGrid:** Enterprise partner hub `/partner`.
- **Host a Tournament:** Self-service operations `/tournament-ops`.
- **Intake Actions:**
  - `List your venue`: Direct intake modal `/submit-listing?type=venue`.
  - `Submit a trial`: Direct opportunity intake modal `/submit-listing?type=opportunity`.
  - `Join as Coach`: Coach registration `/submit-listing?type=coach`.
  - `Submit Paper`: Research paper submission `/khelchronicle/submit`.
- **Contact & Corporate:** Official email (`mailto:khelgrid@gmail.com`), About KhelGrid (`/about`).
- **Trust Guidance:** *"Check each organiser’s source, dates, eligibility, fees and venue before applying or travelling."*

---

## 4. Verified Social Channels & Regulatory Governance

### 4.1 Official Social Community Profiles
Only officially confirmed KhelGrid brand channels are linked (with `rel="noopener noreferrer"` and `target="_blank"`):
1. **Reddit:** `https://www.reddit.com/r/Khelgridonline/` (`r/`)
2. **LinkedIn:** `https://in.linkedin.com/in/khelgrid-dotcom-647b74418` (`in`)
3. **YouTube:** `https://www.youtube.com/@Khelgrid` (`▶`)
4. **WhatsApp Channel:** `https://whatsapp.com/channel/0029VbDHTXY4dTnFvo8rKF1A` (`WA`)
5. **X (Twitter):** `https://x.com/Khelgrid` (`𝕏`)

### 4.2 Legal, Ethics & Regulatory Compliance Row
- Standard development/live-feed disclaimers.
- Comprehensive compliance links:
  - Privacy Policy (`/privacy`)
  - Terms of Service (`/terms`)
  - Cancellation & Refund Policy (`/cancellation-policy`)
  - Prevention of Sexual Harassment (POSH) Policy (`/posh-policy`)
  - Editorial Standards & Fact Checking (`/editorial-policy`)
  - Athlete Verification Standards (`/verification-policy`)
  - Dynamic Cookie & Consent Preferences modal toggle.

---

## 5. Verification Checklist

- [ ] All 5 main directory columns render correctly on desktop (`1200 px`).
- [ ] Responsive folding verified at `1100 px` (3-column), `700 px` (2-column), and `<= 380 px` (1-column).
- [ ] All intake CTAs (`/submit-listing?type=...` and `/khelchronicle/submit`) open working interactive flows.
- [ ] Social profile links open the verified official channels in secure tabs.
- [ ] Safe-area padding is preserved on mobile devices with bottom navigation docks.
- [ ] Keyboard focus and screen reader labels verified across all links and buttons.
