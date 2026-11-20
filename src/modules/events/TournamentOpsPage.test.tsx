import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TournamentOpsPage from './TournamentOpsPage'
import { clearTournamentOpsMemoryStore } from './tournamentOpsEngine'

describe('TournamentOpsPage Component Suite', () => {
  beforeEach(() => {
    clearTournamentOpsMemoryStore()
  })

  it('renders tournament operations workspace header and 4 KPI metric cards', () => {
    const html = renderToStaticMarkup(<TournamentOpsPage />)

    expect(html).toContain('KHELGRID · TOURNAMENT OPERATIONS SUITE')
    expect(html).toContain('National Sports Operations &amp; Tournament Desk')
    expect(html).toContain('Scheduled Matches')
    expect(html).toContain('Squad Age Integrity')
    expect(html).toContain('Pitch-Side Scorer Active')
    expect(html).toContain('Verifiable Certificates Issued')
  })

  it('renders tournament tabs navigation bar', () => {
    const html = renderToStaticMarkup(<TournamentOpsPage />)

    expect(html).toContain('Brackets &amp; Fixtures')
    expect(html).toContain('Anti-Age Fraud Squad Audit')
    expect(html).toContain('Pitch-Side Scorer Console')
    expect(html).toContain('Verifiable Certificates')
  })

  it('renders visual knockout brackets with quarter, semi, and final rounds', () => {
    const html = renderToStaticMarkup(<TournamentOpsPage />)

    expect(html).toContain('Quarter Finals (Round of 8)')
    expect(html).toContain('Semi Finals (Final 4)')
    expect(html).toContain('Championship Final')
    expect(html).toContain('Bengaluru Youth FC')
    expect(html).toContain('Hyderabad Strikers')
    expect(html).toContain('Generate New Bracket')
  })
})
