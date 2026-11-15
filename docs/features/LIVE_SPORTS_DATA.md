# Live Sports Data, Match Center & Search Engine Architecture

**Status:** Operational — Real-Time Multi-Sport Scoreboard Feed with Dynamic SEO & Nominative Fair Use Compliance  
**Last Updated:** November 15, 2026 (Phase 2 SEO & SERP Optimization Milestone)

---

## 1. Executive Summary & Search Performance Context

Based on verified Google Search Console (GSC) organic performance metrics, KhelGrid's Live Scores service represents a high-priority discovery asset:
- **Impression Volume:** 473+ impressions on `/live-scores` with Page 1 rankings (Positions 5–6) across high-intent national queries (`live cricket score wpl`, `live cricket score icc`, `t20 live score`, `khel box live match`).
- **Optimization Objective:** Eliminate 0% CTR drop-off by deploying high-CTR bilingual SERP titles, rich ball-by-ball description snippets, real-time match state synchronization, and Google-compliant Schema.org `SportsEvent` & `LiveBlogPosting` structured markup.
- **Legal Compliance:** Strict adherence to Indian statutory trademark fair use (Section 30 of Trade Marks Act, 1999) and current events reporting (Section 52 of Copyright Act, 1957) accompanied by prominent on-page attribution notices.

---

## 2. Technical SEO & Schema.org Structured Data Architecture

### A. Route Metadata Specification (`src/shared/utils/seoAndShare.ts`)
The `/live` and `/live-scores` endpoints provide deterministic, search-optimized meta tags:
- **Canonical Route:** `https://khelgrid.com/live` (with automatic 301/alias mapping for `/live-scores`).
- **Title (Default / Pre-Match):** `Live Cricket Scores, WPL & ICC Match Center · KhelGrid (लाइव स्कोर)`
- **Meta Description:** `Fastest live cricket scores, WPL Women's Premier League, ICC tournaments, T20 leagues, ball-by-ball commentary, match scorecards, and local tournament updates on KhelGrid.`
- **Target Keywords:** `live cricket score wpl`, `live cricket score icc`, `wpl live score`, `t20 live score`, `ball by ball commentary`, `live scorecards cricket`, `cricket match center`, `लाइव क्रिकेट स्कोर`, `लाइव स्कोर`.

### B. Dynamic In-Match Title & Description Synchronization (`LiveScoresPage.tsx`)
When a match is in active live play (`status === 'LIVE'`), the client dynamically synchronizes page metadata:
- **Dynamic Title:** `(LIVE) {TeamA.code} {TeamA.score} vs {TeamB.code} {TeamB.score} · Live Cricket Score | KhelGrid`
- **Dynamic Description:** `(LIVE) {TeamA.name} {TeamA.score} vs {TeamB.name} {TeamB.score} in {Tournament} ({Format}). {StatusText}. Follow live ball-by-ball commentary & instant scorecards on KhelGrid.`

### C. Schema.org JSON-LD Entities
Every state change automatically updates the DOM `<script id="khelgrid-jsonld" type="application/ld+json">` with:
1. `WebPage` with `about` entities: `Cricket`, `Women's Premier League (WPL)`, `ICC Cricket`, `T20 Cricket`, `Live Sports Scores`.
2. `SportsEvent`: For all active, scheduled, and finished matches (including `homeTeam`, `awayTeam`, `sport`, `eventStatus`, and `location`).
3. `LiveBlogPosting`: For active live matches, enabling Google SERP rich cards and real-time score indicators.

---

## 3. Statutory Nominative Fair Use & Legal Compliance Framework

### A. Trademark Law (Trade Marks Act, 1999)
- **Nominative Fair Use (Section 30(1) & 30(2)(d)):** Mention of federation names (BCCI, ICC), league marks (WPL, IPL), and team names is strictly nominative to identify the sporting event.
- **Non-Affiliation Notice:** Explicit clarification that KhelGrid is an independent grassroots platform not endorsed or sponsored by BCCI, ICC, or any cricket franchise.

### B. Copyright Law (Copyright Act, 1957)
- **Current Events Exception (Section 52(1)(a)(iii)):** Reporting scores, wickets, runs, and factual game progression constitutes current events news reporting and fair dealing.
- **Factual Data Non-Copyrightability:** Pure sports scores and factual match events are in the public domain under settled jurisprudence (*Eastern Book Company v. D.B. Modak*; *ICC Development (International) Ltd. v. Arvee Enterprises*).

### C. On-Page Attribution Banner
Rendered in `LiveScoresPage.tsx` above footer navigation:
> *"Statutory Nominative Fair Use & Trademark Attribution Notice: All tournament designations, series marks, team names, logos, and athletic federation identifiers (including WPL, ICC, BCCI, IPL, and franchise team names) are the intellectual property of their respective governing bodies and commercial rights holders. KhelGrid displays real-time match scores, ball-by-ball commentary, and match statistics strictly for factual informational, sports journalism, and public grassroots awareness under Section 30 of the Indian Trade Marks Act, 1999 and Section 52 of the Copyright Act, 1957."*

---

## 4. Verification & Testing Standards

All live sports SEO and engine modules are verified under automated testing:
- **Unit Suite:** `src/modules/live/live-scores.test.tsx` (LiveSportsEngine singleton, format detection, real feed fetch with attribution, UI rendering, conversion funnel, legal notice presence, and SEO metadata).
- **Type Checking:** 100% clean compilation via `npx tsc -b`.
- **Linting:** 0 errors via `npm run lint`.
