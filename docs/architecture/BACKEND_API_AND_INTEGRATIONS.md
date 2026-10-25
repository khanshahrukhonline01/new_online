# Backend, API and Third-Party Integrations

**Status:** Draft baseline

## Integration register
For every provider record: purpose, owner, environment, data categories, authentication method, key location, permitted use, attribution, quotas, retention, outage behaviour, cost, privacy implications and removal procedure.

## Trust boundaries
Browser code is public. Never include service-role keys or private provider secrets in Vite variables. Any privileged mutation must be enforced by a trusted server/function and database policies, not by hiding UI controls.

## Supabase
Use a dedicated development project and reviewed migrations. Browser clients may use only publishable/anon credentials with appropriate RLS. Treat returned data as untrusted. Public read APIs must expose only intended published fields.

## Provider lifecycle
Before integrating a provider, review terms, licence, attribution, rate limits, caching rights, privacy, costs and service-level expectations. Do not scrape or republish data where prohibited. A provider outage must not be disguised as an empty or live result.

## API contracts
Define request/response types, validation, authentication/authorization, error codes, idempotency and rate limits for each mutation. Version contracts where breaking changes are likely. Keep test fixtures clearly synthetic and isolated from public data.