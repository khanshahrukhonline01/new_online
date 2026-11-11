import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminControlPanelPage } from './AdminControlPanelPage'

describe('AdminControlPanelPage', () => {
  it('does not render protected moderation or super-admin controls before database authorization resolves', () => {
    const html = renderToStaticMarkup(<AdminControlPanelPage />)
    expect(html).toContain('Checking secure moderation access')
    expect(html).not.toContain('Super-admin access management')
    expect(html).not.toContain('Authorized accounts')
    expect(html).not.toContain('Evidence register')
  })
})
