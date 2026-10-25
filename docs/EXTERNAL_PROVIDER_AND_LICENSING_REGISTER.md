# KhelGrid External Provider and Licensing Register

Status: Template; provider approvals intentionally remain unfilled until reviewed. Last reviewed: 2026-10-25.
A provider is not “connected”, “licensed” or “approved” until configuration and terms are verified.

## Provider inventory
| Provider/service | Use | Data sent/received | Terms and commercial/redistribution evidence | Attribution | Cost/quota | Secret owner | Failure behaviour | Status |
|---|---|---|---|---|---|---|---|---|
| Sports scores/data | Live score/status | Match IDs, scores, timestamps | Pending review | TBD | TBD | Backend owner | Show stale/unavailable; never fabricate | Not verified |
| Trial/opportunity sources | Public listings | Source URLs, event details | Review per publisher | Source link | TBD | Editorial owner | Mark unverified/expired | Per listing |
| LLM/model provider | AI tools/content | Minimized prompt/context | Verify retention, training and output terms | As required | Budget cap TBD | Backend owner | Disclose unavailable | Not approved |
| Push notifications | Alerts | Device token, preferences, event | Review terms/consent | As required | Quota TBD | Backend owner | Queue/retry honestly | Not verified |
| Advertising/consent | Ads/measurement | Consent and vendor data | Verify publisher approval/policies | Per policy | TBD | Monetization owner | Respect consent | Not verified |
| Analytics/error reporting | Usage/diagnostics | Minimized event/error metadata | Review privacy, retention and processing | Disclosure | TBD | Operations owner | Avoid sensitive data | Not verified |
| Maps/media/other APIs | Venue/location/media | Define per integration | Verify licence and commercial use | TBD | TBD | Feature owner | Graceful unavailable state | Not verified |

## Approval checklist
- [ ] Official documentation URL recorded.
- [ ] Terms, commercial use and redistribution rights reviewed.
- [ ] Coverage, territory, fields, latency and freshness documented.
- [ ] Attribution and branding rules reviewed.
- [ ] Data processing, retention, training, subprocessors and deletion reviewed.
- [ ] Quotas, pricing and budget alerts set.
- [ ] Server-side least-privilege credentials and separate environments.
- [ ] Timeout, stale state, retry and outage behaviour tested.
- [ ] User-facing source/status disclosures documented.
- [ ] Owner and review date recorded.

## Live sports gate
No UI may claim “live” until an authorized structured provider is configured and tested for intended redistribution/commercial use. News articles, search snippets, generated text and fixtures are not score feeds.

## Listing provenance
For every trial/listing record publisher, source URL, checked time, evidence reference, reuse basis, dates, eligibility, fee or unknown, contact, verification level, expiry and correction history.

Provider changes require privacy, schema, attribution, terms, caching, cost, monitoring and rollback review. Production credential activation requires owner approval.
