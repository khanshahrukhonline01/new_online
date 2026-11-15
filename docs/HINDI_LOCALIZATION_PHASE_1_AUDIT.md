# KhelGrid Hindi Localization — Phase 1 Audit

**Status:** Phase 1 static repository audit in progress  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Audited branch:** `main`  
**Audited commit:** `b4db2dc82798d302cc824308ad41f99c58a8cef5`  
**Audit branch:** `feat/hindi-localization-phase-1-audit`  
**Scope:** Entire application, including public pages, forms, help, policies, settings, notifications, admin/moderation interfaces and dynamic catalogue content.  
**Language policy:** English (`en-IN`) remains default; Hindi (`hi-IN`) is the first complete additional locale.  
**Translation policy:** AI-assisted draft plus human linguistic, domain and factual review.

> This is a static source audit. It does not claim that a browser-wide runtime audit, deployed preview inspection, database migration review or test execution has been completed.

## 1. Executive summary

KhelGrid already has an i18next foundation and partial Hindi dictionaries. The project should extend and complete the existing implementation rather than introduce a second translation framework.

The main gaps are coverage, consistency, URL/SEO localization, dynamic content, and end-to-end regression coverage. The present language preference is stored locally and changed through the settings menu; the audit did not find an implemented `/hi/` route strategy or `hreflang` implementation in the inspected source.

## 2. Repository baseline

At the audited main commit:

- 590 tracked files in the recursive Git tree.
- 206 TypeScript/TSX files.
- 71 files matching the repository's test-file naming patterns.
- 31 feature module directories under `src/modules`.
- i18next and react-i18next are already declared in `package.json`.
- i18n is initialized from `src/main.tsx`.
- Existing language selection is present in `src/shared/components/NavbarSettingsMenu.tsx`.
- Language preference persistence is implemented in `src/shared/preferences.ts` and `src/i18n/index.ts`.

These counts are a repository inventory baseline, not a count of every user-visible string.

## 3. Existing localization coverage

### Existing dictionaries

English currently has six locale files/namespaces:

- `common`
- `home`
- `navigation`
- `opportunities`
- `play`
- `reviews`

Hindi currently has the corresponding six files.

### Configured but incomplete namespaces

`src/i18n/config.ts` declares ten namespaces:

- common
- navigation
- home
- play
- opportunities
- venues
- academies
- reviews
- sports
- forms

However, the inspected `src/i18n/index.ts` imports and registers only six namespaces for English and Hindi. The four configured namespaces `venues`, `academies`, `sports`, and `forms` are not yet registered as translation resources.

### Component adoption

GitHub code search found `useTranslation` in five application files:

- `src/App.tsx`
- `src/shared/components/Sidebar.tsx`
- `src/modules/play/PlayPage.tsx`
- `src/shared/components/NavbarSettingsMenu.tsx`
- `src/shared/components/CommunityReviewsSection.tsx`

This is a clear indicator that translation hooks have not yet been adopted across the full feature surface. The search index is not a substitute for a full AST/string-extraction scan; Phase 1 implementation should add a deterministic local scanner.

## 4. Findings and risks

| Area | Finding | Risk / required action |
|---|---|---|
| i18n engine | Already installed and initialized | Extend existing engine; do not add a competing framework |
| Locale resources | Only six English/Hindi namespaces registered | Complete resource map and fallback tests |
| UI coverage | Translation hook found in only five files | Inventory and migrate all user-facing components |
| Language selector | Existing selector is in settings menu | Keep it; improve accessibility and consistent labels |
| Preference storage | Language persists in local storage | Preserve existing preference key and migrate safely |
| URL routing | No `/hi/` route implementation found in source search | Add locale-aware route parsing without breaking existing routes |
| HTML language | `index.html` currently starts with `lang="en"` | Set document language on initialization and every switch |
| SEO | Existing SEO utility is route-based, not visibly locale-aware | Localized title/description/canonical/alternate links |
| Sitemap | Existing sitemap generator creates English-path URLs | Add localized URLs only when matching translated pages are ready |
| Typography | Global CSS uses Inter/system sans-serif; no Devanagari-specific font declaration found | Add tested Devanagari font stack and verify layout |
| Dynamic records | No `title_hi`, `description_hi`, or `language_code` fields found in code search | Design a backward-compatible content localization model |
| Forms and validation | Most feature modules are not visibly using translation hooks | Translate labels, hints, validation, status, errors and success states |
| Policies | Policy routes are part of the application | Human/legal review before publishing translated legal text |
| Admin | Admin moderation module exists | Include internal moderation UI in scope, preserve permissions |
| Existing copy | Existing Hindi homepage dictionary repeats numerical and verification claims from English | Fact-check all claims; remove unsupported statements before launch |

### Specific content-integrity warning

The existing home dictionaries include claims such as “50+ cities”, “60+ Sports”, “100% Verified Sports Desk” and “0% Commission”. These must not be carried into a released Hindi experience unless independently supported by current product evidence and approved. Translation must never make an unsupported statement appear authoritative.

## 5. Target architecture

### Locale identifiers

- Default locale: `en-IN`
- Hindi locale: `hi-IN`
- i18next resource keys may remain `en` and `hi`, with explicit mapping to BCP 47 tags for HTML and SEO.

### URL strategy

Preserve all existing English URLs. Add a Hindi prefix:

- `/` and `/hi/`
- `/sports` and `/hi/sports`
- `/opportunities` and `/hi/opportunities`
- `/venues` and `/hi/venues`
- Equivalent paths for every eligible route.

Keep route slugs stable initially; translate visible labels and page content, not route identifiers. Switching language should preserve the current logical page and query/filter state. Unknown or unavailable localized routes must fall back safely, not produce a broken page.

### Translation resources

Keep the existing i18next setup. Organize resources by feature/domain namespace and use typed key conventions. Add all required namespaces and an automated parity check. English is the fallback, but fallback must be visible in audit reporting; it must not be treated as completed Hindi coverage.

### Dynamic content model

Do not blindly add `_hi` columns to every table. First inventory static and Supabase-backed entities and their current RLS contracts.

Preferred scalable option: a translation relation keyed by entity type, entity ID, locale, field, review status and content. The exact schema must be designed against the actual current schema and reviewed for RLS, indexes, uniqueness and query behavior before any migration. Keep original source fields unchanged. For static curated data, use typed localized dictionaries where appropriate.

Suggested conceptual fields:

- entity type and entity ID
- locale (`hi-IN`)
- translated title/description/eligibility/instructions
- translation status: draft, machine-reviewed, human-reviewed, published
- source revision/hash
- reviewer and reviewed timestamp

Never translate or alter dates, numeric eligibility, fees, official organisation names, source links or application instructions without a factual check. If no reviewed Hindi translation exists, show the approved English original with a clear language fallback.

### Translation workflow

1. Extract strings and identify source component/route.
2. Group strings by namespace and product domain.
3. Draft Hindi translation using consistent sports terminology.
4. Review for natural Indian Hindi, clarity and user comprehension.
5. Domain review for sports, recruitment, eligibility and product terms.
6. Legal review for policies, consent, privacy and terms.
7. Record review status and publish only approved translations.

## 6. Implementation phases and exit criteria

### Phase 1 — Audit and inventory

Deliverables:
- Page/route inventory, including aliases and detail pages.
- Component and user-visible string inventory.
- Existing translation coverage and missing namespace report.
- Dynamic data and database localization assessment.
- SEO, typography, accessibility and regression risk assessment.
- Baseline tests and a no-regression checklist.

Exit: audit report reviewed; all routes/modules and critical user flows accounted for.

### Phase 2 — i18n foundation

Deliverables:
- Complete resource registration and namespace loading.
- Locale metadata and safe language validation.
- Locale-aware route parsing and language switch preserving route/query.
- Correct `html[lang]` and `document.documentElement.lang`.
- Accessible language selector, retaining settings integration.
- Missing-key and namespace-parity tests.

Exit: English remains unchanged; Hindi can be selected, persisted, deep-linked and refreshed without route breakage.

### Phase 3 — Full UI localization

Translate:
- Header, top navigation, sidebar, mobile drawer and footer.
- Homepage and all catalogue/detail pages.
- Search, sort, filters, chips, empty/loading/error states.
- Forms, field hints, validation, confirmation and submission statuses.
- Help & Feedback, notifications, settings and coming-soon pages.
- Athlete CV, profiles, events, calendars, coaching and academy pages.
- Trust, privacy, terms, cancellation, POSH, IPR and editorial policies.
- Admin and moderation interfaces.

Exit: no unreviewed hardcoded English remains in the approved Hindi UI scope; all dynamic labels and accessibility names are localized.

### Phase 4 — Dynamic content localization

Deliverables:
- Entity/data inventory and translation schema proposal.
- Backward-compatible migration only after schema and RLS review.
- Localized queries with English fallback.
- Translation status/review workflow for content editors.
- Coverage report for published dynamic records.

Exit: no original record is overwritten; English remains available; only human-reviewed Hindi content is published.

### Phase 5 — SEO, typography and accessibility

Deliverables:
- Localized metadata per route.
- Correct canonical and reciprocal `hreflang` alternate links.
- Sitemap entries for translated routes only.
- Devanagari font stack and font-loading performance review.
- Responsive text wrapping, line height, buttons and cards.
- Keyboard, screen-reader, contrast and zoom checks.

Exit: search engines can identify language alternatives and Hindi layouts work at supported viewport sizes.

### Phase 6 — QA and staged release

Deliverables:
- Existing English regression suite.
- Hindi route/component integration tests.
- Locale switching, persistence, refresh and browser-history tests.
- Translation key parity and no-fallback checks for release-critical keys.
- Form, validation, search/filter and dynamic data tests.
- Desktop/mobile visual review and manual linguistic sign-off.
- Development preview release checklist.

Exit: all required CI checks pass; critical flows pass in both languages; product owner approves the development preview. Production and DNS remain unchanged until separately approved.

## 7. Preservation and safety constraints

- Do not change production deployment, DNS, or production data as part of this project.
- Do not change existing Supabase RLS/security policies merely to support translation.
- No destructive migrations; any database work must be separate, additive, timestamped, tested and reviewed.
- Preserve English route behavior, existing query parameters, filters, aliases and browser history.
- Preserve current language preference key where feasible; validate stored locale values.
- Do not change authentication, booking, payments, moderation or listing behavior.
- Do not use automatic browser translation as a substitute for product localization.
- Do not publish machine-only translations of official, legal or eligibility content.
- Do not claim a translation is complete merely because i18next falls back to English.

## 8. Phase 1 audit checklist

- [x] Confirm repository and audited main commit.
- [x] Inventory tracked files, TypeScript files, tests and feature modules.
- [x] Confirm i18next dependencies and initialization.
- [x] Inspect English and Hindi resource files.
- [x] Inspect language preference and selector integration.
- [x] Search for translation-hook adoption.
- [x] Inspect route, SEO, sitemap and global typography architecture.
- [x] Search for localized dynamic data fields.
- [ ] Complete exhaustive route-by-route user-visible string extraction.
- [ ] Inspect all form validation, notification, error and empty-state copy.
- [ ] Review all policy copy with qualified human reviewers.
- [ ] Run baseline typecheck, lint, tests and build in a working checkout.
- [ ] Review Supabase schema/RLS and classify local versus database-backed content.

## 9. Next action

Finish the unchecked exhaustive inventory and baseline checks before implementing Phase 2. This branch intentionally contains audit documentation only; no application code, translation behavior, database schema, RLS, production settings or deployment behavior has been changed.
