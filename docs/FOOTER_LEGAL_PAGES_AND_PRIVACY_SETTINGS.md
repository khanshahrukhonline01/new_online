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

The copyright year should be generated from the current year, not hard-coded. Footer links must be keyboard accessible, have descriptive names, work on mobile, and point to real routes or a generated sitemap. Do not link to pages that do not exist without clearly marking them as pending during development.

## 2. Privacy & Cookie Settings

Provide a persistent, clearly discoverable control labelled **Privacy & Cookie Settings** in the footer. It must reopen the consent/settings interface after a user has made a choice.

The interface must:
- Explain the categories of storage/technology used in plain language.
- Separate strictly necessary storage from optional analytics, personalization, and advertising technologies where those categories are actually used.
- Allow the user to accept optional categories, reject optional categories, or configure categories individually.
- Avoid preselecting optional categories where consent is required.
- Record the consent choice, policy/version identifier, and timestamp only using a documented, proportionate mechanism.
- Respect the saved choice on later visits and provide a straightforward way to change or withdraw it.
- Avoid loading optional analytics or advertising scripts before valid consent where required by applicable law or policy.
- Not claim that cookies, analytics, advertising, or consent storage are active until the corresponding technologies are actually configured.
- Provide accessible keyboard operation, focus management, clear labels, and mobile-friendly layout.
- Fail safely: if consent state cannot be read, do not assume consent for optional technologies.

Do not use a custom banner as a substitute for checking the requirements of the jurisdictions and third-party services that the site actually serves or integrates.

## 3. Legal and policy pages

Create route and content requirements for each page:

| Route | Required subject matter |
|---|---|
| `/about` | Accurate KhelGrid purpose and scope; avoid unsupported user, listing, or verification numbers. |
| `/contact` | Working contact channel and correction/report process; verify addresses before publication. |
| `/privacy` | Data collected, purposes, lawful basis where applicable, processors, sharing, retention, security, user rights, contact, and children’s privacy where relevant. Describe actual behaviour only. |
| `/terms` | Eligibility, acceptable use, third-party source links, accuracy limitations, intellectual property, account rules only if accounts exist, and disclaimers. |
| `/ipr-policy` | Copyright/trademark ownership, permitted use, notice-and-review process, required notice details, counter-notice/appeal steps if applicable, and contact route. Have counsel review jurisdiction-specific legal procedures. |
| `/cancellation-policy` | State clearly whether any paid booking or purchase service exists. Do not imply payments, refunds, or cancellation workflows exist until implemented. |
| `/posh-policy` | Explain applicability and provide a responsible contact/process only after organizational details and legal applicability have been confirmed. Do not fabricate an Internal Committee or named officer. |
| `/editorial-policy` | Sourcing standards, attribution, corrections, freshness, publication criteria, and treatment of unverified material. |
| `/verification-policy` | Define precisely what “source reviewed” and “verified” mean, what evidence is checked, limitations, re-review cadence, and how users can report errors. Do not promise verification that is not performed. |
| `/correction-policy` | How to submit corrections, what evidence helps, expected review process, handling of urgent safety/IPR issues, and how changes are recorded. |
| `/sitemap.xml` | Generated XML sitemap containing canonical, public, indexable routes only. Exclude private, draft, duplicate, and non-canonical URLs. |

## 4. Legal accuracy and publication controls

- These are product requirements, not legal advice or a claim that the current website complies with every jurisdiction.
- Obtain appropriate legal review before publishing terms, privacy, IPR, POSH, refund/cancellation, or statutory notices.
- Identify applicable jurisdictions and actual services/data flows before finalizing policy wording.
- Do not claim that a policy, consent manager, deletion mechanism, refund process, or reporting channel is operational unless tested.
- Keep policy pages versioned and record their effective date and last reviewed date.
- Keep a visible path for reporting incorrect, stale, harmful, or infringing listings.
- Ensure third-party feeds and embedded services follow their terms, attribution, consent, and retention requirements.

## 5. Acceptance tests

1. All public pages show the complete footer at desktop and mobile widths.
2. The copyright year updates automatically.
3. Every footer link resolves to the intended route or generated sitemap.
4. The Privacy & Cookie Settings control opens the settings interface from every public page and can reopen it after a choice.
5. Accept, reject, and granular category choices behave distinctly and persist as designed.
6. Optional scripts do not run before consent when consent is required.
7. No optional category is falsely described as active when the service is not integrated.
8. Keyboard-only and screen-reader navigation can use the footer and settings interface.
9. Sitemap output contains only canonical public routes and valid XML.
10. Legal pages contain no fabricated company details, contacts, committees, paid services, or compliance claims.

## 6. Implementation sequence

1. Add the footer/navigation and legal-page routes.
2. Draft accurate, reviewable policy content based on actual KhelGrid operations.
3. Determine which cookies, local storage, analytics, ad scripts, embeds, and third-party services will be used.
4. Implement the privacy/cookie settings experience to match those actual technologies and applicable requirements.
5. Generate and validate the sitemap.
6. Run automated route, accessibility, consent-state, and mobile layout tests.
7. Complete legal review before public launch.

**Not included in this document:** enabling advertising, adding analytics, changing the database, or deploying production changes.
