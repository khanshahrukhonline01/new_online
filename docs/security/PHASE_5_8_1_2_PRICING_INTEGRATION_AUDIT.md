# Phase 5.8.1.2 — Pricing Integration Audit and Automated Verification

**Scope:** Development repository only. No production database, website, gateway credentials or payment collection changes.  
**Branch:** `phase-5-8-1-2/pricing-integration-verification`

## Audit correction: venue amount is an advance deposit

The prior Phase 5.8.1.1 interpretation that the ₹300 venue amount was an erroneous cap on the full booking price was incomplete. The venue detail UI explicitly labels ₹300 as an advance deposit and separately shows the full estimated slot value and the remaining balance payable at the venue. The reservation RPC independently calculates and stores the full slot total.

The payment model must preserve both amounts:

- Full slot value: authoritative server-side venue/court tariff.
- Advance deposit: `min(₹300, full slot value)`.
- Balance at venue: `full slot value - advance deposit`.

The shared pricing module now exports `calculateVenueAdvanceDeposit()`. The registration Edge Function derives the full tariff from the selected court/venue data, calculates the deposit server-side, and stores full amount, deposit paise and balance metadata. Browser metadata is display context only; submitted amount must match the server-calculated deposit.

The booking-link endpoint now verifies:
- Payment amount equals the expected advance deposit for the full booking amount.
- Payment metadata full booking amount equals the reservation row's server-calculated `total_amount`.
- Payment metadata court number equals the reservation's court number.
- Venue, customer phone, booking reference, and pending states match.

## Venue checkout call-site audit

The venue detail checkout call site is the only identified venue `PaymentCheckoutModal` creation path. It now:

- Uses the canonical venue UUID as `PaymentItem.id` so the payment target maps to `venues.id`.
- Passes an explicit court number (currently Court 1, because this screen has no selectable-court control).
- Passes a display breakdown for full slot value, advance deposit and venue balance.
- Passes the same court number to `recordVenueSlotBooking`.

The backend rejects missing/invalid court numbers. The current page has not implemented multi-court selection; it explicitly reserves Court 1. Do not imply that users can choose a different court until that UI and availability model are implemented.

## Membership catalogue reconciliation

The server-side `MEMBERSHIP_PRICES` is now exported from the shared pricing module. The following frontend views read from that same catalogue:

- `src/modules/pricing/pricingPlansData.ts` — athlete, academy, venue and organizer boost plans.
- `src/shared/components/goProTypes.ts` — Athlete, Coach and Academy GoPro tiers.

The payment registration function continues to calculate membership amounts from the shared catalogue, not from browser-submitted amounts.

## Automated test coverage added

- Shared membership catalogue is tested for every plan ID and both monthly/annual cycles.
- Pricing-page plan arrays are checked against the canonical catalogue.
- GoPro tiers are checked against the canonical catalogue.
- Venue advance deposit tests cover amounts below and above ₹300 and invalid amounts.
- Payment service test asserts that court number, full booking amount, advance deposit and balance metadata are passed to the registration Edge Function.
- Existing court tariff, venue fallback, paise conversion and listing plan tests remain.

## Branch reconciliation

This phase uses a new branch created directly from current `main`, after the Phase 5.8.1.1 PR was merged. It avoids carrying the previous branch's behind/diverged history forward.

## Verification status

The repository's CI workflow runs:

1. PostgreSQL migration fixture and hosted schema assertions.
2. Deno typecheck for `register-payment-intent`.
3. `npm run typecheck`.
4. `npm run lint`.
5. `npm run test`.
6. `npm run build`.

Tests and builds must be executed by GitHub Actions for this PR. No local runner was available through the connected repository interface, so do not mark the phase complete until the PR checks report success. Vercel's previous deployment check failed due to the Free-plan daily deployment limit; that is distinct from GitHub Actions quality checks.

## Remaining release gates

- [ ] GitHub Actions all required checks green.
- [ ] Review any TypeScript/lint/test/build failures and fix them.
- [ ] Confirm development function source matches deployed version before any sandbox checkout test.
- [ ] Verify the reservation RPC and payment-link operation end-to-end with a test booking and no real funds.
- [ ] Confirm pricing data provenance is verified in the development DB.
- [ ] Keep Razorpay order creation and online payment activation disabled until later phases.
- [ ] No production changes.

**Phase 5.8.1.2 remains incomplete until the automated checks and integration verification pass.**
