/**
 * KhelGrid — QA / Staging Multi-Dashboard Test Account Provisioner
 *
 * Uses Supabase Auth Admin API (SUPABASE_SERVICE_ROLE_KEY) + official
 * provision_initial_tenant_owner() RPCs to create email-confirmed accounts
 * for every dashboard without shipping hardcoded demo logins in frontend bundles.
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *   $env:TEST_ACCOUNT_PASSWORD="<strong-password>"
 *   node scripts/create-dashboard-test-accounts.mjs --plus-email=khelgrid@gmail.com
 *
 * Options:
 *   --plus-email=<user@domain>   Generate Gmail/provider +alias addresses (e.g. khelgrid+athlete@gmail.com)
 *   --domain=<domain>            Domain used when --plus-email is omitted (default: qa.khelgrid.in)
 *   --password=<password>        Shared QA password (or set TEST_ACCOUNT_PASSWORD)
 *   --generate-passwords         Generate unique random 16-char passwords per account
 *   --dry-run                    Print accounts and tenant provisioning plan without calling Supabase
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

export function parseEnvFile(filePath = '.env') {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const rawVal = trimmed.slice(eqIdx + 1).trim()
    out[key] = rawVal.replace(/^["']|["']$/g, '')
  }
  return out
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const opts = {
    plusEmail: '',
    domain: 'qa.khelgrid.in',
    password: process.env.TEST_ACCOUNT_PASSWORD || '',
    generatePasswords: false,
    dryRun: false,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--generate-passwords') opts.generatePasswords = true
    else if (arg.startsWith('--plus-email=')) opts.plusEmail = arg.slice('--plus-email='.length).trim()
    else if (arg.startsWith('--domain=')) opts.domain = arg.slice('--domain='.length).trim()
    else if (arg.startsWith('--password=')) opts.password = arg.slice('--password='.length)
  }

  return opts
}

function formatTestEmail(aliasKey, { plusEmail, domain }) {
  if (plusEmail && plusEmail.includes('@')) {
    const [localPart, emailDomain] = plusEmail.split('@')
    return `${localPart}+${aliasKey}@${emailDomain}`.toLowerCase()
  }
  return `qa.${aliasKey}@${domain}`.toLowerCase()
}

export function buildTestAccountMatrix({ plusEmail = '', domain = 'qa.khelgrid.in' } = {}) {
  const spec = [
    {
      key: 'athlete',
      dashboard: '1. Athlete Dashboard',
      fullName: 'QA Athlete (Aarav Sharma)',
      authRole: 'athlete',
      expectedRoute: '/workspace/athlete/overview',
      tenants: [],
    },
    {
      key: 'coach',
      dashboard: '2. Coach Dashboard',
      fullName: 'QA Head Coach (Vikram Rathore)',
      authRole: 'coach',
      expectedRoute: '/workspace/coach/overview?tenant=qa-coach-hub',
      tenants: [
        {
          slug: 'qa-coach-hub',
          name: 'QA High-Performance Coach Practice',
          tenantType: 'coach',
          sport: 'Cricket',
          city: 'Delhi NCR',
          state: 'Delhi',
          phone: '9876500002',
        },
      ],
    },
    {
      key: 'academy',
      dashboard: '3. Academy Dashboard',
      fullName: 'QA Academy Director (Rajesh Verma)',
      authRole: 'academy',
      expectedRoute: '/workspace/academy/overview?tenant=qa-apex-academy',
      tenants: [
        {
          slug: 'qa-apex-academy',
          name: 'QA Apex Sports Academy',
          tenantType: 'academy',
          sport: 'Football',
          city: 'Bengaluru',
          state: 'Karnataka',
          phone: '9876500003',
        },
      ],
    },
    {
      key: 'venue',
      dashboard: '4. Venue Management Dashboard',
      fullName: 'QA Venue Host (Suresh Nair)',
      authRole: 'venue_owner',
      expectedRoute: '/workspace/turf/calendar?tenant=qa-metro-turf',
      tenants: [
        {
          slug: 'qa-metro-turf',
          name: 'QA Metro AstroTurf Arena',
          tenantType: 'venue',
          sport: 'Multi-Sport',
          city: 'Mumbai',
          state: 'Maharashtra',
          phone: '9876500004',
        },
      ],
    },
    {
      key: 'tournament',
      dashboard: '5. Tournament Management Dashboard',
      fullName: 'QA Tournament Director (Ananya Sen)',
      authRole: 'tournament',
      expectedRoute: '/workspace/tournament/overview?tenant=qa-youth-cup',
      tenants: [
        {
          slug: 'qa-youth-cup',
          name: 'QA National Youth Cup 2026',
          tenantType: 'tournament',
          sport: 'Cricket',
          city: 'Hyderabad',
          state: 'Telangana',
          phone: '9876500005',
        },
      ],
    },
    {
      key: 'org',
      dashboard: '6. Organisation Dashboard',
      fullName: 'QA Organisation Admin (Meera Deshmukh)',
      authRole: 'organization',
      expectedRoute: '/workspace/organization/overview?tenant=qa-state-federation',
      tenants: [
        {
          slug: 'qa-state-federation',
          name: 'QA State Athletics Federation',
          tenantType: 'federation',
          sport: 'Athletics',
          city: 'Pune',
          state: 'Maharashtra',
          phone: '9876500006',
        },
      ],
    },
    {
      key: 'creator',
      dashboard: '7. Creator Dashboard',
      fullName: 'QA Sports Creator (Kabir Kapoor)',
      authRole: 'creator',
      expectedRoute: '/workspace/creator/overview',
      tenants: [],
    },
    {
      key: 'parent',
      dashboard: '8. Parent Dashboard',
      fullName: 'QA Parent Guardian (Priya Patel)',
      authRole: 'parent',
      expectedRoute: '/workspace/parent/attendance',
      tenants: [],
    },
    {
      key: 'scout',
      dashboard: '9. Scout Portal',
      fullName: 'QA Talent Scout (Arjun Menon)',
      authRole: 'scout',
      expectedRoute: '/scout-portal',
      tenants: [],
    },
    {
      key: 'multi',
      dashboard: '10. Multi-Tenant Switcher (Academy + Venue)',
      fullName: 'QA Multi-Tenant Owner (Rohan Kulkarni)',
      authRole: 'academy',
      expectedRoute: '/workspace (shows Workspace Picker with 2 tenants)',
      tenants: [
        {
          slug: 'qa-multi-academy',
          name: 'QA Multi Sports Academy',
          tenantType: 'academy',
          sport: 'Badminton',
          city: 'Chennai',
          state: 'Tamil Nadu',
          phone: '9876500010',
        },
        {
          slug: 'qa-multi-turf',
          name: 'QA Multi Turf Courts',
          tenantType: 'venue',
          sport: 'Badminton',
          city: 'Chennai',
          state: 'Tamil Nadu',
          phone: '9876500010',
        },
      ],
    },
  ]

  return spec.map(entry => ({
    ...entry,
    email: formatTestEmail(entry.key, { plusEmail, domain }),
  }))
}

async function ensureAuthUser(adminClient, account, password) {
  const metadata = {
    full_name: account.fullName,
    name: account.fullName,
    role: account.authRole,
    city: account.tenants[0]?.city || 'Delhi NCR',
    phone: account.tenants[0]?.phone || '',
  }

  let existingUser = null
  let page = 1
  while (!existingUser) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    existingUser = (data?.users || []).find(u => u.email?.toLowerCase() === account.email)
    if (!data?.users || data.users.length < 200) break
    page += 1
  }

  if (existingUser) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    })
    if (error) throw new Error(`updateUserById failed for ${account.email}: ${error.message}`)
    return { user: data.user, status: 'updated' }
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) throw new Error(`createUser failed for ${account.email}: ${error.message}`)
  return { user: data.user, status: 'created' }
}

async function upsertProfileBestEffort(adminClient, userId, account) {
  const baseRow = {
    id: userId,
    display_name: account.fullName,
    email: account.email,
    city: account.tenants[0]?.city || 'Delhi NCR',
    phone: account.tenants[0]?.phone || null,
    role: account.authRole,
    is_verified: true,
    updated_at: new Date().toISOString(),
  }

  const { error } = await adminClient.from('profiles').upsert(baseRow, { onConflict: 'id' })
  if (error && error.code === '23514') {
    // Fallback if database has not yet applied 20261126000000_expand_profiles_role_check.sql
    const safeFallbackRole = ['host', 'coach', 'scout', 'academy'].includes(account.authRole)
      ? account.authRole
      : 'athlete'
    await adminClient
      .from('profiles')
      .upsert({ ...baseRow, role: safeFallbackRole }, { onConflict: 'id' })
  }
}

async function ensureUserTenants(adminClient, supabaseUrl, anonKey, account, userId, password) {
  if (!account.tenants.length) return []

  const provisioned = []
  let authedClient = null

  for (const tenant of account.tenants) {
    const { data: existingTenant } = await adminClient
      .from('tenants')
      .select('id, slug, tenant_type')
      .eq('slug', tenant.slug)
      .maybeSingle()

    if (existingTenant) {
      await adminClient.from('tenant_memberships').upsert(
        {
          tenant_id: existingTenant.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
        },
        { onConflict: 'tenant_id,user_id' }
      )
      provisioned.push({ slug: existingTenant.slug, action: 'linked-existing' })
      continue
    }

    if (!authedClient) {
      const tempClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
      const { data: signInData, error: signInErr } = await tempClient.auth.signInWithPassword({
        email: account.email,
        password,
      })
      if (signInErr || !signInData.session) {
        throw new Error(`Unable to sign in newly created tenant owner ${account.email}: ${signInErr?.message || 'no session'}`)
      }
      authedClient = tempClient
    }

    const { error: rpcError } = await authedClient.rpc('provision_initial_tenant_owner', {
      p_slug: tenant.slug,
      p_name: tenant.name,
      p_tenant_type: tenant.tenantType,
      p_city: tenant.city,
      p_state: tenant.state,
      p_sport: tenant.sport,
      p_contact_phone: tenant.phone,
      p_contact_email: account.email,
      p_metadata: { source: 'qa_dashboard_test_seed' },
    })

    if (rpcError) {
      throw new Error(`provision_initial_tenant_owner failed for ${tenant.slug}: ${rpcError.message}`)
    }
    provisioned.push({ slug: tenant.slug, action: 'provisioned' })
  }

  return provisioned
}

export async function runProvisioning(argv = process.argv.slice(2)) {
  const opts = parseCliArgs(argv)
  const fileEnv = parseEnvFile('.env')
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  const accounts = buildTestAccountMatrix({ plusEmail: opts.plusEmail, domain: opts.domain })

  if (opts.dryRun) {
    console.log('DRY RUN — Test Account Plan (no Supabase requests made):')
    for (const acc of accounts) {
      console.log(`- ${acc.dashboard}: ${acc.email} (authRole=${acc.authRole}) -> ${acc.expectedRoute}`)
    }
    return { dryRun: true, accounts }
  }

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env or environment.')
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Copy the service_role key from Supabase Dashboard -> Project Settings -> API, set $env:SUPABASE_SERVICE_ROLE_KEY="...", and re-run.'
    )
  }
  if (!opts.generatePasswords && (!opts.password || opts.password.length < 8)) {
    throw new Error(
      'Set a strong QA password via $env:TEST_ACCOUNT_PASSWORD="..." (min 8 chars) or --password=..., or pass --generate-passwords.'
    )
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const results = []
  for (const acc of accounts) {
    const accountPassword = opts.generatePasswords
      ? `Kg!${crypto.randomBytes(9).toString('base64url')}`
      : opts.password
    const { user, status } = await ensureAuthUser(adminClient, acc, accountPassword)
    await upsertProfileBestEffort(adminClient, user.id, acc)
    const tenants = await ensureUserTenants(adminClient, supabaseUrl, anonKey, acc, user.id, accountPassword)
    results.push({
      dashboard: acc.dashboard,
      email: acc.email,
      password: opts.generatePasswords ? accountPassword : '(shared TEST_ACCOUNT_PASSWORD)',
      authRole: acc.authRole,
      status,
      tenants: tenants.map(t => `${t.slug} (${t.action})`),
      expectedRoute: acc.expectedRoute,
    })
  }

  console.log('\nProvisioned QA Dashboard Test Accounts:')
  console.table(results)
  return { dryRun: false, results }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runProvisioning().catch(err => {
    console.error('\n[create-dashboard-test-accounts] Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
