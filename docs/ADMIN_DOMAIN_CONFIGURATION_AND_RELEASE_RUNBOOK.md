# KhelGrid Admin Domain Configuration & Release Runbook

**Target Domain:** `https://admin.khelgrid.com`  
**Public Domain:** `https://khelgrid.com`  
**Monorepo:** `khelgrid-dotcom/khelgrid-platform`  
**Status:** Decoupled and Ready for Operator Domain Attachment  

---

## 1. Architecture Summary

The KhelGrid platform operates on a single Git monorepo with two decoupled frontend applications:

| Application | Target Origin | Build Command | Output Dir | Routing & Access |
|---|---|---|---|---|
| **Public Web App** | `https://khelgrid.com` | `npm run build` | `dist/` | Public discovery, turfs, academies, trials, KhelChronicle. No admin routes or code bundled. |
| **Private Admin App** | `https://admin.khelgrid.com` | `npm run build:admin` | `dist-admin/` | Operations & governance, private moderation queue, evidence verification, athlete KYC, RBAC. |

Both applications connect to Supabase PostgreSQL, where authorization is enforced authoritatively at the database layer using Row-Level Security (RLS) and protected RPC functions.

---

## 2. Vercel Project Configuration

To deploy the separated admin application:

1. **Create New Vercel Project:**
   - Link to repository: `khelgrid-dotcom/khelgrid-platform`.
   - Project Name: `khelgrid-admin`.
   - Root Directory: `./` (leave as root).
   - Framework Preset: `Vite`.
   - Install Command: `npm ci`.
   - Build Command: `npm run build:admin`.
   - Output Directory: `dist-admin`.

2. **Environment Variables:**
   - `VITE_SUPABASE_URL`: `https://hznsbxvovjxvmnchzzqt.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnNieHZvdmp4dm1uY2h6enF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MDU2NzIsImV4cCI6MjEwODQ4MTY3Mn0.CGMlJ8sM5yDPE1gd9Eydhmwf-bBCoxDJIaSTh133OpQ`
   - *(Note: In development and preview builds, `apps/admin/vite.config.ts` automatically provides fallback to these approved development credentials if not explicitly set in the Vercel project environment).*
   - **Crucial:** Never add a `service_role` key or secret key to browser environment variables.

---

## 3. Custom Domain Setup (`admin.khelgrid.com`)

1. In the `khelgrid-admin` Vercel project dashboard, navigate to **Settings > Domains**.
2. Add `admin.khelgrid.com`.
3. In DNS Management (e.g. Cloudflare / Route53 / Namecheap for `khelgrid.com`):
   - **Record Type:** `CNAME`
   - **Name / Host:** `admin`
   - **Target / Value:** `cname.vercel-dns.com.` (or the specific CNAME target shown in Vercel)
   - **Proxy Status:** DNS Only / Bypass proxy during initial challenge to issue TLS certificate cleanly.
4. Verify SSL/TLS certificate generates successfully (status becomes **Valid Configuration**).

---

## 4. Supabase Auth Configuration

1. In the Supabase Dashboard (`hznsbxvovjxvmnchzzqt`), navigate to **Authentication > URL Configuration**.
2. Under **Redirect URLs**, add:
   - `https://admin.khelgrid.com`
   - `https://admin.khelgrid.com/**`
   - `https://*-khelgrid2.vercel.app/**` (for preview deployments)
3. Ensure email confirmation / magic link templates include `{{ .SiteURL }}` or `admin.khelgrid.com`.

---

## 5. Security & Browser Acceptance Verification

Before opening operator access, verify all 4 identity boundaries:

| Test Persona | Expected UI Behavior | Database & API Safety |
|---|---|---|
| **1. Anonymous Visitor** | Shows secure sign-in card ("Moderator & Super Admin Control Panel"). Email and password inputs. | Zero private queue items, zero evidence records, zero metrics returned. |
| **2. Ordinary Authenticated User** | Shows explicit "Access not authorized" banner. "You are signed in, but this account is not an active KhelGrid moderator." Sign out button. | Blocked by PostgreSQL RLS. Private queue returns 0 records. |
| **3. Active Moderator** | Shows "Admin Control Centre" command workspace with `moderator` badge. Access to Overview, Listing Moderation, Athlete KYC, Matches, Alerts, Banners. | Allowed to review, verify, approve, reject listings per protected RPCs. Cannot manage moderator roles. |
| **4. Super-Admin** | Shows all moderator capabilities PLUS "Super-Admin RBAC" tab with account listing, role granting, and access audit trail. | Allowed to execute `public.set_listing_moderator_access`. Last active super-admin cannot be deactivated. |

---

## 6. Public Decoupling Verification

1. Navigating to `https://khelgrid.com/admin` or `https://khelgrid.com/admin/control` in the public web app returns a neutral 404 ("This page isn't here yet").
2. No admin navigation links exist in the public header, footer, or user dashboard.
3. Sitemap (`https://khelgrid.com/sitemap.xml`) contains 0 admin routes.
4. Robots and SEO tags on any former admin paths return `noindex, nofollow, noarchive`.
