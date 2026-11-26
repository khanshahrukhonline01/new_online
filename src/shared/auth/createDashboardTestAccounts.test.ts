import { describe, it, expect } from 'vitest'
// @ts-expect-error - Node CLI provisioning script without generated .d.ts
import { buildTestAccountMatrix, parseCliArgs, runProvisioning } from '../../../scripts/create-dashboard-test-accounts.mjs'

interface TestAccountMatrixEntry {
  key: string
  dashboard: string
  email: string
  authRole: string
  expectedRoute: string
}

describe('create-dashboard-test-accounts CLI script', () => {
  it('covers all 8 primary dashboards plus scout and multi-tenant owner accounts', () => {
    const matrix = buildTestAccountMatrix({ domain: 'qa.khelgrid.in' }) as TestAccountMatrixEntry[]
    expect(matrix).toHaveLength(10)

    const keys = matrix.map(item => item.key)
    expect(keys).toEqual([
      'athlete',
      'coach',
      'academy',
      'venue',
      'tournament',
      'org',
      'creator',
      'parent',
      'scout',
      'multi',
    ])

    const routes = matrix.map(item => item.expectedRoute)
    expect(routes).toContain('/workspace/athlete/overview')
    expect(routes).toContain('/workspace/coach/overview?tenant=qa-coach-hub')
    expect(routes).toContain('/workspace/academy/overview?tenant=qa-apex-academy')
    expect(routes).toContain('/workspace/turf/calendar?tenant=qa-metro-turf')
    expect(routes).toContain('/workspace/tournament/overview?tenant=qa-youth-cup')
    expect(routes).toContain('/workspace/organization/overview?tenant=qa-state-federation')
    expect(routes).toContain('/workspace/creator/overview')
    expect(routes).toContain('/workspace/parent/attendance')
    expect(routes).toContain('/scout-portal')
  })

  it('supports --plus-email aliases cleanly for real Gmail inbox routing', () => {
    const plusMatrix = buildTestAccountMatrix({ plusEmail: 'khelgrid@gmail.com' }) as TestAccountMatrixEntry[]
    const emails = plusMatrix.map(item => item.email)
    expect(emails).toContain('khelgrid+athlete@gmail.com')
    expect(emails).toContain('khelgrid+coach@gmail.com')
    expect(emails).toContain('khelgrid+academy@gmail.com')
    expect(emails).toContain('khelgrid+venue@gmail.com')
    expect(emails).toContain('khelgrid+tournament@gmail.com')
    expect(emails).toContain('khelgrid+org@gmail.com')
    expect(emails).toContain('khelgrid+creator@gmail.com')
    expect(emails).toContain('khelgrid+parent@gmail.com')
    expect(emails).toContain('khelgrid+multi@gmail.com')
  })

  it('parses CLI options and executes --dry-run safely without secrets', async () => {
    const parsed = parseCliArgs([
      '--plus-email=khelgrid@gmail.com',
      '--generate-passwords',
      '--dry-run',
    ])
    expect(parsed.plusEmail).toBe('khelgrid@gmail.com')
    expect(parsed.generatePasswords).toBe(true)
    expect(parsed.dryRun).toBe(true)

    const dry = await runProvisioning(['--dry-run', '--plus-email=khelgrid@gmail.com'])
    expect(dry.dryRun).toBe(true)
    expect(dry.accounts).toHaveLength(10)
  })
})
