# AI/LLM Integration and Public/Private Asset Governance

**Status:** Planning baseline · **Implementation:** Not yet implied · **Owner:** Project owner

## 1. Objectives

Design KhelGrid so it can later work with multiple large language model (LLM) providers and AI products without tying core business logic to one vendor. Separately classify assets and content as public, internal, confidential or restricted, and enforce access according to that classification.

These are future capabilities. Do not advertise integrations or access controls as operational until implemented and tested.

## 2. Multi-LLM architecture

### Provider-neutral application layer
- Define a provider adapter/interface behind a KhelGrid-owned service boundary.
- Keep feature logic, authorization, prompts/templates, tool definitions and output validation independent of a specific model vendor where feasible.
- Maintain a provider registry containing provider/model, supported capabilities, region/data handling, terms, retention/training settings, cost, rate limits, context limits and fallback behaviour.
- Use capability-based routing rather than assuming all models support the same tools, structured output, image input or context size.
- Version prompts and schemas; test them against representative evaluation cases before changing defaults.

### Security and secrets
- Call models through a trusted server-side API or approved backend function. Never put private LLM API keys in browser code, public repositories, URLs or logs.
- Apply authentication and authorization before retrieving private data or invoking tools.
- Use least-privilege credentials, per-provider quotas, rate limits, timeouts, bounded retries and cost limits.
- Redact secrets and unnecessary personal information from prompts, traces and logs.
- Do not send private assets or personal data to an LLM provider unless the data owner has authorized the purpose and the provider's contract, retention, training use, region and privacy terms have been reviewed.

### Data governance and model output
- Treat user prompts, retrieved documents, tool outputs and model responses as untrusted input.
- Defend against prompt injection in webpages/files and never let retrieved content override system authorization rules.
- Apply retrieval access filters before sending context to a model; do not rely on the model to enforce permissions.
- Validate generated JSON and actions against schemas and server-side business rules. Require human approval for publishing, verification, moderation decisions, payments, booking changes, account changes or other consequential operations.
- Clearly label AI-generated summaries or assistance where appropriate; link back to original sources and do not invent verification, sources, event details or live scores.
- Keep an auditable record of provider/model, prompt/template version, relevant source IDs, outcome and cost where lawful and necessary; do not retain raw prompts indefinitely by default.

### Vendor-specific integration
Before enabling each provider, document its API and supported features, contract/terms, data retention and training policies, regional processing, sub-processors, privacy/legal impact, pricing, quota, failure modes, deletion/export support and exit plan. Re-review these terms periodically.

### Evaluation and fallback
Test factuality, source citation, refusal/permission boundaries, prompt injection, data leakage, latency, accessibility, multilingual output and cost. On provider outage, show a truthful unavailable state or approved alternative; do not fabricate a result. Fallback to another vendor only when the data handling and user permissions are suitable for that vendor too.

## 3. Public/private asset classification

Classify every meaningful asset, file, record and generated artifact before deciding where to store it or how to expose it.

| Class | Examples | Default access rule |
|---|---|---|
| Public | Published sports pages, approved public opportunity details, published venue facts, approved public images and public logos | May be served publicly after publication, rights and privacy checks |
| Internal | Draft content, unpublished opportunities, editorial notes, internal documentation, non-public operational metrics | Staff/project-role access only; never include in public bundles or public APIs |
| Confidential | Private CV drafts, account/profile data, contact details not intended for public display, support correspondence, contracts | Explicit authorized-user or service access; minimize, protect and audit access |
| Restricted/secrets | API keys, service-role credentials, signing keys, payment secrets, recovery codes | Secret manager only; never commit, bundle, expose in URLs or send to an LLM without an explicitly approved secret-handling design |

Classification depends on context. A file that is public in one approved use may still have a private original or sensitive metadata. Copyright/licence restrictions apply independently of confidentiality.

### Storage and delivery
- Keep public assets in a deliberately public bucket/CDN path only after review.
- Keep private assets in private storage with authorization checks and short-lived signed URLs where appropriate.
- Never treat an unguessable URL as authorization.
- Apply least-privilege storage policies and test unauthenticated, wrong-user and authorized-user access.
- Prevent private objects from entering public search indexes, sitemaps, social previews, client bundles, source maps, analytics, logs or cached public responses.
- Use explicit publication state and approved metadata for public content. Removing publication should also invalidate caches/previews and revoke or expire access where feasible.
- Use safe filenames, content-type validation, upload size limits, malware scanning where suitable, and image/document processing that strips sensitive metadata when appropriate.
- Record asset owner, purpose, classification, licence/rights, retention, source, publication status and deletion policy.

### Repository and build artifacts
- Treat the private GitHub repository as access-controlled, not as a secret manager.
- Never commit real secrets, private user files, confidential production exports, private CVs, customer records or unrestricted database dumps.
- Keep synthetic fixtures clearly marked and out of production data paths.
- Ensure build bundles contain only intentionally public assets; review generated assets and source maps before release.
- Public open-source release, if ever considered, requires a separate explicit approval and a secret/history/licence audit.

## 4. LLM access to KhelGrid data and tools

Future LLM interfaces (including chat assistants, external model platforms, APIs or agent connectors) must use a documented, permission-aware integration contract.

- Expose a narrow, versioned set of tools/API endpoints with input schemas and output schemas.
- Start with read-only public data access. Keep private-user and staff operations separate and disabled until authorization, consent and audit requirements are implemented.
- Enforce access control in the service/database before returning data, not in prompt instructions.
- Return provenance and last-updated timestamps with factual records where available.
- Rate-limit, monitor and log minimally; protect against scraping, enumeration, injection and excessive cost.
- Require explicit user confirmation for actions with external or irreversible effects.
- Provide deletion, revocation and provider-disable controls.
- Review each target platform's terms, data use, privacy, attribution, caching and tool-access policies before launch.

## 5. Acceptance checklist

- [ ] Provider-neutral adapter and documented provider register exist.
- [ ] No private model keys are present in frontend bundles, repository history or logs.
- [ ] Public/private access tests cover anonymous, unauthorized and authorized cases.
- [ ] Retrieval permissions are enforced before LLM context construction.
- [ ] Prompt-injection, data-leakage and tool-authorization tests pass.
- [ ] Model output is validated and consequential actions require approval.
- [ ] Provider terms, privacy, retention, training use, region and cost are documented.
- [ ] Asset rights, classification, storage policy, retention and publication status are recorded.
- [ ] Removal/unpublish, cache invalidation and credential rotation have runbooks.
- [ ] Production integration is separately approved and monitored.

## 6. Related documents

Maintain links to this policy from:
- `MASTER_PROJECT_PLAN.md`
- `architecture/BACKEND_API_AND_INTEGRATIONS.md`
- `architecture/ENVIRONMENTS_AND_SECRETS.md`
- `data/DATABASE_AND_DATA_GOVERNANCE.md`
- `security/SECURITY_THREAT_MODEL.md`
- `policies/EDITORIAL_VERIFICATION_AND_IPR.md`
- `growth/ANALYTICS_AND_ADVERTISING.md`

**Important:** This document defines requirements, not a claim that multi-LLM access or private asset controls are already implemented.