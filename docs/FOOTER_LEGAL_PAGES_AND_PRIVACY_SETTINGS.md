# Website Footer, Legal Pages, and Privacy Controls Requirements

**Status:** Product and implementation requirements; planning/documentation only.
**Scope:** Private KhelGrid Platform project.
**Safety:** This document does not change production, deploy the site, or authorize legal-page publication. Public-facing legal text must be reviewed for accuracy and applicability before launch.

## 1. Required global footer

Every public website page must render a consistent, responsive footer with:

- Copyright notice: `© {current year} KhelGrid. All rights reserved.`
- About — `/about`
- Contact — `/contact`
- Privacy — `/privacy`
- Terms — `/terms`
- IPR & Copyright — `/ipr-policy`
- Cancellation — `/cancellation-policy`
- POSH Policy — `/posh-policy`
- Editorial — `/editorial-policy`
- Verification — `/verification-policy`
- Corrections — `/correction-policy`
- Sitemap — `/sitemap.xml`
- A visible **Privacy & Cookie Settings** control.
- A clearly labelled social/community area, with only confirmed KhelGrid-owned or officially managed profiles.

The copyright year should be generated from the current year, not hard-coded. Footer links must be keyboard accessible, have descriptive names, work on mobile, and point to real routes or a generated sitemap. Do not link to pages that do not exist without clearly marking them as pending during development.

## 2. Social media, community, and sharing requirements

### 2.1 Official social links

- Include a dedicated **Follow KhelGrid** or **Community** section in the global footer, and optionally in the About/Contact page.
- The Reddit community URL already specified for KhelGrid is: https://www.reddit.com/r/Khelgridonline/ . Use a visible text link such as **Join our Reddit community** so the destination is understandable even if an icon fails to render.
- Add other social network links only after the exact official profile URLs have been confirmed by the project owner. Do not invent handles, create profiles, or link to unrelated brands/accounts.
- Use recognizable icons only as a supplement to accessible names; provide meaningful accessible labels, visible focus states, and adequate tap targets.
- External social links should open predictably. If opened in a new tab, provide appropriate security attributes and communicate the behaviour accessibly.
- Keep social URLs in one shared configuration so footer, About, Contact, and other locations cannot drift out of sync.
- If a social profile is unavailable or not yet approved, omit it rather than displaying a dead or placeholder link.

### 2.2 Sharing website content

- Where useful, allow users to share a public sports opportunity, venue, or sport page using a standard share action or a copy-link fallback.
- Share only canonical public URLs and public page titles/descriptions. Never place private profile data, personal contact information, internal IDs, authentication tokens, or unpublished records in share URLs or metadata.
- Sharing must work without requiring the user to sign in. If the browser's native share feature is unavailable, offer a clear copy-link fallback.
- Do not automatically post to a user's social account, access their social account, or publish content on their behalf.
- Do not add third-party social widgets, pixels, embedded timelines, or SDKs by default. They can introduce tracking and third-party data transfers; first document the exact integration and review privacy, consent, security, and platform terms.
- Social preview metadata (Open Graph/Twitter-compatible metadata where appropriate) must reflect the actual public page and must not claim a listing is verified, open, current, or available unless the data supports that claim.

### 2.3 Social media as a source of sports announcements

- Social posts may be leads for discovering announcements, but a social post alone must not automatically make an opportunity officially verified.
- Record the original source URL, publisher/account, publication date when available, last-checked date, event date/deadline, and evidence/status used by the editorial workflow.
- Respect each platform's terms, rate limits, copyright, privacy, attribution, and automated-access restrictions. Do not scrape, republish images/videos, or bypass access controls without a valid basis and permission where required.
- Prefer the organizer's official notice or website for key eligibility, fees, venue, dates, and contact details. If only a social post is available, label the source and verification limits honestly.
- Do not expose private or closed-group content, personal contact details, or personal data beyond what is necessary and lawfully published for the opportunity.
- Provide a way to report a stale, misleading, harmful, or infringing listing, and apply the editorial, verification, correction, and IPR policies.

### 2.4 Social community moderation

- If KhelGrid later enables comments, submissions, direct messages, user posts, or community discussions, define community rules, reporting, moderation, escalation, and appeal processes before enabling those features.
- Do not imply that KhelGrid operates or moderates third-party communities unless that is true.
- Do not promise round-the-clock monitoring or guaranteed response times unless staffed and measured.
- Any future user-generated-content feature must include appropriate privacy notices, reporting controls, prohibited-content rules, and a documented handling process for abuse, impersonation, spam, and copyright complaints.

## 3. Privacy & Cookie Settings

Provide a persistent, clearly discoverable control labelled **Privacy & Cookie Settings** in the footer. It must reopen the consent/settings interface after a user has made a choice.

The interface must:
- Explain the categories of storage/technology used in plain language.
- Separate strictly necessary storage from optional analytics, personalization, and advertising technologies where those categories are actually used.
- Allow the user to accept optional categories, reject optional categories, or configure categories individually.
- Avoid preselecting optional categories where consent is required.
- Record the consent choice, policy/version identifier, and timestamp only using a documented, proportionate mechanism.
- Respect the saved choice on later visits and provide a straightforward way to change or withdraw it.
- Avoid loading optional analytics, advertising, social widgets, pixels, embeds, or other non-essential third-party scripts before valid consent where required by applicable law or policy.
- Not claim that cookies, analytics, advertising, social embeds, or consent storage are active until the corresponding technologies are actually configured.
- Provide accessible keyboard operation, focus management, clear labels, and mobile-friendly layout.
- Fail safely: if consent state cannot be read, do not assume consent for optional technologies.

Do not use a custom banner as a substitute for checking the requirements of the jurisdictions and third-party services that the site actually serves or integrates.

## 4. Legal and policy pages

Create route and content requirements for each page:

| Route | Required subject matter |
|---|---|
| `/about` | Accurate KhelGrid purpose and scope; avoid unsupported user, listing, or verification numbers. |
| `/contact` | Working contact channel and correction/report process; verify addresses before publication. |
| `/privacy` | Data collected, purposes, lawful basis where applicable, processors, sharing, retention, security, user rights, contact, children’s privacy where relevant, and third-party social services actually integrated. Describe actual behaviour only. |
| `/terms` | Eligibility, acceptable use, third-party source links, accuracy limitations, intellectual property, account rules only if accounts exist, sharing features, and disclaimers. |
| `/ipr-policy` | Copyright/trademark ownership, permitted use, notice-and-review process, required notice details, counter-notice/appeal steps if applicable, and contact route. Have counsel review jurisdiction-specific legal procedures. |
| `/cancellation-policy` | State clearly whether any paid booking or purchase service exists. Do not imply payments, refunds, or cancellation workflows exist until implemented. |
| `/posh-policy` | Explain applicability and provide a responsible contact/process only after organizational details and legal applicability have been confirmed. Do not fabricate an Internal Committee or named officer. |
| `/editorial-policy` | Sourcing standards, attribution, corrections, freshness, publication criteria, and treatment of unverified material, including leads from social media. |
| `/verification-policy` | Define precisely what “source reviewed” and “verified” mean, what evidence is checked, limitations, re-review cadence, and how users can report errors. Do not promise verification that is not performed. |
| `/correction-policy` | How to submit corrections, what evidence helps, expected review process, handling of urgent safety/IPR issues, and how changes are recorded. |
| `/sitemap.xml` | Generated XML sitemap containing canonical, public, indexable routes only. Exclude private, draft, duplicate, and non-canonical URLs. |

## 5. Legal accuracy and publication controls

- These are product requirements, not legal advice or a claim that the current website complies with every jurisdiction.
- Obtain appropriate legal review before publishing terms, privacy, IPR, POSH, refund/cancellation, or statutory notices.
- Identify applicable jurisdictions and actual services/data flows before finalizing policy wording.
- Do not claim that a policy, consent manager, deletion mechanism, refund process, social profile, moderation process, or reporting channel is operational unless tested and confirmed.
- Keep policy pages versioned and record their effective date and last reviewed date.
- Keep a visible path for reporting incorrect, stale, harmful, or infringing listings.
- Ensure third-party feeds and embedded services follow their terms, attribution, consent, and retention requirements.

## 6. Acceptance tests

1. All public pages show the complete footer at desktop and mobile widths.
2. The copyright year updates automatically.
3. Every footer link resolves to the intended route or generated sitemap.
4. The social section displays only confirmed official profiles; the Reddit community link is clearly labelled and works.
5. Social icons have accessible names and do not become the only way to identify a link.
6. Share actions use canonical public URLs and provide a copy-link fallback where native sharing is unavailable.
7. No automatic social posting, unapproved tracking widget, or social SDK is added.
8. Social-sourced opportunities retain provenance and are not automatically labelled verified.
9. The Privacy & Cookie Settings control opens the settings interface from every public page and can reopen it after a choice.
10. Accept, reject, and granular category choices behave distinctly and persist as designed.
11. Optional scripts, including optional social widgets and embeds, do not run before consent when consent is required.
12. No optional category is falsely described as active when the service is not integrated.
13. Keyboard-only and screen-reader navigation can use the footer and settings interface.
14. Sitemap output contains only canonical public routes and valid XML.
15. Legal pages contain no fabricated company details, contacts, committees, paid services, social profiles, or compliance claims.

## 7. Implementation sequence

1. Add the footer/navigation and legal-page routes.
2. Confirm official social profile URLs; add the known Reddit community link and no unconfirmed profiles.
3. Draft accurate, reviewable policy content based on actual KhelGrid operations.
4. Decide whether public-page sharing is needed and implement a copy-link fallback.
5. Determine which cookies, local storage, analytics, ad scripts, social widgets/embeds, and third-party services will be used.
6. Implement the privacy/cookie settings experience to match those actual technologies and applicable requirements.
7. Generate and validate the sitemap.
8. Run automated route, accessibility, sharing, consent-state, and mobile layout tests.
9. Complete legal review before public launch.

**Not included in this document:** creating new social accounts, enabling advertising or analytics, adding social tracking, changing the database, or deploying production changes.


## Implementation note — 2026-10-29

The development app now has dedicated policy page content and internal footer links in PR branch `feature/policy-pages-live-parity`. The `/cookies` route is explanatory only; no consent UI, storage, or consent enforcement is claimed. Policy wording is draft and must be reconciled with live site content, actual data flows, and owner/legal review before production publication. See [Public Policy Page Content and Live-Site Parity](policies/PUBLIC_POLICY_PAGE_CONTENT.md).
