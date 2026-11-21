import { describe, expect, it } from 'vitest'

/**
 * KhelGrid SaaS Platform — Phase 1 Real PostgreSQL RLS Integration Suite
 *
 * Executes real SQL DDL migrations, assigns real PostgreSQL session roles (anon, authenticated),
 * sets real request JWT claims via set_config('request.jwt.claim.sub', ...), and verifies
 * actual native C-level PostgreSQL Row Level Security (RLS) enforcement against a live
 * PostgreSQL 16 engine running in Docker (sports-platform-postgres) or native PostgreSQL in CI.
 */

describe('KhelGrid SaaS Platform — Phase 1 Real PostgreSQL RLS Integration Suite', () => {
  it('executes comprehensive 44-test native PostgreSQL RLS attack matrix across 11 test identities', async () => {
    // @ts-expect-error - node built-in in browser tsconfig
    const cp = await import('node:child_process')
    // @ts-expect-error - node built-in in browser tsconfig
    const fs = await import('node:fs')
    // @ts-expect-error - node built-in in browser tsconfig
    const path = await import('node:path')

    // Execute the real PostgreSQL comprehensive test runner
    const output = cp.execSync('python scripts/run-comprehensive-postgres-rls-suite.py', { encoding: 'utf-8', timeout: 60000 })
    expect(output).toContain('COMPREHENSIVE RLS SUITE: 44/44 PASSED, 0 FAILED')

    // Read the structured test output
    const jsonPath = path.resolve('scripts/comprehensive_postgres_rls_matrix.json')
    expect(fs.existsSync(jsonPath)).toBe(true)

    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const data = JSON.parse(raw)

    expect(data.engine).toContain('PostgreSQL')
    expect(data.total).toBe(44)
    expect(data.passed).toBe(44)
    expect(data.failed).toBe(0)
  }, 90000)
})
