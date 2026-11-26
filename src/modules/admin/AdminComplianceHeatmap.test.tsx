import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminComplianceHeatmap } from './AdminComplianceHeatmap'
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard'
import { resetAdminTrustSafetyForTesting } from '../../../apps/admin/src/services/adminTrustSafetyService'
import { resetAdminVerificationsForTesting } from '../../../apps/admin/src/services/adminVerificationService'
import { resetAdminTenantsForTesting } from '../../../apps/admin/src/services/adminTenantService'

describe('AdminComplianceHeatmap & Analytics Integration (SSR smoke)', () => {
  beforeEach(() => {
    resetAdminTrustSafetyForTesting()
    resetAdminVerificationsForTesting()
    resetAdminTenantsForTesting()
  })

  it('renders the Compliance Risk Heatmap section with dimension and scope controls', () => {
    const html = renderToStaticMarkup(<AdminComplianceHeatmap />)
    expect(html).toContain('Compliance Risk Heatmap')
    expect(html).toContain('By Partner Category')
    expect(html).toContain('By Incident Type')
    expect(html).toContain('All Signals')
    expect(html).toContain('High Risk Only')
    expect(html).toContain('data-testid="compliance-risk-heatmap"')
    expect(html).toContain('data-testid="heatmap-cell-inspector"')
  })

  it('mounts the Compliance Risk Heatmap and CSV Export controls inside AdminAnalyticsDashboard when shellAuthorized', () => {
    const html = renderToStaticMarkup(<AdminAnalyticsDashboard shellAuthorized />)
    expect(html).toContain('Operations Analytics')
    expect(html).toContain('Compliance Risk Heatmap')
    expect(html).toContain('data-testid="compliance-risk-heatmap"')
    expect(html).toContain('data-testid="export-compliance-csv-btn"')
    expect(html).toContain('data-testid="export-csv-menu-toggle"')
    expect(html).toContain('data-testid="export-drilldown-csv-btn"')
  })
})
