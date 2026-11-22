# KhelGrid Sports Creator Campaign Marketplace

> **Status:** Product and architecture proposal — documentation only  
> **Date:** 2026-11-22  
> **Scope:** A sports-industry creator campaign marketplace inspired by the campaign workflow of Content Rewards. This document does not claim that the marketplace, analytics integrations, or payouts are implemented.

## 1. Product vision

KhelGrid will provide a two-sided campaign marketplace where sports organisations and businesses can commission social content, and eligible creators can discover campaigns, apply, publish agreed deliverables on their own social channels, submit evidence, and receive payment for approved work.

The product is designed for the Indian sports ecosystem: sports brands, academies, coaches, clubs, event organisers, venues, federations/associations where authorised, athletes, sports publishers, influencers, students, and sports fans.

This is not merely an affiliate-link programme and not a pay-per-view scheme. It is a managed creator-marketing marketplace with campaign briefs, creator selection, content deliverables, publication evidence, performance reporting, review, and a controlled reward/payment lifecycle.

**Product principle:** pay for compliant, contracted work and verified business outcomes—not for artificial engagement, purchased views, likes, followers, or subscribers.

## 2. Goals and non-goals

### Goals

- Let eligible sports businesses create and fund promotional campaigns.
- Let creators discover, apply to, and fulfil campaigns.
- Support existing KhelGrid accounts, including coaches and academies, without requiring duplicate accounts.
- Allow a verified organisation to hold more than one authorised workspace role (for example, an academy can be an advertiser and, separately, an approved creator/publisher).
- Provide campaign briefs, deliverables, deadlines, creative assets, disclosure instructions, and submission workflows.
- Record campaign budgets, commitments, approved rewards, adjustments, and payout status in an auditable ledger.
- Give campaign owners and KhelGrid administrators clear moderation, safety, and dispute controls.
- Provide reporting for reach, views, engagement, clicks, leads, and conversions where the relevant platform or partner provides trustworthy data and the required permissions exist.

### Non-goals for the initial release

- Buying, selling, guaranteeing, or incentivising artificial views, likes, followers, comments, watch time, or subscribers.
- Treating a submitted screenshot or self-reported metric as independently verified platform analytics.
- Building a general-purpose e-commerce checkout or holding merchant customer funds.
- Automatically paying creators before deliverables are accepted, funds are reconciled, and payout controls are approved.
- Making public claims that an integration can access analytics that the relevant social platform does not expose.
- Launching real payouts while KhelGrid's payment infrastructure is paused or without legal, tax, contractual, and operational readiness.

## 3. Marketplace participants and account model

The marketplace has two principal sides. A person or organisation may qualify for more than one role, but each role must be separately granted and audited.

### 3.1 Campaign owners / advertisers

- **Sports brands and retailers:** product launches, equipment education, brand storytelling, and approved product demonstrations.
- **Academies and training centres:** admissions, programmes, camps, coaching facilities, and open days.
- **Coaches:** coaching services, clinics, training content, and workshops.
- **Clubs and teams:** events, recruitment notices, community programmes, and match-day promotion.
- **Tournament and event organisers:** event awareness, registration, attendance, and sponsor activations.
- **Venue and facility operators:** facility awareness, programmes, and event promotion.
- **Federations and associations:** only campaigns submitted by an authorised representative and supported by verifiable authorisation.
- **KhelGrid:** platform-owned campaigns for verified opportunities, product education, editorial distribution, and community awareness.

Campaign-owner onboarding must capture legal/organisation identity as appropriate, an authorised contact, campaign purpose, funding source, and acceptance of campaign terms. Verification level must be visible to reviewers.

### 3.2 Creators / publishers

- Social-media creators and influencers.
- Athletes and players.
- Coaches and academy representatives.
- Students and sports enthusiasts.
- Clubs and community groups.
- Regional sports publishers and sports media pages.
- Other approved KhelGrid users with relevant audiences or production skills.

Creator profiles may contain channel URLs, platform, public handle, content category, language, region, audience description, portfolio examples, and verification status. Do not collect social passwords. Channel connection must use official OAuth/API flows only where available and justified.

### 3.3 Existing KhelGrid user roles

An existing registered user can apply to join as a creator or advertiser without creating a second account. A coach or academy can request advertiser capabilities to commission a campaign. It may separately apply for creator/publisher capabilities if it can deliver an eligible campaign brief. Role grants must not be automatic merely because a user has a coach or academy profile.

An organisation must not approve its own listing, campaign submission, deliverable, or reward. Conflicts of interest must be detected and routed to an independent reviewer.

## 4. Campaign lifecycle

1. **Draft:** advertiser creates a campaign brief and proposed budget.
2. **Submitted for review:** advertiser supplies identity/authority evidence, campaign details, claims, creative assets, target audience, and funding evidence.
3. **Moderation:** KhelGrid checks advertiser eligibility, campaign legitimacy, content rights, prohibited claims, disclosures, budget, and policy compliance.
4. **Approved / published:** eligible creators can discover the campaign and apply.
5. **Creator selection:** advertiser or authorised campaign manager selects creators under disclosed criteria. KhelGrid can moderate selection for safety and conflicts.
6. **Accepted:** creator accepts the brief, deliverables, deadline, usage rights, compensation, disclosure, and revision terms.
7. **In production:** creator prepares content. Pre-publication review is required where the campaign brief says so.
8. **Published / submitted:** creator publishes to the agreed channel and submits the canonical post URL and required evidence.
9. **Review:** campaign owner checks contractual deliverables; KhelGrid can review policy, rights, disclosures, and disputes.
10. **Accepted / revision requested / rejected:** every decision requires a reason and an audit event.
11. **Performance observation:** analytics are recorded with source, capture time, verification method, and limitations.
12. **Reward approved:** only after deliverables are accepted and budget/contract conditions are satisfied.
13. **Paid / closed:** payout reconciliation and final campaign closure are recorded. A campaign can be cancelled or disputed through explicit states and rules.

Suggested campaign states: `draft`, `submitted`, `under_review`, `changes_requested`, `approved`, `published`, `paused`, `cancelled`, `completed`, `rejected`.

Suggested creator application states: `applied`, `shortlisted`, `selected`, `declined`, `withdrawn`, `accepted`.

Suggested deliverable states: `not_started`, `in_progress`, `submitted`, `revision_requested`, `accepted`, `rejected`, `disputed`.

Suggested reward states: `not_eligible`, `pending_review`, `approved`, `on_hold`, `payable`, `paid`, `reversed`, `disputed`. State transitions must be server-authoritative and audited.

## 5. Campaign formats and compensation

Campaign owners select a compensation model in the approved brief. The model, amount, currency, deliverables, acceptance criteria, cancellation terms, revision limits, payment timing, and any performance bonus must be explicit before a creator accepts.

Supported models to consider:

- **Fixed fee per approved deliverable:** a defined fee for an accepted Reel, Short, post, story package, article, interview, or other agreed asset.
- **Fixed campaign package:** a fixed fee for a specified set of deliverables and publication dates.
- **Retainer:** a time-bounded recurring package with defined deliverables and review milestones.
- **Shared campaign pool:** a fixed, funded budget distributed according to pre-published deliverable/quality criteria, not raw engagement manipulation.
- **Qualified outcome bonus:** a bonus for a valid, attributable business outcome such as a verified enquiry, eligible registration, confirmed event attendance, or approved lead, subject to consent, deduplication, and fraud checks.
- **Affiliate commission (optional separate module):** a commission on a validated sale or booking reported by an approved merchant/partner. Affiliate conversion rules and reconciliation must remain distinct from creator deliverable compensation.

### View and engagement policy

Views, reach, watch time, likes, comments, shares, and follower counts may be shown as campaign analytics when supported by platform-provided data. They are not automatically payable units.

Do not implement a generic CPM payout that pays creators for generating YouTube views, likes, subscribers, or other artificial engagement. YouTube's fake-engagement policy prohibits artificially increasing metrics and incentivising such engagement. For every other social platform, confirm its current branded-content, paid-partnership, and engagement policies before enabling a campaign mechanic.

A campaign may use audience metrics as a non-payment selection or reporting signal, where lawful and platform-compliant. Any bonus must be tied to a legitimate contracted deliverable or validated business outcome, not an instruction to inflate platform engagement.

## 6. Campaign brief requirements

Every campaign must contain, at minimum:

- Campaign owner and verified authorised contact.
- Campaign title, purpose, category, location/region, language, and target audience.
- Description, key messages, prohibited claims, and required factual sources.
- Deliverable type, quantity, format, channel, length/dimensions where relevant, and publication window.
- Creator eligibility and selection criteria.
- Compensation model, total funded budget, per-creator amount or allocation formula, platform/transaction deductions if applicable, and payment conditions.
- Required sponsorship/advertising disclosure wording and placement.
- Content ownership, licence scope, duration, permitted edits, reposting/whitelisting terms, and third-party rights.
- Pre-approval requirement, revision allowance, submission URL/evidence, and acceptance criteria.
- Cancellation, non-delivery, refund, dispute, and late-submission terms.
- Data handling, consent, safeguarding, and age restrictions where applicable.

No campaign should go live with an unfunded or undefined reward promise. Campaign budgets must be funded or otherwise contractually secured before creator commitments are made.

## 7. Sports-industry use cases

- Academy promotes a new coaching batch, camp, open day, or programme.
- Coach commissions educational content about a training clinic or workshop.
- Sports brand commissions an authorised product demonstration or brand story.
- Tournament organiser promotes registration, schedule, or attendance.
- Venue operator promotes a facility or community event.
- Club commissions local community storytelling.
- KhelGrid commissions distribution of verified trials, scholarships, camps, and sports opportunities.
- Sports publisher commissions regional-language explainers or original editorial content.

For listings and opportunities on KhelGrid, campaigns must link to the canonical verified listing. Paid promotion must never imply that a listing is verified, endorsed, or guaranteed unless that status has been independently granted through KhelGrid's normal verification/moderation process.

## 8. Core product areas and proposed routes

Routes are proposals, not existing or implemented routes. Final route names must be reconciled with the current navigation registry and application architecture before implementation.

| Proposed route | Purpose |
|---|---|
| `/campaigns` | Public/eligible campaign marketplace |
| `/campaigns/:campaignId` | Campaign details and eligibility |
| `/campaigns/create` | Advertiser campaign creation |
| `/campaigns/manage` | Advertiser campaign management |
| `/creator` | Creator onboarding and workspace |
| `/creator/profile` | Creator profile and channels |
| `/creator/applications` | Applications and selection status |
| `/creator/submissions` | Deliverable and post-link submissions |
| `/creator/analytics` | Performance reporting and evidence |
| `/creator/rewards` | Reward ledger and statements |
| `/admin/campaigns` | Campaign moderation and administration |
| `/admin/creator-marketplace` | Creator/advertiser verification and oversight |

### Creator workspace

- Profile and channel portfolio.
- Campaign discovery, filters, eligibility, and applications.
- Brief, assets, disclosure instructions, deadlines, and deliverables.
- Submission links, evidence, review notes, and revision history.
- Performance metrics with source and verification labels.
- Reward ledger, downloadable statements, and payout status when enabled.
- Safety guidance, support, disputes, and account controls.

### Advertiser workspace

- Organisation profile and authorised users.
- Campaign creation wizard and budget planning.
- Campaign moderation status and requested changes.
- Creator discovery, applications, shortlist, selection, and communication.
- Deliverable review, revisions, acceptance, and disputes.
- Performance reports and final campaign reconciliation.
- Invoices/receipts and budget status where supported by the finance system.

### Admin Control Center

- Advertiser and creator identity/authority review.
- Campaign policy and claims review.
- Content rights and disclosure review.
- Campaign budget/funding verification.
- Creator selection conflict checks.
- Deliverable moderation and disputes.
- Fraud signals, duplicate submissions, suspicious traffic, and evidence review.
- Reward approvals, adjustments, holds, payout reconciliation, and immutable audit history.
- Emergency pause, campaign takedown, account restriction, and appeals.

## 9. Data model proposal (not a migration)

The following are conceptual entities only. Do not create production tables or apply migrations from this document alone. Schema design must be reviewed against the current Supabase schema, existing user/profile/organisation tables, listing moderation architecture, and RLS conventions before implementation.

- `campaign_organisations`: organisation profile, verification state, legal/authorised contact references.
- `campaign_memberships`: user-to-organisation membership, role, permissions, status.
- `creator_profiles`: creator application, profile, categories, languages, regions, verification.
- `creator_channels`: platform, public handle/URL, connection/verification method, scopes, status; never store social passwords or raw OAuth tokens in client-readable rows.
- `campaigns`: owner, brief, category, geography, language, status, schedule, compensation model, budget, policy version.
- `campaign_deliverables`: deliverable specification, acceptance criteria, quantity, deadlines, rights and disclosure requirements.
- `campaign_applications`: creator application, status, proposal, selection decision.
- `campaign_assignments`: accepted creator commitment, agreed deliverables, fee, schedule, terms snapshot.
- `campaign_assets`: approved creative files, rights metadata, source, expiry, and permitted usage.
- `content_submissions`: canonical post URL, evidence references, submitted metadata, review status, reviewer and reason.
- `campaign_metrics_snapshots`: metric name/value, platform, source, captured time, verification method, evidence reference, and confidence/limitations.
- `campaign_conversions`: eligible attributed outcomes, deduplication key, consent/attribution metadata, validation status.
- `campaign_budgets`: funded/secured budget, commitments, reserve, spend, refunds, and reconciliation references.
- `creator_reward_ledger`: append-only reward entries, adjustments, holds, reversals, approvals, and payout references.
- `campaign_disputes`: issue category, evidence, resolution, appeal and timestamps.
- `campaign_audit_events`: actor, action, entity, before/after summary, reason, timestamp, and request/correlation ID.

Financial ledger entries must be append-only from application workflows. Corrections should be compensating entries, not silent edits/deletes. All amounts must use integer minor units (paise for INR) and an explicit currency. Never use floating-point arithmetic for money.

## 10. Security, permissions, and trust boundaries

- All campaign creation, approval, selection, acceptance, reward calculation, reward state changes, and payout actions must be server-authoritative.
- Use least-privilege RLS. Public/anonymous users must not read private campaign applications, organisation documents, creator personal data, private evidence, financial ledgers, or moderation notes.
- Advertiser members may access only campaigns belonging to their organisation and only within their granted role.
- Creators may access only their own private applications, assignments, submissions, evidence, and reward records.
- Campaign owners must not approve their own campaign, deliverables, reward, or dispute outcome where conflict of interest exists.
- Moderators and finance approvers must have distinct, auditable permissions. High-risk financial actions should require separation of duties.
- Never trust client-supplied role, organisation ID, campaign status, metrics, commission, amount, payment status, or creator identity.
- Use signed, expiring upload URLs or controlled storage policies for private evidence. Validate URL schemes and canonical platform domains for submitted posts.
- Protect against self-referrals, duplicate leads, repeated conversion callbacks, replay attacks, fabricated screenshots, bot traffic, collusion, and budget overspend.
- Rate-limit application, submission, referral, and conversion endpoints. Use idempotency keys for external callbacks and reward operations.
- Maintain audit logs for moderation and finance actions. Avoid storing unnecessary personal data.
- Apply additional safeguards for minors: no direct marketing to minors without appropriate review, guardian/consent requirements where applicable, and age-appropriate campaign restrictions.

## 11. Social platform analytics and integrations

Do not assume a universal API can verify all creator metrics.

- Use official platform APIs and OAuth permissions only where available, permitted, and approved.
- Record the platform, endpoint/source, connected account identity, granted scopes, capture time, metric definition, and verification method.
- YouTube Analytics access requires an authorised channel owner/manager flow and eligible API permissions. A post URL alone does not grant private analytics access.
- Meta/Instagram analytics availability depends on account type, permissions, app review, and current API rules. Do not promise personal-account analytics if unsupported.
- Where official analytics are unavailable, label creator-submitted screenshots or exports as **self-reported evidence**, not verified analytics; apply manual review and confidence labels.
- Respect platform terms, rate limits, privacy, data minimisation, branded-content rules, and content licensing.
- Store only the metrics needed for campaign evaluation, with defined retention periods.

## 12. Legal, advertising, and content policy

Before launch, obtain qualified Indian legal, tax, and operational review of advertiser terms, creator agreements, invoices, TDS/GST treatment where applicable, consumer protection, privacy/data protection, minors/safeguarding, and dispute/refund handling.

- Sponsored content must have clear, prominent disclosures (for example, `Ad`, `Sponsored`, or `Affiliate`, as appropriate under current ASCI/platform requirements).
- Do not publish deceptive endorsements, undisclosed paid promotions, fake testimonials, fabricated results, false selection guarantees, or unsupported health/performance claims.
- Creators must have rights to all footage, music, images, logos, athlete likenesses, and other assets used.
- Campaign owners must provide evidence for factual claims and confirm rights to supplied assets.
- Clearly separate editorial coverage from paid promotion. KhelGrid editorial independence and corrections policy must not be overridden by advertiser spend.
- Provide reporting, complaint, takedown, correction, and appeal processes.
- Keep campaign content and opportunity details truthful; no fake trials, venues, prices, ratings, availability, organisers, or outcomes.

## 13. Monetisation model

Potential KhelGrid revenue streams, subject to commercial validation:

- A disclosed marketplace/service fee on completed, approved campaign spend.
- Advertiser campaign setup or managed-service fees.
- Optional creator discovery or campaign-management services for businesses.
- Separately governed affiliate commissions on verified purchases/bookings.
- Sponsorship packages and larger sports-brand campaigns.

Do not set a fixed platform take rate in code until pricing, taxes, payment costs, refunds, support costs, and campaign economics are validated. Advertiser budgets and creator compensation must be shown transparently.

## 14. Launch and implementation phases

All phases below are planning milestones. No database migration, payment deployment, public route, or production change is authorised by this document.

### Phase 0 — Product policy and feasibility
- Confirm campaign categories, participant eligibility, prohibited sectors/claims, disclosure policy, compensation models, cancellation/refund rules, and minors policy.
- Validate current social-platform API and branded-content constraints.
- Review legal/tax requirements and campaign contract templates.
- Map existing user, coach, academy, organisation, listing, moderation, and admin entities.

### Phase 1 — Read-only architecture and threat model
- Audit repository routes, navigation, Supabase schema, RLS, admin roles, and existing moderation patterns.
- Produce an entity relationship diagram, permission matrix, threat model, and data-retention plan.
- Resolve role conflicts and organisation ownership rules.
- No schema or application changes in this phase.

### Phase 2 — Marketplace foundations (no payments)
- Creator and advertiser applications, role grants, organisation memberships, campaign drafts, moderation, and campaign discovery.
- Implement server-side authorization and RLS tests before UI exposure.
- Keep all campaign budgets and rewards as clearly labelled test/simulation data only.

### Phase 3 — Applications and content workflow
- Creator discovery/application, advertiser selection, assignment terms snapshot, campaign assets, content submission, revisions, approvals, disputes, and audit history.
- Validate rights and disclosures before publication or acceptance.

### Phase 4 — Analytics and attribution
- Integrate only approved official APIs where technically and contractually possible.
- Add source labels, manual-evidence workflow, conversion attribution, deduplication, fraud checks, and retention controls.
- Treat reach/views as analytics unless a reviewed, platform-compliant compensation mechanic is approved.

### Phase 5 — Financial controls (still no live payout)
- Design append-only reward ledger, budget reservations, reconciliation, adjustments, refunds, payout approvals, and separation of duties.
- Test with synthetic data; do not use real credentials or transactions.
- Obtain finance/legal/security sign-off.

### Phase 6 — Controlled pilot
- Pilot with a small number of verified academies, sports brands, event organisers, and creators.
- Use signed agreements and funded budgets.
- Manually reconcile deliverables and payments until automated controls are proven.
- Measure campaign completion, advertiser repeat rate, creator satisfaction, qualified outcomes, disputes, fraud, and unit economics.

### Phase 7 — Gradual scale
- Expand sports, regions, languages, partners, and creator discovery only after pilot gates pass.
- Add automation and integrations incrementally.
- Reassess policies and platform API requirements periodically.

## 15. Release gates and acceptance criteria

The marketplace is not launch-ready until all applicable checks pass:

- Advertiser and creator role grants are reviewed and revocable.
- Organisation membership and tenant isolation tests pass.
- Anonymous, ordinary user, creator, advertiser, moderator, finance approver, and super-admin access tests pass.
- Users cannot read or mutate another organisation's campaigns or another creator's private data.
- Campaign and deliverable status transitions reject unauthorised or invalid transitions.
- A campaign cannot publish or accept creator commitments without approved terms and a funded/secured budget.
- A creator cannot approve their own deliverable or reward.
- Metrics show their provenance and cannot be client-forged into verified status.
- Duplicate callbacks and conversion submissions are idempotently handled.
- Ledger corrections are auditable and money uses integer minor units.
- Payout actions are unavailable until separate financial approval and integration readiness.
- Disclosure, copyright, safeguarding, privacy, and complaint workflows are documented and tested.
- Accessibility, mobile layouts, localization, observability, backup/recovery, and support procedures are reviewed.
- CI, typecheck, lint, unit/integration tests, build, and protected-preview browser acceptance tests pass.

## 16. Relationship to existing KhelGrid modules

- **Unified listing submission:** remains the route for submitting venues, coaches, academies, trials, and other catalogue listings. A campaign is not a listing and does not bypass listing moderation.
- **Admin Control Center:** governs campaign moderation, organisation/creator verification, disputes, and finance approvals through explicit permissions.
- **Creator campaign marketplace:** manages paid promotional work and content deliverables.
- **Affiliate module:** may later handle merchant product/service referrals and validated sales commissions; keep its attribution and ledger rules separate from campaign fees.
- **KhelChronicle/editorial:** paid campaigns must not buy editorial conclusions, research outcomes, or favourable coverage.
- **Payments:** no live payment collection or creator payout is enabled by this proposal. Existing payment work remains paused until separately authorised.

## 17. External reference

The product workflow is inspired by the public-facing campaign marketplace concept demonstrated by [Content Rewards](https://contentrewards.com/). KhelGrid's implementation must be independently designed for sports-industry workflows, Indian operating requirements, platform policies, and KhelGrid's existing security architecture. This reference is for product inspiration, not an endorsement, integration, or claim of feature parity.

Useful policy references to re-check before implementation:
- [YouTube fake engagement policy](https://support.google.com/youtube/answer/3399767)
- [YouTube paid product placements and endorsements](https://support.google.com/youtube/answer/154235)
- [ASCI Guidelines for Influencer Advertising](https://www.ascionline.in/)
- [Meta branded content policies and tools](https://transparency.meta.com/policies/)
