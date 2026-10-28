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
