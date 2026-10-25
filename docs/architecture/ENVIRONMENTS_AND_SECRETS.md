# Environments and Secrets Management

**Status:** Draft baseline

## Environment separation
Maintain separate development, preview/staging and production configuration, databases, provider credentials and test data. Verify which environment a tool targets before every write.

## Secret rules
- Never commit secrets, service-role keys, access tokens or payment credentials.
- Vite-prefixed variables are bundled for the browser and must be treated as public.
- Use deployment-platform secret storage for server-only values.
- Rotate exposed credentials promptly and audit access.
- Keep an example environment file with variable names only, never real values.

## Safe change protocol
Read the target project/environment first; state intended changes; back up or export affected configuration where supported; apply least-privilege changes; verify without exposing secrets. Production changes require explicit owner approval.

## Failure handling
Missing configuration should show a truthful unconfigured state. Do not silently fall back to production, mock data, or another environment.