import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminControlPanelPage, getEvidenceChecklist } from './AdminControlPanelPage'

describe('AdminControlPanelPage', () => {
  it('maps evidence to category-specific reviewer checklist states', () => {
    const evidence = [
      { id: 'e1', evidence_type: 'venue_address', outcome: 'supports' },
      { id: 'e2', evidence_type: 'official_source', outcome: 'pending' },
    ] as never as import('../../integrations/supabase/public-client').ListingEvidenceItem[]
    const checklist = getEvidenceChecklist('venue', evidence)
    expect(checklist.find(item => item.type === 'venue_address')?.status).toBe('supported')
    expect(checklist.find(item => item.type === 'official_source')?.status).toBe('pending')
    expect(checklist.find(item => item.type === 'other')?.status).toBe('missing')
  })

  it('does not render protected moderation or super-admin controls before database authorization resolves', () => {
    const html = renderToStaticMarkup(<AdminControlPanelPage />)
    expect(html).toContain('Checking secure moderation access')
    expect(html).not.toContain('Super-admin access management')
    expect(html).not.toContain('Authorized accounts')
    expect(html).not.toContain('Evidence register')
  })
})
