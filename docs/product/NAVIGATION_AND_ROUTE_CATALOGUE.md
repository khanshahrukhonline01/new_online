# Navigation and Route Catalogue

**Status:** Proposed route catalogue based on the supplied KhelGrid navigation. **Not proof that routes currently work.**
**Source:** Project owner supplied URL list. Public URLs are references to the existing KhelGrid site, not implementation verification for this private project.
**Rule:** Treat each route as planned until the private app implements it and tests confirm it.

## 1. Compete

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| Search Trials and Opportunities | `/search` | Search and filter published opportunities | Shared search entry; do not duplicate opportunity data |
| Sports Calendar | `/calendar` | Date-oriented view of sourced sports events/trials | Define event vs opportunity data model |
| Live Trials | `/trials` | Current/open trial discovery | Filter opportunities by status/date; no separate duplicated listings |
| Opportunities | `/opportunities` | Full opportunity directory | Canonical directory |
| Events & tournaments | `/events` | Event/tournament directory | Also linked under Play & train; one canonical route |
| Verify | `/verify` | Verification guidance or submission/status workflow | Define what is actually verified; no unsupported guarantee |
| Talent Scanner | `/talent-scanner` | Athlete discovery/scouting tool | Requires consent, permissions, and privacy/security design before launch |
| Scout Portal | `/scout-portal` | Scout-facing workspace | Authentication/authorization needed for private features |

## 2. Play & train

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| Play · Find games | `/play` | Find recreational games/players | Community/user-generated content requires moderation and privacy design |
| Book venues | `/book` | Venue/court discovery and eventual booking | Directory and transactional booking must be distinguished |
| Train · Coaching | `/train` | Coaching discovery | Avoid duplicate coach records |
| Coaches | `/coaches` | Coach directory/detail pages | Define profile consent and verification rules |
| Memberships | `/memberships` | Membership information and eventual account entitlements | No paid entitlement until billing/access control exists |
| Events & tournaments | `/events` | Canonical event/tournament route | Duplicate navigation placement is intentional; do not build a second page |

## 3. Learn

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| Start From Zero | `/start-from-zero` | Beginner learning path | Content editorial/review requirements apply |
| AI Guide | `/ai-guide` | AI-assisted sports information | Requires approved LLM provider, source grounding, privacy controls and clear AI labelling |
| Guides | `/guides` | Guides index/detail pages | Avoid duplicate articles across content hubs |
| KhelChronicle | `/chronicle` | Editorial/news publication | Confirm canonical brand spelling and route; source/copyright rules apply |
| Blog | `/blog` | Blog index/detail pages | Define how it differs from Chronicle and Guides |
| Sports & Learning Hub | `/learning-hub` | Cross-topic learning hub | Curate links to canonical content rather than copying articles |
| Tools & calculators | `/tools` | Utility directory and tool pages | Define calculation logic, limits and test cases |
| Resources | `/resources` | Resource directory | Avoid duplicating Guides/Tools without clear taxonomy |

## 4. Grow

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| For Academies | `/academy` | Academy information/onboarding | Distinguish marketing pages from authenticated academy portal |
| Partner with Us | `/partner` | Partnership information/contact | Use verified contact details and a safe form backend |
| List Your Sports Venue | `/list-venue` | Venue submission/onboarding | Submission needs validation, moderation and explicit publication approval |
| Careers | `/careers` | Open roles and hiring information | Show only real, current roles |
| Pricing | `/pricing` | Plans and pricing | No invented prices; billing claims must match product capability |
| Community | `/community` | Community entry point | Requires moderation/privacy rules for interactive features |
| Cities | `/cities` | City directory and location discovery | Only list cities supported by real content |
| Mobile App | `/mobile-app` | App availability/download information | Do not claim app-store availability until verified |
| My Dashboard | `/dashboard` | User-specific dashboard | Must be private/noindex; requires authentication and server-side authorization |

## 5. Shared route rules

- Use one route definition and one canonical URL per resource. Multiple navigation links may point to the same route.
- Define page purpose, audience, public/private classification, source of truth, dependencies, states, SEO/indexability, acceptance criteria and owner before implementation.
- Public informational routes may be crawlable if useful and canonical. Dashboards, scout workspaces, private CVs, submissions and account routes must not expose private content or be indexed.
- Use redirects/canonical tags for aliases rather than duplicate pages. Query strings must not contain personal or confidential data.
- Navigation visibility is not authorization. Protected actions require backend/database authorization.
- Do not expose a route as “working” merely because a placeholder renders. Show clear planned/unavailable states until integrations are real.
- Keep the route catalogue aligned with `WEBSITE_PAGE_INVENTORY.md`, route definitions, sitemap and tests.

## 6. Route readiness checklist

For every route:
- [ ] Product purpose and owner approved.
- [ ] Public/private classification and authorization defined.
- [ ] Data source, provenance and publication rules defined.
- [ ] Loading, empty, unavailable, not-found and permission-denied states defined.
- [ ] Mobile, keyboard and accessibility checks defined.
- [ ] Metadata, canonical, sitemap and noindex behaviour defined.
- [ ] Tests cover success, failure and unauthorized access.
- [ ] External links, provider terms and privacy impact reviewed.
