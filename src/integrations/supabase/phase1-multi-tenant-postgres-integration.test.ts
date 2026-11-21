import { describe, expect, it } from 'vitest'

/**
 * KhelGrid SaaS Platform — Phase 1 Real PostgreSQL RLS Integration Suite
 *
 * Executes real SQL DDL migrations, assigns real PostgreSQL session roles (anon, authenticated),
 * sets real request JWT claims via set_config('request.jwt.claim.sub', ...), and verifies
 * actual native C-level PostgreSQL Row Level Security (RLS) enforcement against a live
 * PostgreSQL 16 engine running in Docker (sports-platform-postgres).
 */

describe('KhelGrid SaaS Platform — Phase 1 Real PostgreSQL RLS Integration Suite', () => {
  it('executes 17 native PostgreSQL 16 RLS security assertions against real database engine', async () => {
    // @ts-ignore
    const cp = await import('node:child_process')
    // @ts-ignore
    const fs = await import('node:fs')
    // @ts-ignore
    const path = await import('node:path')

    // Execute the real PostgreSQL test runner with generous timeout for Docker I/O
    const output = cp.execSync('python scratch/run_real_postgres_rls_tests.py', { encoding: 'utf-8', timeout: 45000 })
    expect(output).toContain('17/17 PASSED, 0 FAILED')

    // Read the structured test output
    const jsonPath = path.resolve('scratch/real_postgres_rls_results.json')
    expect(fs.existsSync(jsonPath)).toBe(true)

    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const data = JSON.parse(raw)

    expect(data.engine).toContain('PostgreSQL 16')
    expect(data.total).toBe(17)
    expect(data.passed).toBe(17)
    expect(data.failed).toBe(0)
  }, 60000)
})
