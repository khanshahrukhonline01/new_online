import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PartnerEmailVerificationPage from './PartnerEmailVerificationPage'

describe('PartnerEmailVerificationPage', () => {
  it('renders public verification shell with safe recovery actions and zero admin links', () => {
    const html = renderToStaticMarkup(<PartnerEmailVerificationPage />)
    expect(html).toContain('KHELGRID · PARTNER ACCOUNT VERIFICATION')
    expect(html).toContain('Verifying your email')
    expect(html).toContain('Confirming your email and preparing your partner workspace...')
    expect(html).not.toContain('/admin')
    expect(html).not.toContain('Admin Panel')
  })
})
