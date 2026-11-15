# KhelGrid Image Asset Requirements and Production Plan

- **Status:** Draft — planning baseline; not an approval to publish or deploy assets
- **Owner:** KhelGrid product/design and frontend maintainers
- **Repository:** `khelgrid-platform`
- **Last reviewed:** 2026-11-02
- **Scope:** Public website, catalogues, athlete tools, editorial/research pages, interface states and KhelGrid-owned marketing assets
- **Related documents:** [Frontend Architecture](architecture/FRONTEND_ARCHITECTURE.md), [SEO and Content Quality](growth/SEO_CONTENT_AND_METADATA.md), [Documentation Guide](README.md)
- **Change control:** Update this document when page coverage, supported sports, asset formats, licensing rules or visual direction changes.

## 1. Purpose and governing principles

This document is the source of truth for planning, commissioning, generating, reviewing, storing and integrating visual assets for KhelGrid. It is intended to prevent ad-hoc image selection, inconsistent visual presentation, unlicensed use and misleading representations.

1. Preserve the KhelGrid navy and emerald-green visual identity.
2. Prefer genuine, relevant sports grounds, stadiums and facilities for sports/venue imagery. Do not substitute generic athlete portraits where a stadium or venue image is required.
3. Never imply that a generic or illustrative image depicts a specific real venue, academy, coach, event, athlete, trial or organizer.
4. A photograph is not evidence that a listing, venue, coach, academy, event or trial is verified, available or currently active.
5. Use only assets that KhelGrid owns, has permission to use, or can use under a documented license whose terms allow the intended use.
6. Do not remove attribution, creator credits, watermarks or license notices where required. Do not use watermarked preview images as production assets.
7. Do not expose private, sensitive or identifying information in image metadata, filenames, alt text or public asset paths.
8. Keep images performant, responsive, accessible and appropriate to the actual page content.
9. Use real database/catalogue records to determine which sport-specific assets are needed. The asset plan must not invent a fixed supported-sport count.
10. An image asset being generated, downloaded or present in the repository does not mean it is approved for production.

## 2. Asset lifecycle and status vocabulary

Track each asset in the asset manifest (to be maintained alongside implementation). Use only these statuses:

- **Needed:** requirement identified; no candidate asset selected.
- **Briefed:** dimensions, subject, crop and usage are specified.
- **Created:** a candidate has been generated, photographed or sourced.
- **Rights checked:** ownership/license and permitted use are documented.
- **Reviewed:** visual quality, accuracy, crop, accessibility text and technical requirements have been checked.
- **Approved:** designated reviewer has approved the exact asset for its stated use.
- **Integrated:** approved asset is referenced by the intended page/component.
- **Retired:** no longer used; retain provenance and avoid silently reusing it.

Do not skip the rights check or visual review. Keep the asset's source, creator/provider, license or permission evidence, acquisition date, reviewer, approval date and intended use in the manifest. Generated assets should be identified as AI-generated and checked for visual artifacts and misleading details.

## 3. Global asset inventory

### 3.1 Brand identity and site-wide graphics — P0

| Asset | Required variants / use | Suggested format |
|---|---|---|
| Primary KhelGrid logo | Full-color transparent; header and footer | SVG preferred; PNG fallback |
| Light/reversed logo | White/light mark for dark backgrounds | SVG/PNG |
| Dark logo | Dark mark for light backgrounds | SVG/PNG |
| Square brand mark | Avatar, compact UI, app tile | SVG/PNG |
| Favicon | Browser tab and bookmarks | SVG + PNG/ICO as needed |
| PWA/app icons | 192×192 and 512×512 where PWA is supported | PNG |
| Social profile avatar | Consistent square brand mark | PNG/WebP |
| Default social preview | Open Graph/social sharing fallback | JPEG/PNG, 1200×630 |
| Brand texture/background | Optional subtle navy/emerald supporting pattern | SVG/WebP |
| LinkedIn/Facebook/YouTube covers | Platform-specific safe-area layouts | PNG/JPEG |

Do not redraw or approximate the official logo when an approved source file exists. Confirm logo variants against the canonical brand asset before use.

### 3.2 Homepage hero stadium carousel — P0

Five planned hero subjects:

1. Cricket stadium / ground.
2. Football stadium / pitch.
3. Athletics stadium / running track.
4. Basketball arena / court.
5. Badminton indoor arena / courts.

Requirements:
- Wide landscape composition, target 16:9, with enough negative space for text overlays.
- Use actual stadium/arena environments as the subject; avoid close-up athlete portraits as substitutes.
- Provide desktop and mobile crop/focal-position checks; create separate crops only when responsive cropping cannot preserve the subject.
- Use a consistent photographic treatment and restrained dark navy overlay so fixed headline and calls to action remain readable.
- Target 1920×1080 source master; provide optimized responsive derivatives.
- Preserve the existing carousel behavior documented in the root README: fixed text/actions, 3-second transition, pause/selection controls, lazy loading for subsequent slides, reduced-motion behavior and keyboard accessibility.
- Audit current external image URLs and their rights/availability. Prefer approved self-hosted optimized assets where feasible; do not assume an externally hosted image is licensed merely because it loads.
- Do not add sports to the hero without updating the product/design decision and this inventory.

### 3.3 Sports catalogue and sport detail pages — P0

Provide one representative image per sport actually present in the supported sports catalogue. Build the final list from the live development database/configuration and route registry, not from a hard-coded assumption about the total number of sports.

Candidate sport coverage includes, where supported by catalogue data: cricket, football, athletics, basketball, badminton, tennis, hockey, volleyball, kabaddi, wrestling, boxing, swimming, table tennis, gymnastics, shooting, archery, cycling, chess, rugby, golf, squash, rowing, weightlifting, fencing, taekwondo and other configured sports.

For each configured sport, record:
- Stable sport slug/ID and display name.
- Card image and (if materially different) detail-page hero image.
- Actual subject/court/field/equipment relevant to the sport.
- Crop/focal point and mobile behavior.
- Descriptive alt text that describes the image, not unsupported marketing claims.
- Rights/source and review status.

A sport without an approved image must use a neutral, consistent fallback or icon; it must not borrow an unrelated sport image.

### 3.4 Opportunities, trials and athlete selection — P0

Create category-level illustrations/photographs for:
- General sports opportunities.
- Open trials and selection trials.
- Talent identification / scouting camps.
- Athlete assessment / combine events.
- Academy admission and team selection.
- Scholarships and supported development programmes.
- State, national and university-level selection pathways.

Use generic category art only as a category illustration. An individual listing may use an event-specific photograph only if the image is genuinely connected to that organizer/event and its rights are documented. Do not create synthetic event posters that could be mistaken for official announcements. Never use images to imply that registration is open, a trial is confirmed or an organizer endorses KhelGrid.

### 3.5 Venues and sports facilities — P0

Prepare representative category imagery for facility types actually supported by the venue catalogue, such as:
- Cricket stadiums and grounds.
- Football grounds and turfs.
- Athletics tracks and stadiums.
- Indoor sports complexes.
- Badminton and tennis courts.
- Basketball and volleyball courts.
- Swimming pools.
- Hockey fields.
- Kabaddi facilities.
- Gyms and strength-training facilities.
- Multi-sport complexes and sports hostels/training facilities.

**Critical accuracy rule:** a generic image may illustrate a venue category, but it must never be presented as a photograph of a named venue. A named venue's gallery must contain that venue's own authorized photographs or clearly state that photographs are unavailable. Do not infer amenities, condition, capacity, opening hours, pricing or availability from a photograph.

### 3.6 Academies and coaching — P1

Category imagery may include cricket, football, athletics, badminton, tennis, swimming, basketball, hockey and multi-sport coaching environments, subject to supported catalogue categories.

Additional placeholders:
- Academy logo placeholder.
- Coach profile/avatar placeholder.
- Coaching-session category image.
- Academy cover image placeholder.

Actual academy logos, coach portraits and training photographs require permission or a suitable documented license. Do not use a stock/generated portrait as the photograph of a real named coach. Do not use a photograph to substantiate ratings, credentials, affiliations, fees, schedules or a “verified” status.

### 3.7 Athlete profiles and Sports CV — P1

Required neutral visual assets:
- Generic athlete avatar options that do not assert identity.
- Coach and scout role placeholders.
- Profile cover image fallback.
- Sports CV cover/section graphic.
- Achievement, medal, trophy and certificate icons.
- Performance/statistics section illustrations.

Allow users to control whether their own photographs appear. Do not prepopulate a real person's photo or imply that a sample profile is a real athlete. Keep uploaded images private by default unless a separate, explicit publication/sharing flow is implemented and approved. Avoid sensitive personal information in image filenames and metadata.

### 3.8 Events and competitions — P1

Category imagery may cover national/state championships, university competitions, school sports, international events, and sport-specific tournaments.

Use an event-specific image only when it is authorized and accurately connected to the named event. Generic imagery must be clearly illustrative. Do not fabricate event branding, sponsors, dates, venues, participant identities or official endorsements.

### 3.9 KhelChronicle research and sports journal — P1

Prepare editorial visual themes for:
- Journal and issue covers.
- Research article covers.
- Sports science and performance research.
- Biomechanics and movement analysis.
- Sports medicine (non-diagnostic editorial imagery).
- Performance analytics and sports technology.
- Athlete development and sports education.
- Author/researcher profile placeholders.

Use a consistent editorial system for paper covers. Individual research articles should not all reuse one generic stock image. Do not imply peer review, institutional affiliation, research findings or author identity through imagery. Use only approved author portraits/logos.

### 3.10 Live sports and statistics — P1

Potential assets:
- Cricket, football and tennis live-match category thumbnails.
- Scoreboard/background texture.
- Live/upcoming/finished status icons.
- Team and tournament logo placeholders.
- No-live-matches illustration.

These are UI/category assets only. Never use a generic scoreboard or generated match graphic to represent a real fixture, score, team, tournament, live broadcast or official provider feed. Team and league marks require rights review. Real match data and data-provider attribution are governed separately from image rights.

### 3.11 UI icons, empty states and utility illustrations — P2

Create or select a consistent icon/illustration family for:
- No search results.
- No trials/opportunities.
- No venues.
- No saved items.
- No notifications.
- No events.
- Login/account feature coming soon.
- Incomplete profile.
- Document upload and Sports CV.
- Verification pending (without implying verification has occurred).
- 404/not found.
- Error/unavailable.
- Loading/skeleton states.

Prefer existing accessible SVG icon components for simple interface symbols rather than raster images. Empty-state illustrations should not obscure the message or imply that a feature is available when it is not.

### 3.12 Marketing and social content — P2

Prepare reusable templates for:
- KhelGrid introduction/brand announcement.
- List your venue.
- Submit a trial.
- Create a Sports CV.
- Discover sports opportunities.
- Find sports facilities and academies.
- LinkedIn, Instagram, Facebook and YouTube content.
- Pitch deck and partner presentation covers.

Use platform-specific dimensions and safe areas. Marketing images must not contain unsupported audience, user, verification, performance or partnership claims. All third-party logos and photographs require rights review.

## 4. Technical image specifications

These are starting targets, not rigid requirements; choose the smallest dimensions that preserve quality at actual rendered sizes.

| Use | Master / target dimensions | Aspect ratio | Preferred delivery |
|---|---:|---:|---|
| Homepage hero | 1920×1080 | 16:9 | AVIF/WebP |
| Sport cards | 800×600 | 4:3 | WebP/AVIF |
| Venue cards | 800×600 | 4:3 | WebP/AVIF |
| Academy cards | 800×600 | 4:3 | WebP/AVIF |
| Opportunity cards | 800×600 | 4:3 | WebP/AVIF |
| Athlete portraits | 600×800 | 3:4 | WebP |
| Article/journal covers | 1200×675 or design-specific | 16:9 or portrait cover | WebP/AVIF |
| Social preview | 1200×630 | 1.91:1 | JPEG/PNG |
| Brand marks | Vector master; raster derivatives 512px+ | Depends on mark | SVG/PNG |
| UI icons | 24–128px or vector | Depends on icon | SVG |

Implementation requirements:
- Generate responsive derivatives for rendered widths; do not send a 1920px image to every small card.
- Prefer AVIF/WebP for photographic content with a suitable fallback when needed.
- Keep SVGs sanitized and limited to trusted assets; do not inline untrusted SVG uploads.
- Set explicit width/height or aspect ratio to prevent layout shift.
- Use `srcset`/`sizes` or the project's image component equivalent for responsive delivery.
- Lazy-load below-the-fold images; prioritize only the actual above-the-fold hero/LCP image.
- Use asynchronous decoding where appropriate.
- Compress images without visible quality loss and remove unnecessary metadata, including GPS/EXIF.
- Avoid large animated GIFs; use CSS for simple transitions.
- Confirm color contrast when images sit behind text; use an overlay or solid surface as needed.
- Do not make meaningful text part of an image when it can be rendered as accessible HTML.

## 5. Naming convention and directory structure

Use lowercase kebab-case, stable descriptive names and no spaces. Include the sport/category and purpose. Avoid vague names such as `image1.webp`, date-only names or personal information.

Examples:
- `hero-cricket-stadium-wide.avif`
- `hero-football-stadium-wide.avif`
- `sport-badminton-card.webp`
- `venue-category-indoor-court.webp`
- `opportunity-category-open-trials.webp`
- `ui-empty-no-results.svg`

Proposed public asset layout (adapt to existing repository conventions and avoid duplicating the current canonical icon directories):

```text
public/assets/
├── brand/
├── hero/
│   ├── cricket/
│   ├── football/
│   ├── athletics/
│   ├── basketball/
│   └── badminton/
├── sports/
├── opportunities/
├── venues/
├── academies/
├── coaches/
├── athletes/
├── events/
├── live-sports/
├── khelchronicle/
├── ui/
├── icons/
└── social/
```

Before creating directories, inspect the existing `public/assets` structure and reuse established locations (including existing sports and icons folders). Do not move or rename existing assets without checking all references and updating tests/docs.

## 6. Asset manifest and provenance record

Maintain a machine-readable or tabular manifest for every candidate asset. At minimum record:

| Field | Meaning |
|---|---|
| Asset ID | Stable unique identifier |
| File path | Repository path or approved external reference |
| Asset name | Human-readable subject |
| Category / sport slug | Intended catalogue or page category |
| Intended usage | Exact page/component and placement |
| Source / creator | Original creator, photographer, provider or generation method |
| Rights evidence | License name/URL, permission record or ownership statement |
| Attribution | Required credit text and placement, if any |
| Acquisition date | When the candidate was obtained |
| Dimensions / format / size | Technical properties |
| Alt text | Contextual accessible description |
| Focal point | Crop position for responsive use |
| Status | Lifecycle status from Section 2 |
| Reviewer / approval date | Who approved this exact asset and when |
| Notes | Restrictions, expiry, edits or known limitations |

For generated assets, record the generation tool/process and that the image is synthetic. Do not describe a generated image as a documentary photograph of an actual venue, event or person.

## 7. Accessibility and content integrity

- Write alt text based on what is visibly present and the image's role on that page.
- Use empty alt text (`alt=""`) for purely decorative images so screen readers can skip them.
- Do not put keyword lists, unsupported claims or repeated page titles in alt text.
- If an image contains essential information, provide that information in text nearby.
- Ensure text overlays meet WCAG contrast requirements in all responsive crops.
- Avoid flashing, rapid animation and motion that ignores reduced-motion preferences.
- Never imply a real person's identity, gender, age, team affiliation or achievement from an illustrative image.
- Avoid misleading national/team uniforms, badges, sponsor marks or recognizable branding unless accurate and authorized.

## 8. Integration rules by page type

| Page/component | Asset behavior |
|---|---|
| Homepage | Approved hero carousel assets only; fixed copy and accessible controls remain HTML |
| Sports catalogue | Match image to configured sport slug; neutral fallback when absent |
| Sport detail | Use same sport mapping; no unrelated image substitution |
| Opportunities/trials | Category illustration by default; event-specific image only with evidence and rights |
| Venues | Venue-specific photo only when truly depicting that venue; otherwise category fallback clearly treated as illustrative |
| Academies/coaches | Approved organization/person image only; otherwise neutral placeholder |
| Athlete/Sports CV | User-controlled upload or neutral placeholder |
| Events | Official/authorized event imagery only; otherwise generic category art |
| KhelChronicle | Editorial cover art linked to the actual article/topic; no false peer-review or affiliation implication |
| Live sports | Category art only; never imply a live match or score |
| Empty/error states | Decorative illustration paired with clear accessible text |
| Social sharing | Approved branded fallback and page-specific image only when appropriate |

Image selection must not affect listing status, verification state, ranking, eligibility, availability or other business logic.

## 9. Work plan and priority

### Phase 1 — Public foundation (P0)
1. Audit official KhelGrid logo and existing icon/image folders.
2. Confirm approved brand variants and favicon set.
3. Audit and rights-check the five homepage hero images.
4. Produce/approve the five hero stadium assets and responsive derivatives.
5. Build a mapping for all currently configured sports and identify missing card images.
6. Prepare opportunity/trial category imagery.
7. Prepare venue/facility category imagery and a strict generic-versus-specific usage rule.

### Phase 2 — Catalogue depth (P1)
1. Academy and coaching category assets.
2. Coach/athlete neutral placeholders and Sports CV graphics.
3. Event category assets.
4. KhelChronicle editorial cover system.
5. Live-sports category and empty-state assets.

### Phase 3 — Interface and growth (P2)
1. Empty-state and utility illustrations.
2. Social media templates and sharing graphics.
3. Pitch deck and partner presentation assets.
4. Review asset reuse, accessibility and performance across all page types.

## 10. Acceptance checklist

An asset is ready to integrate only when all applicable checks pass:

- [ ] It satisfies a documented page/component requirement.
- [ ] Its subject is accurate for the intended category and does not imply a false real-world identity.
- [ ] Source, creator and rights/permission are recorded.
- [ ] Attribution and license restrictions are understood and implemented.
- [ ] Visual quality, crop, focal point and mobile rendering are reviewed.
- [ ] Alt text/decorative treatment is correct.
- [ ] Format, dimensions, compression and file size are suitable.
- [ ] Responsive loading and layout-shift behavior are checked.
- [ ] No unnecessary EXIF/GPS or sensitive metadata remains.
- [ ] Exact asset is marked Approved in the manifest.
- [ ] All code references and relevant tests are updated.
- [ ] The page has been checked in a development preview; production is not changed without separate approval.

## 11. Release and governance safeguards

- This plan does not authorize production deployment, changes to the live KhelGrid website, paid image subscriptions, paid APIs, database changes or third-party licensing purchases.
- Use the development repository and preview for integration first.
- Do not commit assets with unclear rights, private user images, unapproved logos or unlicensed stock previews.
- Do not claim that image work improves search ranking or guarantees AdSense approval. Images support usability and editorial quality; unique, useful, accurate page content and technical SEO remain separate requirements.
- Review the manifest when assets are replaced, retired, relicensed or reused in a new context.
- Before release, verify every public page uses the correct image or a neutral fallback and that no image creates a misleading impression.

## 12. Change history

| Date | Change |
|---|---|
| 2026-11-02 | Initial full-site image asset inventory, technical standards, provenance rules, priorities and acceptance checklist drafted. |
