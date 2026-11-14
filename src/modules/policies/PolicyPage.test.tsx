import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PolicyPage from './PolicyPage'

describe('PolicyPage', () => {
  it('renders workplace policy with ethics and safety sections', () => {
    const html = renderToStaticMarkup(
      <PolicyPage path="/workplace-policy" onNavigate={() => {}} />
    )
    expect(html).toContain('Workplace &amp; Professional Conduct Policy')
    expect(html).toContain('WORKPLACE ETHICS &amp; SAFETY')
    expect(html).toContain('Commitment to safety, equality and inclusion')
    expect(html).toContain('Anti-harassment and respectful conduct')
    expect(html).toContain('Fair practices with venue hosts and sports organizers')
    expect(html).toContain('Confidential grievance redressal and whistleblower protection')
    expect(html).toContain('workplace@khelgrid.com')
  })

  it('renders policy directory links including workplace-policy', () => {
    const html = renderToStaticMarkup(
      <PolicyPage path="/workplace-policy" onNavigate={() => {}} />
    )
    expect(html).toContain('href="/workplace-policy"')
    expect(html).toContain('Workplace Policy')
    expect(html).toContain('href="/posh-policy"')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/open-science-policy"')
    expect(html).toContain('Open Science Policy')
  })

  it('renders open science & research ethics policy with Diamond Open Access, ICMR ethics, and FAIR data', () => {
    const html = renderToStaticMarkup(
      <PolicyPage path="/open-science-policy" onNavigate={() => {}} />
    )
    expect(html).toContain('Open Science &amp; Research Ethics Policy')
    expect(html).toContain('OPEN SCIENCE &amp; RESEARCH INTEGRITY')
    expect(html).toContain('Diamond Open Access &amp; CC BY 4.0 Standard')
    expect(html).toContain('Human Subject Ethics &amp; Informed Consent')
    expect(html).toContain('FAIR Primary Data &amp; Code Sharing Mandate')
    expect(html).toContain('Community Peer Review &amp; Scholarly Conduct Code')
    expect(html).toContain('Version of Record (VoR) Linking')
    expect(html).toContain('href="/open-science-policy"')
  })

  it('renders not found for unknown path', () => {
    const html = renderToStaticMarkup(
      <PolicyPage path="/unknown-policy" onNavigate={() => {}} />
    )
    expect(html).toContain('Policy not found')
  })
})
