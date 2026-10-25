# Live Sports Data and Scores

**Status:** Deferred until a real provider and rights are approved

## Provider approval
Document provider identity, sports/competitions covered, licensing/terms, permitted display, attribution, caching, latency, quotas, costs, redistribution restrictions and termination procedure before implementation.

## Data architecture
Normalize provider responses behind an adapter; validate payloads; record provider/update timestamps; handle delayed, stale, partial and unavailable data distinctly. Never silently substitute simulated scores for a real feed.

## UX
Show provider/data freshness and a truthful outage state. Do not call scheduled, stale or sample records live. Do not imply ball-by-ball coverage unless the provider actually supplies it.

## Security and reliability
Keep private provider keys server-side. Apply quota-aware caching, timeouts, retries with limits, monitoring and circuit-breaking where appropriate.

## Acceptance
Demonstrate real provider data in a controlled environment, source/rights approval, failure-state tests, attribution and cost monitoring before public launch.