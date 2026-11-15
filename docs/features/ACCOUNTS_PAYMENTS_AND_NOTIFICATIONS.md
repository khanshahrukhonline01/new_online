# Accounts, Profiles, Applications, Payments and Notifications

**Status:** Deferred; requires separate scope and approval

## Accounts and profiles
Specify sign-in providers, session handling, account deletion, data export, recovery, abuse protection and RLS. Never expose privileged keys or trust client-supplied roles.

## Applications and saved items
Define ownership, idempotency, eligibility, duplicate submission rules, state transitions and audit history. Provide clear confirmation and failure states.

## Notifications
Record consent/preferences, delivery channels, retries, unsubscribe controls and retention. Do not send messages until the user action and provider configuration are verified.

## Payments
Document provider, currency, taxes/fees, refunds, disputes, reconciliation, idempotency, webhook signature verification, failure handling and support escalation. Never store raw card data unless the system is explicitly certified and designed to do so; prefer provider-hosted/tokenized flows.

## Gate
Do not implement or claim these services operational until threat modelling, policy review, acceptance tests and explicit project approval are complete.