# Live Sports Data, Match Center & Search Engine Architecture

**Status:** Development integration — external scoreboard endpoints and community scorekeeper are present; provider authorization, service-level guarantees, independent verification and production SEO eligibility remain unconfirmed.  
**Last Updated:** November 15, 2026 (Pillar 2 data-integrity and SEO review)

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
The live route currently emits page-level `WebPage` metadata only. It does **not** emit `SportsEvent` or `LiveBlogPosting` markup from scoreboard cards because:
- the cards do not have dedicated canonical event URLs;
- a display clock/over string is not a venue address;
- the current feed payload is not yet proven to provide complete, independently verified event dates and locations;
- provider permissions and eligibility for rich-result markup have not been confirmed.

Add event markup only after the match record has a stable URL, a valid event date, an actual location, reliable status provenance and an approved data-use basis.

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

The automated suite covers the engine contract, cricket-format detection, scoreboard page rendering, metadata and structured-data policy. The external-feed integration test depends on the provider endpoint being reachable in CI and is not a substitute for provider authorization or a production smoke test.

Pillar 2 adds checks that no fabricated community fixtures are seeded; community entries are not treated as external-feed evidence; the feed indicator reflects external-feed records only; missing team/competition names are not invented; live-page metadata avoids unsupported speed, season and commentary claims; and page-level structured data is used until canonical, complete event records exist.

A green unit suite does not establish provider rights, feed freshness, production availability, or permission to use third-party logos and commentary. Those require separate review.
