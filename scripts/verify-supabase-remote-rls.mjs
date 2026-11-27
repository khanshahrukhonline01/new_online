/**
 * KhelGrid SaaS Platform — Phase 1 Remote Supabase PostgreSQL RLS Probe
 *
 * Connects directly to the live development Supabase database (hznsbxvovjxvmnchzzqt)
 * and verifies PostgreSQL-level RLS policy enforcement, role privilege revokes,
 * and least-privilege boundary compliance.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim()
const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration in .env')
  process.exit(1)
}

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
})

console.log('='.repeat(80))
console.log('KHELGRID SAAS PHASE 1: REMOTE SUPABASE POSTGRESQL RLS PROBE')
console.log('Target Project:', supabaseUrl)
console.log('Execution Mode: Real Database Network Probe (PostgreSQL 17 / PostgREST)')
console.log('='.repeat(80))

const results = []

async function probeTableSelect(tableName) {
  const { data, error } = await client.from(tableName).select('*').limit(5)
  const isMissingSchema = error?.code === 'PGRST205' || error?.code === '42P01'
  const passed = !!error && !isMissingSchema && (error.code === '42501' || error.message.includes('permission denied'))
  results.push({
    test: `SEC-PROBE-01: Anonymous SELECT on public.${tableName}`,
    expected: '42501 permission denied (table deployed & RLS-protected)',
    actual: error ? `${error.code}: ${error.message}` : `Unexpected 200 OK (${data?.length} rows)`,
    passed
  })
  console.log(
    `[${passed ? 'PASS' : 'FAIL'}] public.${tableName} SELECT ->`,
    error
      ? (isMissingSchema ? `${error.code}: Table not deployed to hosted Supabase (${error.message})` : `${error.code}: ${error.message}`)
      : 'EXPOSED!',
  )
}

async function probeRpcFunction(functionName, params) {
  const { data, error } = await client.rpc(functionName, params)
  const passed = !!error && (error.code === '42501' || error.message.includes('permission denied'))
  results.push({
    test: `SEC-PROBE-02: Anonymous EXECUTE on public.${functionName}`,
    expected: '42501 permission denied',
    actual: error ? `${error.code}: ${error.message}` : `Unexpected return: ${JSON.stringify(data)}`,
    passed
  })
  console.log(`[${passed ? 'PASS' : 'FAIL'}] RPC public.${functionName} ->`, error ? `${error.code}: ${error.message}` : 'EXPOSED!')
}

async function probeEnquiryInsert() {
  const dummyTenantId = '00000000-0000-0000-0000-000000000000'
  const token = 'ENQ-PROBE-' + Date.now()
  const { data, error } = await client.from('tenant_enquiries').insert({
    tenant_id: dummyTenantId,
    enquiry_token: token,
    parent_name: 'Security Auditor',
    parent_phone: '9999999999',
    student_name: 'Candidate Trainee',
    sport: 'Football',
    request_type: 'free_trial'
  })

  // Should fail because tenant 0000... does not exist / is not active
  const passed = !!error
  results.push({
    test: 'SEC-PROBE-03: Anonymous INSERT on tenant_enquiries for non-existent tenant',
    expected: 'Denied by RLS WITH CHECK or Foreign Key',
    actual: error ? `${error.code}: ${error.message}` : 'Unexpected success',
    passed
  })
  console.log(`[${passed ? 'PASS' : 'FAIL'}] tenant_enquiries invalid insert ->`, error ? `${error.code}: ${error.message}` : 'EXPOSED!')
}

async function run() {
  const tables = [
    'profiles',
    'tenants',
    'tenant_memberships',
    'tenant_batches',
    'tenant_students',
    'tenant_enquiries',
    'tenant_fee_invoices',
    'tenant_fee_transactions',
    'tenant_attendance_events',
    'tenant_units',
    'tenant_invitations',
    'saas_audit_logs',
    'saas_subscriptions',
    'tenant_audit_logs',
    'creator_profiles',
    'creator_reward_ledger',
    'campaign_organisations',
    'coach_profiles',
    'coach_verification_submissions',
    'coach_athletes',
    'coach_athlete_notes',
    'coach_training_programmes',
    'coach_programme_assignments',
    'coach_training_sessions',
    'coach_session_attendance',
    'coach_athlete_assessments',
    'academy_profiles',
    'academy_coaches',
    'academy_staff_branch_assignments',
    'academy_training_sessions',
    'academy_facilities',
    'academy_trial_postings',
    'academy_announcements',
  ]

  console.log('\n--- 1. Testing Fail-Closed Anonymous Access on Tenant Tables ---')
  for (const table of tables) {
    await probeTableSelect(table)
  }

  console.log('\n--- 2. Testing Least-Privilege Function Grants for Anonymous Role ---')
  await probeRpcFunction('is_tenant_member', { p_tenant_id: '00000000-0000-0000-0000-000000000000' })
  await probeRpcFunction('has_tenant_role', { p_tenant_id: '00000000-0000-0000-0000-000000000000', p_roles: ['owner'] })
  await probeRpcFunction('provision_initial_tenant_owner', {
    p_slug: 'probe-tenant',
    p_name: 'Probe Tenant',
    p_tenant_type: 'academy'
  })
  await probeRpcFunction('has_tenant_permission', { p_tenant_id: '00000000-0000-0000-0000-000000000000', p_permission: 'org:team' })
  await probeRpcFunction('admin_moderate_tenant_verification', { p_tenant_id: '00000000-0000-0000-0000-000000000000', p_verification_status: 'verified' })
  await probeRpcFunction('admin_set_tenant_directory_publication', { p_tenant_id: '00000000-0000-0000-0000-000000000000', p_publication_status: 'approved' })
  await probeRpcFunction('admin_set_tenant_operational_status', { p_tenant_id: '00000000-0000-0000-0000-000000000000', p_status: 'suspended' })

  console.log('\n--- 3. Testing Public Admissions Intake Validation & P0 Directory/Tenant Gates ---')
  await probeEnquiryInsert()

  const { error: directTenantInsertErr } = await client.from('tenants').insert({
    slug: 'probe-bypass-' + Date.now(),
    name: 'Probe Bypass Academy',
    tenant_type: 'academy',
  })
  const directInsertDenied = !!directTenantInsertErr && (directTenantInsertErr.code === '42501' || directTenantInsertErr.message.includes('permission denied'))
  results.push({
    test: 'SEC-PROBE-04: Direct client INSERT on public.tenants',
    expected: '42501 permission denied',
    actual: directTenantInsertErr ? `${directTenantInsertErr.code}: ${directTenantInsertErr.message}` : 'EXPOSED!',
    passed: directInsertDenied,
  })
  console.log(`[${directInsertDenied ? 'PASS' : 'FAIL'}] direct tenants INSERT ->`, directTenantInsertErr ? `${directTenantInsertErr.code}: ${directTenantInsertErr.message}` : 'EXPOSED!')

  const { data: unverifiedDirRows, error: dirQueryErr } = await client
    .from('tenant_public_directory')
    .select('id, verification_status, directory_publication_status')
    .or('verification_status.neq.verified,directory_publication_status.neq.approved')
  const noUnverifiedDir = !dirQueryErr && Array.isArray(unverifiedDirRows) && unverifiedDirRows.length === 0
  results.push({
    test: 'SEC-PROBE-05: Zero unverified/unapproved rows visible in tenant_public_directory',
    expected: '200 OK with 0 rows matching unverified or non-approved',
    actual: dirQueryErr ? `${dirQueryErr.code}: ${dirQueryErr.message}` : `${unverifiedDirRows?.length ?? 0} exposed rows`,
    passed: noUnverifiedDir,
  })
  console.log(`[${noUnverifiedDir ? 'PASS' : 'FAIL'}] tenant_public_directory gate ->`, dirQueryErr ? `${dirQueryErr.code}: ${dirQueryErr.message}` : `${unverifiedDirRows?.length ?? 0} unverified/unapproved rows`)

  console.log('\n' + '='.repeat(80))
  const allPassed = results.every(r => r.passed)
  console.log(`PROBE SUMMARY: ${results.filter(r => r.passed).length}/${results.length} security checks PASSED.`)
  console.log('='.repeat(80))

  fs.writeFileSync('scripts/remote-rls-probe-output.json', JSON.stringify(results, null, 2))
  if (!allPassed) {
    process.exitCode = 1
  }
}

run().catch(err => {
  console.error('Probe execution fatal error:', err)
  process.exit(1)
})
