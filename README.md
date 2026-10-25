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
