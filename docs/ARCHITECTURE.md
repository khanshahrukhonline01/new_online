# Architecture boundaries

## Frontend
- Separate UI components from data-access services.
- Make loading, empty, unavailable, and error states explicit.
- Never silently substitute invented sample data for failed live requests.

## Backend and database
- Supabase Free Plan is the target unless the owner explicitly changes that decision.
- Add versioned SQL migrations before depending on schema changes.
- Enable and test RLS on browser-accessible tables.
- Never ship service-role keys or provider secrets to the browser.
- Route privileged operations and secret-bearing API requests through server-side endpoints.

## Sports data
- Verify provider documentation, coverage, commercial rights, attribution, quotas, and caching rules before integration.
- Track source and fetched-at metadata where appropriate.
- Clearly distinguish live, delayed, scheduled, stale, and unavailable states.
- Do not imply official affiliation without authorization.

## Bookings and payments
- Validate availability and price server-side.
- Use atomic database safeguards against concurrent bookings.
- Treat verified provider webhooks as authoritative; do not trust browser redirects.
- Do not enable real charges until reconciliation, refunds, and security flows are reviewed.

## Deployment
- Preview deployment first; no production-domain binding by default.
- Require CI checks and manual review before production promotion.
- Keep the current Khelgrid production site untouched during this rebuild.
