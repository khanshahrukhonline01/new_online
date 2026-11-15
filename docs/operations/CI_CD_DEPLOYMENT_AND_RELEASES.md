# CI/CD, Deployment and Release SOP

**Status:** Draft

Use feature branches and pull requests; require review and required checks. Use the committed lockfile and supported runtime. Run install, lint/format, type check, tests and production build; report actual logs and environment.

Review preview behaviour and environment variables. Confirm no sample data or debug banners leak publicly. Verify legal routes, sitemap, error states and integrations. Production release requires explicit approval.

Document last known good release, rollback procedure and database compatibility. A frontend rollback cannot automatically undo irreversible database changes.

After release, run smoke tests, check errors and data freshness, verify canonical host and key journeys, and record release identifier and owner.