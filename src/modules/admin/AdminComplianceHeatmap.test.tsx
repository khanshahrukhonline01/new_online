import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminComplianceHeatmap } from './AdminComplianceHeatmap'
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard'
import { AdminDataFreshnessIndicator } from './AdminDataFreshnessIndicator'
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

  it('mounts the Compliance Risk Heatmap, Date Range Picker, Freshness Indicator, and CSV Export controls inside AdminAnalyticsDashboard when shellAuthorized', () => {
    const html = renderToStaticMarkup(<AdminAnalyticsDashboard shellAuthorized />)
    expect(html).toContain('Operations Analytics')
    expect(html).toContain('Compliance Risk Heatmap')
    expect(html).toContain('data-testid="compliance-risk-heatmap"')
    expect(html).toContain('data-testid="analytics-date-range-trigger"')
    expect(html).toContain('Last 30 Days')
    expect(html).toContain('data-testid="analytics-freshness-indicator"')
    expect(html).toContain('data-testid="analytics-refresh-now-btn"')
    expect(html).toContain('data-testid="export-compliance-csv-btn"')
    expect(html).toContain('data-testid="export-csv-menu-toggle"')
    expect(html).toContain('data-testid="export-drilldown-csv-btn"')
  })

  it('renders AdminDataFreshnessIndicator with relative refresh timestamp and Refresh Now trigger when idle', () => {
    const html = renderToStaticMarkup(
      <AdminDataFreshnessIndicator
        lastRefreshedAt={new Date()}
        isRefreshing={false}
        autoRefreshEnabled={false}
        onRefreshNow={() => {}}
      />,
    )
    expect(html).toContain('Last refreshed')
    expect(html).toContain('Refresh Now')
    expect(html).toContain('data-testid="analytics-freshness-indicator"')
    expect(html).toContain('data-testid="analytics-refresh-now-btn"')
  })
})
