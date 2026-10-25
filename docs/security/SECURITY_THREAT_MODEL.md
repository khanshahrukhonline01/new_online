# Security Threat Model

**Status:** Draft baseline

## Assets and threats
Protect user information, source credentials, admin publishing privileges, database integrity, payment state and deployment access. Consider unauthorized reads/writes, credential leakage, injection, XSS, CSRF where applicable, abuse, supply-chain compromise and denial of service.

## Controls
Least privilege; RLS and server-side authorization; schema validation; output escaping; secure headers; rate limits on public mutation endpoints; dependency scanning; secret scanning; audited privileged actions; minimal logging; separate environments.

## Key rules
Vite environment variables are public. Never place service-role credentials in the client. Treat third-party payloads as untrusted. Verify payment webhooks. Prevent users from changing publication/verification status without authorization.

## Dependency management
Review new dependencies, pin/lock versions, apply security updates through tested PRs and investigate advisories. Do not suppress security findings without rationale and owner approval.

## Acceptance
Threat model each sensitive feature before launch, test unauthorized access, document residual risks and ensure incident contacts and key rotation procedures exist.