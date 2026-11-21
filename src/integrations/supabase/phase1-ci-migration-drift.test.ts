import { describe, expect, it } from 'vitest'

/**
 * KhelGrid SaaS Platform — Phase 1 CI Migration Sequence Parity Test
 * 
 * Verifies that the primary `quality` workflow job and the standalone
 * `postgres-rls-integration` workflow job apply the identical sequence
 * of Phase 1 database migrations without drift or omission.
 */

describe('KhelGrid SaaS Platform — CI Migration Drift Verification', () => {
  it('detects zero migration-sequence drift between quality and postgres-rls-integration jobs', async () => {
    // @ts-expect-error - node built-in
    const fs = await import('node:fs')
    // @ts-expect-error - node built-in
    const path = await import('node:path')

    const ciPath = path.resolve('.github/workflows/ci.yml')
    expect(fs.existsSync(ciPath)).toBe(true)

    const content = fs.readFileSync(ciPath, 'utf-8')

    // Split jobs
    const qualityIdx = content.indexOf('quality:')
    const postgresRlsIdx = content.indexOf('postgres-rls-integration:')

    expect(qualityIdx).toBeGreaterThan(-1)
    expect(postgresRlsIdx).toBeGreaterThan(-1)

    const qualitySection = content.substring(qualityIdx, postgresRlsIdx)
    const postgresRlsSection = content.substring(postgresRlsIdx)

    // Extract Phase 1 migrations applied in each job
    const phase1Regex = /supabase\/migrations\/(20261121[0-9]{6}_[a-z0-9_]+\.sql)/g

    const qualityMigrations: string[] = []
    let m: RegExpExecArray | null
    while ((m = phase1Regex.exec(qualitySection)) !== null) {
      qualityMigrations.push(m[1])
    }

    const rlsMigrations: string[] = []
    while ((m = phase1Regex.exec(postgresRlsSection)) !== null) {
      rlsMigrations.push(m[1])
    }

    // Both jobs must apply all 5 Phase 1 migrations
    expect(qualityMigrations).toHaveLength(5)
    expect(rlsMigrations).toHaveLength(5)

    // The sequence must be identical
    expect(rlsMigrations).toEqual(qualityMigrations)

    // Specifically verify the final privacy remediation and projection table migrations are in the sequence
    expect(rlsMigrations[3]).toBe('20261121220000_phase1_tenant_information_disclosure_remediation.sql')
    expect(rlsMigrations[4]).toBe('20261121230000_phase1_tenant_public_directory_projection_table.sql')

    // Verify assertion script executes after migrations in both jobs
    expect(qualitySection).toContain('phase-1-multi-tenant-rls-assertions.sql')
    expect(postgresRlsSection).toContain('phase-1-multi-tenant-rls-assertions.sql')

    // Verify both jobs use isolated local PostgreSQL databases, NOT remote/production
    expect(qualitySection).toContain('DATABASE_URL: postgresql://postgres:postgres@localhost:5432/khelgrid_test')
    expect(postgresRlsSection).toContain('DATABASE_URL: postgresql://postgres:postgres@localhost:5432/khelgrid_rls_ci')
    expect(content).not.toContain('DATABASE_URL: postgresql://postgres:postgres@localhost:5432/khelgrid_production')
    expect(content).not.toContain('DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres')
  })
})
