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
  })

  it('renders not found for unknown path', () => {
    const html = renderToStaticMarkup(
      <PolicyPage path="/unknown-policy" onNavigate={() => {}} />
    )
    expect(html).toContain('Policy not found')
  })
})
