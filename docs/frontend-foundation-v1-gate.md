# Frontend foundation v1: stabilization gate

This checklist applies to the separate `khelgrid-platform` rebuild only. It does not authorize changes to the production `khelgrid-monetization-studio` repository, production Supabase project, production Vercel project, DNS, or production environment variables.

## Required completion evidence

- [ ] Header and sidebar navigation derive from the shared navigation registry.
- [ ] Home, sports, opportunities, venues, search, aliases, detail routes, and unknown routes are verified.
- [ ] Responsive shell is checked at mobile, tablet, and desktop widths.
- [ ] Shared design tokens cover colors, typography, spacing, borders, radii, focus, and motion.
- [ ] Keyboard navigation, skip link, Escape handling, focus return, visible focus, and current-page semantics are tested.
- [ ] Browser-level tests cover navigation and responsive menu behavior.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass on the same commit.
- [ ] CI run SHA matches the commit proposed for merge.
- [ ] No production website, database, deployment, DNS, or production environment configuration was changed.

## Current implementation notes

- The app shell, shared navigation registry, sidebar, page modules, route resolver, and base design tokens exist.
- The header now reads its primary destinations from the shared navigation registry.
- A unit test protects the registry's primary destination contract.
- The responsive and accessibility checklist is not complete until browser-level evidence is attached to a passing CI run.
- Do not claim completion based on a passing CI run for a different commit.

## Release rule

Keep this work on a separate feature branch and review it in a pull request. Merge only after the complete gate above has evidence. Do not deploy the rebuild to the production Vercel project as part of this milestone.
