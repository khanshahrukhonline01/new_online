# Free Directory Listing and Evidence Verification Policy

**Status:** Product policy baseline for the development platform.

## 1. Scope

The following community directory submissions are free:
- Sports venues and facilities
- Individual coaches and trainers
- Sports trials, selection camps and grassroots opportunities

There is no listing submission fee, listing subscription, paid verification tier, paid approval, paid ranking or checkout requirement for these categories.

This policy concerns the free submission and evidence-review process for venues, coaches and sports trials. It does not waive an independent organiser's athlete registration fee, a venue's own hire charge, a coach's own training fee, or any separately offered commercial membership or service. Such charges must be clearly attributed to the provider and must not be presented as KhelGrid listing fees.

## 2. Verification is not monetisation

Verification is an evidence review, not a paid product. A venue, coach, academy or trial organiser cannot purchase verification or a verified listing badge, faster approval or favourable moderation, search ranking or featured placement. A listing payment cannot buy a selection outcome, trial admission or coach endorsement.

Editorial approval, evidence verification and publication remain distinct decisions. Publication is allowed only after the category-specific evidence and publication requirements are met.

## 3. Evidence expectations

| Category | Minimum review focus |
|---|---|
| Venue | Genuine public location/address, identity of the facility, sports/facilities claimed and a reliable public source or contact route |
| Coach | Identity/professional profile, qualification and issuing authority where claimed, relevant experience and public professional contact route |
| Academy | Public identity and location, sports/programmes offered, affiliation claims where made and a reliable public source |
| Trial / opportunity | Organiser identity, official notice/source, actual date and deadline, venue/location, eligibility and application route; athlete fee only when published by organiser |

Evidence classes must remain distinguishable: self-declared, document-supported, issuer-confirmed, official-source linked, disputed, withdrawn/expired. A submitted document is not automatically issuer-confirmed.

## 4. Public display

- Do not show a verified directory-listing badge unless the database evidence-verification decision is verified.
- Do not show invented counts, ratings, reviews, credentials, fees, experience, affiliations, dates, addresses or availability.
- Missing information must be labelled as not supplied/not disclosed or omitted.
- Do not assume an opportunity has free athlete entry when its registration fee is unknown.
- Keep submitter email, phone and private tracking credentials out of public catalogue records.
- Show source and last-reviewed information where the catalogue schema supports it.

## 5. Submission lifecycle

1. Submitter provides the category and available details.
2. Submission remains private in the moderation queue.
3. Reviewer checks source and category-specific evidence.
4. Evidence decision is recorded separately from editorial approval.
5. Corrections may be requested, with a private tracking route for the submitter.
6. Publish only after required evidence, approval and publication data are complete.
7. Re-review, expire or withdraw stale, contradicted or unsafe listings.

## 6. Payment-system separation

The public listing-intake flow must not import or invoke payment checkout, create payment intents, create listing subscriptions, or gate publication on a payment status.

Legacy payment schema, historical subscription rows and booking/trial-payment functionality are not automatically deleted by this policy. They must remain isolated from the free directory-intake lifecycle until a separately reviewed migration establishes whether legacy objects can safely be retired without breaking historical data or other payment flows.

## 7. Abuse and safeguarding

Free submission does not mean automatic public publishing. The intake RPC enforces a gateway-aware limit of 10 submissions per client per minute and validates field lengths and HTTPS source links server-side. Keep private moderation access, audit history, correction and withdrawal paths; consider CAPTCHA only if abuse monitoring shows it is needed. Avoid publishing personal home addresses, private contact details or sensitive information. Child-related profiles and contact routes require age-appropriate safeguards and a separate review before enabling public exposure.