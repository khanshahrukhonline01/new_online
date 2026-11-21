import { describe, it, expect } from 'vitest'

describe('KhelGrid SaaS Platform — Phase 1 Test Runner Safety Verification', () => {
  it('successfully passes the internal safety rejection test suite', async () => {
    // @ts-expect-error - node built-in in browser tsconfig
    const cp = await import('node:child_process')
    const res = cp.spawnSync('python', ['scripts/run-comprehensive-postgres-rls-suite.py', '--test-safety-rejection'], {
      encoding: 'utf-8',
    })

    expect(res.status).toBe(0)
    expect(res.stdout).toContain('[SAFETY REJECTION VERIFIED]')
    expect(res.stdout).toContain("Remote Supabase host': correctly rejected/allowed")
    expect(res.stdout).toContain("Supabase pooler': correctly rejected/allowed")
    expect(res.stdout).toContain("AWS cloud host': correctly rejected/allowed")
    expect(res.stdout).toContain("Local production db': correctly rejected/allowed")
    expect(res.stdout).toContain("Missing opt-in': correctly rejected/allowed")
  })

  it('fails closed when KHELGRID_LOCAL_RLS_TEST is missing', async () => {
    // @ts-expect-error - node built-in in browser tsconfig
    const cp = await import('node:child_process')
    const proc = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process
    const envWithoutOptIn = { ...proc.env }
    delete envWithoutOptIn.KHELGRID_LOCAL_RLS_TEST

    const res = cp.spawnSync('python', ['scripts/run-comprehensive-postgres-rls-suite.py'], {
      encoding: 'utf-8',
      env: envWithoutOptIn,
    })

    expect(res.status).toBe(1)
    expect(res.stdout + res.stderr).toContain('Missing required environment variable KHELGRID_LOCAL_RLS_TEST=1')
  })
})
