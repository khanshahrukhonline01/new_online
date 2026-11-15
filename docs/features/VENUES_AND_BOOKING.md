# Venues, Courts, Booking and Availability

**Status:** Venue discovery planned; transactional booking is out of scope until separately approved

## Directory fields
Published venue name, address/locality, supported sports, facilities, operator/contact details where authorized, images with usage rights, source/verification status and review timestamp. Show prices only when sourced and current.

## Availability honesty
A directory entry does not imply live availability. Do not show fabricated slots, simulated inventory or invented prices. If no availability provider is connected, say booking/availability is not connected.

## Booking prerequisites
Before implementation: venue/court publication, court-specific pricing, operating hours, timezone rules, atomic overlap prevention, expiring holds, idempotency, cancellation policy, authorization, audit logs and concurrency tests. Reject unpublished or client-guessed prices.

## Payment prerequisites
No payment capture until booking integrity, payment provider, reconciliation, refund/dispute flows, legal terms, security review and failure recovery are approved and tested.

## Acceptance
Public directory contains only approved factual data; all booking claims match actual backend capability; conflicting bookings are prevented at a trusted boundary; failures never imply success.