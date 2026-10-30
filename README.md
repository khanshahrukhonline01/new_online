# Khelgrid Platform

A clean, from-scratch rebuild of Khelgrid, separate from the existing production website.

## Principles
- Never present mock scores as real live data.
- Use sports feeds only after provider access, licensing, attribution, and quotas are verified.
- Keep secrets server-side; never expose service-role keys in browser code.
- Use Supabase with least-privilege Row Level Security (RLS).
- Do not change the existing production site or DNS during initial development.
- No real payments or booking confirmations until server-side safeguards are tested.

## Stack
- React + TypeScript + Vite
- Supabase (Free Plan target)
- GitHub Actions CI
- Vercel preview deployment after checks pass

## Local development
Requires Node.js 22 LTS and npm.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

Copy `.env.example` to `.env.local`. Never commit credentials.

## Delivery stages
1. Frontend foundation and design system.
2. Supabase migrations, RLS policies, and typed data access.
3. Profiles and verified opportunities.
4. Booking and payment safeguards.
5. Authorized live sports provider integrations.
6. SEO, privacy, analytics, advertising, accessibility, and release checks.

The existing production site remains separate and unchanged until explicitly approved.

## Homepage sports hero carousel

The homepage hero uses a lightweight, five-slide sports image carousel (football, cricket, athletics, basketball, and badminton) instead of a background video.

- **Timing:** advances every 3 seconds with a CSS crossfade.
- **Fixed content:** the page headline, supporting copy, and primary actions remain outside the image carousel.
- **Loading:** the first slide is eager-loaded with high fetch priority; subsequent slides use native lazy loading and asynchronous decoding.
- **Responsive crop:** each slide has an explicit focal position; mobile styles reduce the hero height and keep controls reachable.
- **Controls:** users can pause/resume rotation, select a slide indicator, or advance to the next slide. Buttons have accessible names and visible keyboard focus.
- **Reduced motion:** when `prefers-reduced-motion: reduce` is active, automatic rotation is disabled and the crossfade transition is removed.
- **Visual treatment:** a dark navy overlay and emerald accents preserve contrast with the KhelGrid brand palette.
- **Image hosting:** current image URLs are served by Unsplash with width/quality parameters. These are external assets, not bundled local files; verify availability, licensing/usage terms, responsive crop, and performance before production release. Prefer self-hosted optimized WebP/AVIF assets if external dependency or image stability is a concern.
- **Release checks:** run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`; inspect the Vercel preview on desktop and mobile, confirm image requests and lazy loading in browser devtools, test keyboard controls and reduced-motion settings, and check contrast/readability before merging.

The carousel is a presentation-only feature and does not change catalogue, venue, opportunity, booking, or live-score data behavior.

## Platform page coverage and coming-soon behavior

Implemented catalogue pages:
- `/` — homepage and sports hero.
- `/sports` and `/sports/:slug` — published sports catalogue/detail route.
- `/opportunities`, `/trials`, `/combines`, `/scholarships`, `/camps`, and `/opportunities/:slug` — opportunities catalogue/detail route.
- `/venues`, `/book`, and `/venues/:slug` — venue catalogue/detail route; booking confirmation and live availability are not enabled.
- `/search` — search across published sports, opportunities, and venues.

The navigation registry also includes feature routes. Where a feature does not yet have a complete data source, backend, authentication, moderation workflow, or tested user flow, the app now renders the shared `FeatureComingSoonPage` rather than an empty or misleading screen. Registered routes include dashboard, live scores, find games, coaches, academies, events, athlete stats, Sports CV, Talent Scanner, Scout Portal, verification, learning, guides, AI guide, KhelChronicle, community, tools, sports calendar, For You, Trust Center, pricing, mobile app, careers, partners, About, contact, privacy, terms, cookies, settings, notifications, login/signup/recovery, profiles, saved items, referrals, and help.

**Data integrity rule:** placeholders must clearly say “Coming soon” and must not invent sports records, match scores, venue availability, booking confirmations, athlete profiles, payment status, or account data. Feature routes are navigational placeholders only, not evidence that the corresponding backend capability exists. Legal and policy pages should be replaced with reviewed, jurisdiction-appropriate text before public launch; the current generic placeholder is not legal advice or a substitute for published policies.

Before release, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`, then manually visit every registered route and verify internal navigation, browser back/forward behavior, mobile navigation, and not-found handling.


### Feature route page foundation

The feature route component now renders route-specific information rather than one identical generic placeholder. Athlete tools, live sports, play, coaching, events, learning, community, account, organisation and support routes explain the planned scope, current service status and relevant next steps. About, Contact, Help, Trust Center and Partners provide basic informational content and contact links. Privacy, Terms and Cookies clearly state that their content is not yet a complete, reviewed policy and must be replaced before public launch.

This is still a page-content foundation, not a claim that the underlying features are implemented. Authentication, live sports feeds, account data, payments, booking confirmation, athlete verification, user-generated community content and other unavailable services remain disabled. Route tests cover the registered paths; a successful test run and deployed preview still need to be verified separately.

### Additional policy route foundations

The footer links for IPR & Copyright, Cancellation, POSH, Editorial, Verification, and Corrections now have registered internal routes and route-specific draft content:
- `/ipr-policy`
- `/cancellation-policy`
- `/posh-policy`
- `/editorial-policy`
- `/verification-policy`
- `/correction-policy`

These are explicitly marked as requiring review before launch. Their presence is not a claim that a formal legal, workplace, verification, editorial, refund, or correction workflow exists. Review the content with appropriate qualified advisers and align it with actual operating practices before relying on it publicly.


## Permanent sidebar architecture and layout contract

The desktop sidebar is a permanent 64px icon rail. Hovering or keyboard-focusing it temporarily reveals a 256px overlay; the page content and footer do not resize or shift. The fixed sidebar begins below the 68px site header. The footer reserves the same 64px column. At mobile widths, the desktop reservation is removed and the separate drawer plus bottom navigation are used.

Code ownership:
- `src/shared/components/Sidebar.tsx`: navigation rendering, route interaction, section state and mobile drawer behaviour.
- `src/shared/components/Sidebar.css`: sidebar presentation, responsive rules and the 64px shell reservation/overlay.
- `src/shared/navigation/navigationRegistry.ts`: navigation labels, groups, routes and availability.
- `src/App.tsx`: app-level route composition and collapsed/mobile state; no sidebar visual styling.
- `src/styles.css`: global styling only; do not add sidebar-specific overrides.

When changing the sidebar, update its regression tests and architecture documentation in the same pull request. The sidebar suite lives with the app tests in `src/App.test.tsx` and protects the default compact state, route/utility links, desktop shell structure and separate mobile navigation. CI checks are necessary but manual preview verification is also required for hover, keyboard focus, pointer-leave collapse, navigation, scrolling and no content/footer shift.
