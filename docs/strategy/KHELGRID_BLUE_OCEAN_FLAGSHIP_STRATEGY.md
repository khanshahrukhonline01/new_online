# KhelGrid Blue Ocean Flagship Strategy
## India-first business strategy, proprietary product specification, architecture, validation and roadmap

**Status:** Strategic baseline; validate through pilots before treating assumptions as proven  
**Category:** Sports Opportunity Infrastructure  
**Flagship:** Sports Passport + Opportunity Graph + Open Challenge Network + Outcome Engine  
**Repository:** khelgrid-dotcom/khelgrid-platform  
**Scope:** Development platform only. This document does not authorise changes to the production website, DNS, production database or live payment collection.

---

## 1. Executive decision

KhelGrid will pursue an India-first strategy to build **Sports Opportunity Infrastructure**: a neutral, evidence-led network that helps athletes discover legitimate opportunities, understand eligibility, participate, retain portable evidence and document what happened next.

KhelGrid should not attempt to replace government identity, athlete registration, federation governance or official competition systems. It should complement the wider ecosystem by connecting the fragmented journey between opportunity discovery and real-world participation outcomes.

The flagship is one connected system:

1. **KhelGrid Sports Passport** — an athlete-controlled, portable record of sports participation, qualifications and evidence.
2. **KhelGrid Opportunity Graph** — structured relationships connecting athletes, sports, opportunities, organisers, venues, coaches, academies, challenges and outcomes.
3. **KhelGrid Open Challenge Network** — a distributed network of independently operated grassroots challenges with transparent rules, host responsibilities and documented participation.
4. **KhelGrid Outcome Engine** — a shared lifecycle and evidence protocol connecting publication, eligibility, application, participation and outcomes.

The distinctive mechanism is the **KhelGrid Opportunity Lifecycle Protocol (KOLP)**. It standardises how an opportunity is sourced, reviewed, published, acted upon, attended and followed through. The long-term moat should come from trusted partner operations, consistent evidence provenance, repeat participation, local distribution and privacy-safe longitudinal insight—not from locking athletes into the platform.

### Strategic ambition

Build a defensible leadership position in India through value, trust, partner density and execution. “Monopoly” is used here only colloquially to mean a strong competitive moat and category leadership. KhelGrid must compete lawfully, support data portability and interoperability, and never use exclusionary or deceptive practices.

### Non-negotiable principles

- No fabricated opportunities, athletes, partners, fees, results, ratings, availability or verification claims.
- A listing approved for publication is not automatically verified in every respect.
- An application is not proof of attendance; attendance is not proof of selection or achievement.
- Athlete data is private by default and controlled by the athlete, subject to lawful safeguarding and retention requirements.
- Do not sell personal athlete data or charge for a favourable verification outcome.
- Do not imply government, federation or institutional recognition without explicit evidence.
- Do not activate real payments, booking confirmations or public account functionality until their separate safeguards are complete.
- Preserve the existing production website and its data boundary.
- Prefer an incremental modular monolith over a rewrite, microservices or expensive infrastructure.

---

## 2. Market position and Blue Ocean strategy

### 2.1 Market boundary

The sports ecosystem includes government sports programmes and registries, federations, event organisers, academies, coaches, venues, sponsors, schools, athletes and families. Government and institutional systems may own official registration, governance, sanctioned competition and formal results. KhelGrid should not duplicate those functions where it has no mandate.

KhelGrid's proposed position is the **connection and accountability layer** between discovery and documented participation:

- What opportunities exist?
- Who is eligible?
- Who is responsible for the opportunity?
- What source supports the listing?
- What must the athlete do?
- Did participation happen?
- What evidence can the athlete retain?
- What next step is available?

The strategy is complementary to government and federation systems. Any integration must be authorised, technically supported and consistent with relevant data-sharing terms.

### 2.2 Category definition

**Sports Opportunity Infrastructure** is the set of interoperable workflows, records and partner operations that connect athletes to legitimate sporting opportunities and document participation and outcomes.

KhelGrid positioning:

> KhelGrid helps athletes discover legitimate sports opportunities, participate through trusted local networks and build an evidence-backed record of progress.

Potential product promise:

> Discover. Participate. Prove. Progress.

These statements describe the intended product direction, not a claim that every capability is currently live.

### 2.3 ERRC framework

**Eliminate**
- Fake or unsubstantiated verification badges.
- Unsupported selection, ranking and success-rate claims.
- Public athlete profiles as a default.
- Unnecessary duplication of official identity systems.
- Listings without a source, responsible organiser or meaningful expiry process.

**Reduce**
- Dependence on static, manually curated directories.
- Unnecessary athlete onboarding fields.
- Manual partner follow-up through disconnected spreadsheets and messaging.
- Premature use of AI, blockchain, microservices or paid infrastructure.

**Raise**
- Source traceability and freshness.
- Eligibility, fee, location and deadline clarity.
- Evidence provenance and dispute resolution.
- Athlete privacy, consent and portability.
- Partner accountability after an opportunity is published.
- Local partner operating quality and repeat participation.

**Create**
- Athlete-controlled Sports Passport.
- Structured Opportunity Graph.
- Distributed Open Challenge Network.
- Opportunity-to-outcome lifecycle protocol.
- Privacy-protective grassroots participation intelligence.

### 2.4 Strategic canvas hypothesis

This is a hypothesis for customer discovery, not a verified scorecard of all competitors.

| Factor | Generic directories | Registration systems | Social sports apps | KhelGrid target |
|---|---|---|---|---|
| Opportunity discovery | Often strong | Variable | Variable | Strong |
| Source and eligibility transparency | Variable | Institutional scope | Variable | Very high |
| Portable athlete evidence | Variable | Often system-specific | Usually limited | High |
| Local open challenges | Variable | Programme-dependent | Variable | High |
| Participation-to-outcome tracking | Often limited | Institutional scope | Variable | Very high |
| Independent local partner network | Variable | Institutional | Variable | Very high |
| Research and ecosystem intelligence | Variable | Governance focus | Variable | High |

Validate this canvas through interviews, competitor testing and partner workflow observation. Do not present it as an independently researched market ranking.

### 2.5 Defensibility and network effects

The moat should accumulate from:
1. Consistent lifecycle data with clear definitions.
2. Trusted organiser, host and evaluator relationships.
3. Challenge templates and operating standards.
4. Evidence provenance, review and dispute history.
5. Local partner distribution.
6. Athlete-controlled records useful across multiple opportunities.
7. Repeat partner and athlete behaviour.
8. Privacy-safe, aggregated longitudinal research.

Do not create artificial lock-in. Athletes should be able to export their records. Defensibility comes from network usefulness, trust and execution.

---

## 3. Product system specification

### 3.1 KhelGrid Sports Passport

**Purpose:** An athlete-controlled, portable record of sporting participation, experience, qualifications, results and supporting evidence.

It is not a government identity, official licence, selection certificate or public ranking.

**Core capabilities**
- Athlete profile with minimum necessary fields, sports and broad location.
- Sports history: participation, training, competitions, qualifications and achievements.
- Evidence vault for certificates, result sheets, organiser confirmations and permitted media.
- Provenance: source/issuer, date, evidence type, review state and reviewer where applicable.
- Visibility controls: private by default, selected-record sharing and revocable links.
- PDF portfolio export and machine-readable JSON export.
- Correction, dispute, withdrawal and deletion request workflows.
- Opportunity and challenge history.

**Evidence classes**

| Class | Definition | Example |
|---|---|---|
| Self-declared | Entered by athlete; not independently checked | Personal best entered by athlete |
| Document-supported | Document supplied; authenticity not necessarily confirmed | Uploaded certificate |
| Issuer-confirmed | Issuer or organiser confirmed the record | Organiser confirmation |
| Official-source linked | Supported by a relevant authoritative public source | Federation result page |
| Disputed | A person has challenged the record | Challenged certificate |
| Withdrawn/expired | No longer active or relied upon | Withdrawn issuer confirmation |

Never compress these into one generic “verified” badge. Display what was checked, by whom, when and against which source.

**MVP acceptance criteria**
- Athlete can create a private draft Passport.
- Athlete can add, view and remove permitted evidence.
- Each evidence record has type, date, source/issuer and review state.
- Other athletes cannot access private records.
- Share grants are scoped, expiring and revocable.
- Athlete can export records.
- Public opportunity discovery does not require government identity documents.
- Sensitive documents are never exposed through public catalogue endpoints.

### 3.2 KhelGrid Opportunity Graph

**Purpose:** Connect athletes to actionable opportunities and connect legitimate organisers to relevant participants. It begins as a relational graph in PostgreSQL; a separate graph database is not required for the MVP.

**Core entities:** Athlete; sport and discipline; opportunity; organiser and organisation; venue/facility; academy and coach; competition/event; challenge; evidence record; participation and outcome; location/travel region.

**Relationship examples**
- Athlete is interested in sport.
- Opportunity is organised by organisation.
- Opportunity takes place at venue.
- Opportunity has eligibility conditions.
- Athlete saved/applied/attended opportunity.
- Evidence supports participation or achievement.
- Challenge is hosted by a partner location.
- Outcome follows participation.

**Matching logic:** Start deterministic and explainable. Match using sport/discipline, explicit age/category eligibility, location/travel range, dates/deadline, explicitly required level/experience, known fees/equipment, supplied accessibility details, and source quality/freshness. Explain results, e.g. “Matches your sport and age category” or “Travel distance may be high.” Do not generate invented selection probabilities or opaque talent scores.

**MVP acceptance criteria**
- Structured opportunity catalogue and filters.
- Clear eligibility checklist.
- Source link, last-checked date and expiry.
- Save/share and contact/application route.
- Suspicious/outdated listing report.
- Explainable matching reasons.
- Opening an external application link is not proof of submission.

### 3.3 KhelGrid Open Challenge Network

**Purpose:** A distributed network of independently operated grassroots sporting challenges. A KhelGrid challenge is not automatically an official government or federation trial.

**Challenge types**
- Open participation challenge.
- Skill challenge with published measurement rules.
- Local competition with published rules and results.
- Repeatable development benchmark.
- Inclusion-focused challenge with explicit accessibility design.

**Required challenge fields**
- Unique challenge ID and version.
- Sport, discipline and format.
- Organiser, host and location.
- Eligibility and age/category rules.
- Date, time and registration deadline.
- Fee or explicit “not supplied”.
- Rules, measurement protocol and equipment.
- Safety and accessibility information.
- Evaluator role and conflict declaration.
- Evidence requirements and results-publication policy.
- Complaint/correction contact.
- Cancellation, postponement and refund terms where applicable.

**Challenge lifecycle**

    draft → submitted → organiser_reviewed → safety_reviewed → published
          → registration_open → in_progress → completed
          → outcome_reporting → archived

A challenge may be paused or withdrawn. Publishing requires applicable organiser, listing and safety reviews. Record reviewer, reason and timestamp.

**Trust requirements**
- A partner is not automatically accredited.
- A challenge is not an official selection trial without confirmation from the relevant authority.
- Evaluator role and conflicts must be disclosed.
- Fees and conditions must be disclosed before registration.
- Results distinguish organiser-reported from independently confirmed information.
- Child-focused programmes require age-appropriate consent, safeguarding, privacy and supervision controls before launch.

### 3.4 KhelGrid Outcome Engine

The shared lifecycle connects opportunity publication to documented participation and outcomes.

| State | Meaning | Evidence/actor |
|---|---|---|
| published | Opportunity passed publication review | Source and review record |
| interested | Athlete expressed interest | Athlete action |
| application_started | Application route initiated/opened | Recorded action; not proof of submission |
| application_confirmed | Organiser acknowledged application | Organiser or authorised integration |
| attendance_claimed | Participant reports attendance | Participant claim |
| attendance_confirmed | Participation confirmed | Organiser/evaluator evidence |
| outcome_submitted | Outcome supplied | Supporting evidence |
| outcome_reviewed | Evidence reviewed | Reviewer decision and audit |
| disputed | Record challenged | Dispute case |
| withdrawn | Record withdrawn | Actor, reason and timestamp |

Never automatically promote one state to a stronger state without required evidence.

### 3.5 Supporting capabilities

| Capability | Role | Priority |
|---|---|---|
| Trust Engine | Source review, organiser checks, evidence review, disputes and audit | Foundation |
| Partner Desk | Organisation, host and evaluator workflows | Pilot |
| KhelGrid Intelligence | Privacy-protective aggregate insights | After reliable data exists |
| KhelChronicle | Research and methodology-led editorial layer | Parallel, evidence-led |
| Resource Exchange | Facility slots, equipment and community resources | Later |
| Athlete Funding Exchange | Grants, sponsors and equipment support | Later; compliance review required |

Do not launch these as disconnected products. Reuse the same entities, consent, evidence and lifecycle foundations.

---

## 4. Business model and customers

### 4.1 Customer segments

| Segment | Job to be done | KhelGrid value |
|---|---|---|
| Athletes and parents | Find legitimate opportunities and retain proof of progress | Free discovery and basic Passport |
| Coaches and academies | Reach suitable athletes and communicate programme details | Partner profile, publishing and reporting |
| Organisers | Publish structured opportunities and report participation | Partner Desk and challenge workflows |
| Venues | Reach organisers and athletes; publish accurate details | Discovery and later resource tools |
| Sponsors/CSR programmes | Support measurable grassroots participation | Sponsored challenges and transparent reports |
| Institutions/researchers | Understand participation and access gaps | Aggregated, privacy-safe insights |

### 4.2 Revenue hypotheses

Keep basic athlete discovery and Passport functionality free during early adoption.

Potential revenue:
1. Organisation subscriptions for advanced publishing, partner workflow and analytics.
2. Challenge operations tools/services with transparent scope and pricing.
3. Sponsor-funded open challenges with transparent criteria and reporting.
4. Institutional research and aggregate intelligence engagements.
5. Future facility-management or resource-exchange services.
6. Clearly labelled research sponsorships that do not influence editorial conclusions.

Do not sell personal athlete data. Do not charge for favourable verification, guaranteed selection or official recognition. Paid promotion must be labelled and must not override trust or eligibility.

### 4.3 Pricing validation

Do not publish invented prices. Interview organisations about current costs, willingness to pay and procurement constraints. Test transparent pricing packages only after the partner workflow demonstrates repeat value.

### 4.4 Business model decision gates

- Is the partner workflow used repeatedly?
- Does it reduce organiser effort or improve participation quality?
- Will an organisation pay for operational value?
- Can sponsor reporting happen without exposing personal athlete data?
- Is there enough reliable data for aggregate reports?
- Can the service operate sustainably within support and moderation costs?

---

## 5. Technical architecture for the existing repository

### 5.1 Architecture decision

Extend the existing React + TypeScript + Vite + Supabase application as a **modular monolith**. Do not rewrite the platform or introduce microservices for the initial product.

The repository README identifies the project as a development rebuild separate from production, with Supabase Free Plan target, GitHub Actions CI and Vercel preview deployment. Existing catalogue and route foundations include sports, opportunities, venues, academies, coaches, calendar, moderation, dashboard and KhelChronicle. Route presence must not be treated as proof that a backend capability is complete.

### 5.2 Logical architecture

    Athlete / Parent ─┐
    Organiser / Coach ├─ React + TypeScript + Vite
    Partner / Evaluator┘            │
                            Typed Domain Services
                                    │
                         Supabase Auth (when approved)
                                    │
                         PostgreSQL / Supabase
                           ┌────────┼─────────┐
                         Trust   Passport   Opportunity
                           │        │          Graph
                         Challenge Engine     │
                           └────────┬──────────┘
                              Outcome Engine
                                    │
                         Privacy-safe Intelligence
                                    │
                              KhelChronicle

### 5.3 Existing-platform mapping

| New capability | Existing area to inspect/extend |
|---|---|
| Opportunity Graph | Opportunities, sports, venues, search, calendar |
| Sports Passport | Athlete profile, dashboard, evidence and account foundations |
| Open Challenge Network | Opportunities, events, venues, moderation |
| Outcome Engine | Participation, notifications, moderation and audit |
| Trust Engine | Listing moderation and verification foundations |
| Partner Desk | Academies, coaches, venues and organisation membership |
| Intelligence | KhelChronicle and analytics foundations |

Before migrations, inspect actual schema, constraints, triggers, RLS, storage policies and tests. Reuse canonical tables where appropriate; do not duplicate an entity simply because a new feature has a new name.

### 5.4 Logical data model

This is a target domain model, not an instruction to create duplicate tables.

| Domain | Proposed entities | Important data |
|---|---|---|
| Identity | profiles, organisations, organisation_members | owner, role, status, consent |
| Passport | athlete_profiles, athlete_sports, athlete_records | athlete, sport, record type, visibility |
| Evidence | evidence_items, evidence_reviews, evidence_sources | object path, issuer, source URL, review |
| Opportunities | existing opportunities, opportunity_eligibility, opportunity_sources | organiser, source, dates, location, rules |
| Relationships | athlete_opportunities, saved_opportunities | athlete, opportunity, action, timestamp |
| Challenges | challenge_templates, challenges, challenge_rules | version, host, date, format, status |
| Participation | challenge_registrations, participation_records | participant, challenge, attendance evidence |
| Outcomes | outcome_records, outcome_evidence, outcome_events | outcome type, source, reviewer, event time |
| Trust | verification_cases, reports, disputes, audit_events | subject, decision, reason, reviewer |
| Privacy | consent_records, sharing_grants, data_requests | purpose, scope, expiry, revocation |
| Matching | athlete_preferences, match_explanations | preferences and reasons |

**Data design rules**
- UUID primary keys and explicit foreign keys.
- Timestamps for creation, update, publication, review and expiry where relevant.
- Evidence and verification separate from the underlying claim.
- Immutable or append-only audit/event history for important transitions.
- Controlled status values, not arbitrary free text.
- Version challenge rules and eligibility criteria.
- Explicit timezone handling; retain organiser local timezone for display.
- Do not collect Aadhaar or other government identifiers by default.
- Private evidence must never be exposed through public catalogue queries.
- Use one canonical relationship for athlete, opportunity, challenge and outcome.

### 5.5 Domain service boundaries

Keep services inside the existing application initially:
- opportunityService: source, create, review, publish, expire.
- eligibilityService: validate criteria and explain matches.
- passportService: create, update, export and share Passport.
- evidenceService: upload, classify, review, dispute and revoke.
- challengeService: create, version, publish and close challenges.
- participationService: register, claim attendance and confirm participation.
- outcomeService: submit, review, dispute and report outcomes.
- trustService: review organisers, sources and evidence.
- consentService: grant, record, expire and revoke permission.
- partnerService: organisation membership and role management.
- intelligenceService: privacy-safe aggregate measures.

Use typed domain models and runtime input validation. UI components must not directly perform privileged state transitions.

### 5.6 Security and privacy

Security and privacy are product requirements, not a later enhancement.

- Enable RLS on every exposed table.
- Authorise using ownership and organisation membership, not merely authenticated status.
- Keep service-role keys server-side.
- Use private storage for athlete evidence.
- Scope storage access to the relevant athlete/authorised reviewer.
- Treat privileged functions and views as security boundaries.
- Avoid SECURITY DEFINER as a shortcut for permission failures.
- Test allowed and denied access paths.
- Record consent by purpose, scope, actor and timestamp.
- Support revocation, correction and appropriate deletion/retention workflows.
- Avoid public display of precise location, contact information or sensitive athlete documents.
- Do not allow unmoderated adult-to-child direct messaging.
- Design age-aware access controls and parent/guardian consent before child-focused public features.
- Obtain qualified Indian legal review for applicable data protection, child safety, consumer, event, payment and intermediary obligations before launch.

The DPDP Act/Rules and commencement provisions must be checked against official current notifications at implementation time. This document is an engineering strategy, not legal advice.

### 5.7 Free-tier and scale controls

- Start with PostgreSQL relational modelling; no separate graph database.
- Enforce evidence upload size/type limits.
- Prefer issuer links where sufficient.
- Avoid duplicate file storage.
- Paginate catalogues and audit views.
- Index foreign keys and common status/date/sport/location filters.
- Measure storage, database and bandwidth consumption.
- Use batch processing only where supported and justified.
- Do not add blockchain, vector search or expensive AI scoring without a validated need.
- Document quota thresholds and an upgrade decision before growth threatens reliability.

### 5.8 Migration and release safety

- Inspect existing migrations and canonical table names first.
- Confirm whether a table/column/policy already exists.
- Use timestamped migrations and the established repository convention.
- Prefer additive, transactional changes.
- Do not use DROP or TRUNCATE in ordinary feature migrations.
- Add grants and RLS in the same migration as new exposed tables.
- Add positive and negative permission tests.
- Add lifecycle integration tests and realistic fixtures.
- Run typecheck, lint, unit tests, SQL tests and build.
- Verify the intended development database before applying migrations.
- Do not target production or an unidentified database.
- A successful migration file commit is not proof it has been applied to the correct database.

---

## 6. Validation and pilot plan

A Blue Ocean position is a hypothesis until customer behaviour confirms it. Validate real workflows, not stated enthusiasm.

### 6.1 First 30-day discovery

Target interviews (planning sample, not statistically representative):

| Segment | Target | Research focus |
|---|---:|---|
| Athletes/parents | 25 | Discovery, trust, eligibility, evidence and repeat use |
| Coaches/academies | 15 | Athlete reach, programme publishing and proof of progress |
| Organisers/event hosts | 15 | Recruitment, attendance, reporting and operational friction |
| Venues/institutional partners | 10 | Access, utilisation, local programming and partner value |

Ask about the last real opportunity discovered, source, trust checks, application process, attendance, evidence received, costs and problems. Observe current workflows where possible. Avoid relying on “Would you use this app?” questions.

### 6.2 Pilot design

Start with one city cluster, two or three sports and a small number of real partners. Delhi NCR may be considered as a candidate, but final selection should depend on partner access and willingness to participate.

Suggested pilot composition:
- 5–8 genuine organisers, academies or host partners.
- 2–3 sports.
- 2–3 challenge formats.
- 100–200 consenting adult participants initially.
- One independent process for disputed evidence.
- Manual partner operations before automation.

Do not add a child-focused pilot until safeguarding, consent, privacy and legal controls are ready.

### 6.3 Hypotheses and pass signals

| Hypothesis | Experiment | Pass signal |
|---|---|---|
| Athletes value portable evidence | Help participants create/export a Passport | They complete it and reuse it after pilot |
| Organisers value lifecycle reporting | Give partners a simple publishing/outcome workflow | Partners report outcomes without repeated chasing |
| Challenges create local distribution | Run repeatable partner-hosted challenges | Hosts repeat and participants return |
| Matching improves discovery | Compare filtered results with current discovery method | Athletes find relevant opportunities with less effort |
| Partners will pay | Test transparent paid workflow proposals after use | Real willingness to pay, not just positive feedback |

### 6.4 North Star metric

**Evidence-backed participation outcomes:** distinct athlete-opportunity participations with evidence meeting the published confirmation standard over a rolling 90-day period.

Supporting measures:
- Source completeness.
- Eligibility completeness.
- Opportunity freshness and expiry compliance.
- Application-to-attendance conversion, where observable.
- Attendance confirmation rate.
- Outcome documentation rate.
- Repeat partner rate.
- Repeat athlete participation.
- Dispute rate and resolution time.
- Privacy and safeguarding incidents.

Do not use profile registrations, page views or listing counts as substitutes for sporting impact.

### 6.5 Initial 90-day pilot thresholds

These are proposed go/no-go targets, not current KhelGrid performance:

| Measure | Target |
|---|---:|
| Genuine pilot organisations | 5–8 |
| Published opportunities with source and last-checked date | 100% |
| Published opportunities with eligibility information | At least 90% |
| Challenges with published rules and safety information | 100% |
| Completed challenges with organiser report | At least 80% |
| Participation records with defined evidence class | 100% |
| Partners willing to repeat workflow | At least 60% |
| Serious unresolved privacy/safeguarding incidents | 0 |

Stop or redesign if partners will not report outcomes, athletes do not value evidence portability, or confirmation costs make the model unsustainable.

### 6.6 Manual-first experiment

Before building all modules:
1. Publish 10–20 genuine sourced opportunities.
2. Invite a small group of consenting adult athletes.
3. Use a lightweight Passport prototype.
4. Run one partner-hosted challenge with published rules.
5. Record applications, participation and outcomes manually.
6. Ask participants and partners to reuse the records.
7. Measure repeat behaviour, effort, trust and willingness to pay.

---

## 7. Eighteen-month implementation roadmap

All targets are planning hypotheses and must be reset after the pilot.

| Phase | Timing | Main deliverables | Exit gate |
|---|---|---|---|
| 0. Foundation and validation | Months 1–2 | Repository/schema/RLS audit, interviews, KOLP, data standards, pilot partner selection | Validated problem, initial partner commitments and reviewed domain model |
| 1. Trust and opportunity foundation | Months 3–4 | Source/freshness, organiser/listing trust, eligibility, reports, corrections and audit | Real opportunities safely reviewed, published and corrected |
| 2. Passport MVP | Months 5–6 | Athlete record, private evidence, evidence classes, sharing/revocation, PDF/JSON export | Athlete controls a useful portable evidence record |
| 3. Opportunity Graph MVP | Months 7–8 | Preferences, deterministic matching, saved opportunities, explanations, partner publishing | Athlete can discover, qualify and act on relevant opportunities |
| 4. Open Challenge pilot | Months 9–11 | Templates, versioned rules, partner/evaluator roles, registration, participation and outcomes | Real partner challenge completes lifecycle |
| 5. Outcome and intelligence | Months 12–14 | Connected outcomes, partner reporting, disputes, aggregate measures, KhelChronicle methodology | Reliable outcome metrics exist |
| 6. Expansion and monetisation | Months 15–18 | More city clusters/sports, validated subscriptions, sponsored challenges, institutional partnerships | Repeatable partner economics and athlete participation |

### Illustrative scale targets

| Measure | Month 6 | Month 12 | Month 18 |
|---|---:|---:|---:|
| Active partner organisations | 5 | 20 | 50 |
| Genuine sourced opportunities | 50 | 250 | 750 |
| Passports created | 100 | 500 | 2,000 |
| Completed challenges | 2 | 15 | 50 |
| Evidence-backed participation outcomes | 50 | 300 | 1,500 |
| City clusters | 1 | 3 | 8 |

These are targets only. Never represent them as achieved traction until measured and audited.

---

## 8. Repository implementation plan

### 8.1 Documentation baseline

Maintain this strategy as the high-level source of truth. Create or maintain supporting documents as implementation becomes concrete:

- docs/strategy/KHELGRID_BLUE_OCEAN_FLAGSHIP_STRATEGY.md — this document.
- docs/architecture/KHELGRID_OPPORTUNITY_LIFECYCLE_PROTOCOL.md
- docs/architecture/KHELGRID_SPORTS_PASSPORT_ARCHITECTURE.md
- docs/architecture/KHELGRID_OPPORTUNITY_GRAPH_ARCHITECTURE.md
- docs/architecture/KHELGRID_OPEN_CHALLENGE_ARCHITECTURE.md
- docs/architecture/KHELGRID_TRUST_AND_EVIDENCE_MODEL.md
- docs/architecture/KHELGRID_PRIVACY_AND_ACCESS_MODEL.md
- docs/architecture/KHELGRID_DATA_DICTIONARY.md
- docs/validation/KHELGRID_PILOT_RESEARCH_PLAN.md

Do not create empty documents merely to populate the tree. Add each supporting document when its domain is ready for implementation and review.

### 8.2 Proposed feature ownership

Follow existing repository conventions; do not create these directories blindly before checking the actual source tree.

    src/modules/
      athlete-passport/
      opportunity-graph/
      open-challenges/
      participation/
      outcomes/
      partner-desk/
      trust/

    src/shared/
      evidence/
      consent/
      audit/
      eligibility/
      domain-types/

### 8.3 Navigation direction

Keep navigation compact:
- Discover — opportunities, challenges, competitions and sports.
- My Sports Passport — athlete records and evidence.
- Challenges — local challenges and participation.
- Partner Desk — organisation publishing/reporting, permission-gated.
- KhelChronicle — research and sports intelligence.

Keep venues, coaches, academies and sports as discovery categories. Existing Coming Soon routes remain clearly labelled until their actual backend workflows are implemented.

### 8.4 Release gates

| Release | Scope | Required tests |
|---|---|---|
| R0 | Strategy, domain model, architecture | Documentation and schema review |
| R1 | Trust and opportunity integrity | Source, moderation, expiry, correction, publication |
| R2 | Passport and evidence | RLS, private storage, export, revoke, dispute |
| R3 | Opportunity Graph | Eligibility, matching, permissions |
| R4 | Challenges and participation | Registration, attendance, evaluator, lifecycle |
| R5 | Outcome Engine | Evidence provenance, disputes, event ordering |
| R6 | Partner reporting | Organisation isolation, aggregate privacy, reporting |

Every release must pass typecheck, lint, Vitest, relevant SQL lifecycle tests, RLS/storage tests, production build, Vercel preview checks and manual desktop/mobile testing. A route rendering is not proof of a complete backend feature.

---

## 9. Risks and controls

| Risk | Control |
|---|---|
| Government platform expands into discovery | Complementary role, authorised interoperability, superior local execution |
| Fake organisers/challenges | Organiser checks, source review, reports, suspension and appeal |
| Fabricated athlete records | Evidence classes, issuer confirmation and dispute process |
| Low partner adoption | Manual pilot and low-friction partner workflow |
| Low athlete repeat use | Useful Passport and discovery beyond one event |
| Child safety/privacy harm | Age-aware access, guardian consent, moderation and safeguarding |
| Free-tier limits | Modular monolith, quota monitoring, indexes and storage limits |
| IP/legal uncertainty | Qualified legal/IP review and documented provenance |
| Revenue uncertainty | Test willingness to pay before large paid build |
| Feature fragmentation | KOLP as shared lifecycle backbone |

### IP and data governance

Protect the brand, original software, original challenge formats and operating manuals, original research and properly governed datasets using appropriate legal mechanisms. Do not assume a general product idea or methodology is automatically patentable or exclusively ownable. Obtain qualified Indian IP, privacy and commercial legal advice.

Athletes retain meaningful control over personal records. Aggregate intelligence must prevent identification, comply with applicable law and use appropriate minimum cohort sizes and suppression rules.

---

## 10. First engineering milestone: Opportunity Infrastructure Foundation

The immediate engineering milestone is not a large UI build. It is a repository and database gap audit followed by a safe, minimal foundation.

### Work package

1. Inventory current opportunities, venues, sports, profiles, organisations, moderation, evidence and notification tables.
2. Inventory relevant constraints, indexes, triggers, RLS policies, grants and storage policies.
3. Map existing entities to the target domain model; identify canonical tables and duplicates.
4. Define the Opportunity Lifecycle Protocol and allowed state transitions.
5. Define source and evidence provenance.
6. Define organiser review and listing trust states.
7. Define a permission matrix for athlete, organiser, evaluator, moderator and public visitor.
8. Produce a migration plan that reuses existing schema.
9. Add positive and negative SQL tests for publication, evidence access and lifecycle transitions.
10. Break implementation into reviewable pull requests with explicit acceptance criteria.

### Initial priority

| Priority | Deliverable | Reason |
|---|---|---|
| P0 | Schema/RLS audit | Avoid duplicate or insecure foundations |
| P0 | Opportunity lifecycle | Establish consistent transitions |
| P0 | Evidence provenance | Prevent false verification |
| P0 | Organiser/source trust | Protect the network |
| P1 | Passport data/privacy model | Establish athlete ownership |
| P1 | Eligibility model | Enable matching |
| P2 | Challenge templates/partner workflow | Build physical distribution |
| P2 | Outcome reporting | Create the long-term data asset |

### Definition of done for the first package

- Audit cites actual repository files and migration names.
- Existing versus proposed tables are explicitly distinguished.
- No migration is written before schema inspection.
- Every proposed permission has an allow and deny test.
- No production resource is changed.
- No fake data is added to a public catalogue.
- CI checks and database tests are run and results reported accurately.
- Every unresolved assumption is recorded.

---

## 11. Strategic decision log

| Decision | Direction |
|---|---|
| Geography | India first |
| Flagship | Combined Sports Passport + Opportunity Graph + Open Challenge Network |
| Shared core | Opportunity Lifecycle Protocol and Outcome Engine |
| Market position | Sports Opportunity Infrastructure |
| Architecture | Existing React/TypeScript/Vite + Supabase modular monolith |
| Database | Existing PostgreSQL schema extended incrementally |
| Athlete access | Basic access free; private by default; exportable |
| Trust | Separate source, organiser, listing, evidence and outcome decisions |
| AI | Not a core MVP differentiator; explainable rules first |
| Payments | No live collection until separately approved and safeguarded |
| Production | Remains separate; no production changes authorised by this strategy |
| Validation | Manual-first, partner-led pilot before scaling |
| Defensibility | Trusted lifecycle data, partner network, operating standards and repeat outcomes |

## 12. Review cadence and change control

- Review the strategy monthly during the first six months.
- Reassess the market and government ecosystem at least quarterly.
- Record major product-scope changes in the decision log.
- Update targets only from measured pilot evidence.
- Keep strategy claims, product availability and public marketing claims aligned.
- New government/federation integrations require explicit authorisation and a documented data-sharing basis.
- Child-facing, payment, identity or sensitive-data features require separate security, privacy and legal gates.

**Governing principle:** KhelGrid should make every legitimate sports opportunity more actionable and every documented participation more useful—without pretending to be an official selection authority or compromising athlete trust.
