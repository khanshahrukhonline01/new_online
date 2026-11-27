import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ParentPortalPage from './ParentPortalPage'
import { TenantContext, type TenantContextValue } from '../../shared/context/tenantContextCore'
import { clearParentPortalMemoryStore } from './parentPortalService'

function makeTenantCtx(overrides: Partial<TenantContextValue> = {}): TenantContextValue {
  return {
    userId: null,
    isAuthenticated: false,
    currentTenant: null,
    currentMembership: null,
    userRole: null,
    memberships: [],
    isLoading: false,
    error: null,
    refreshTenant: vi.fn(async () => {}),
    switchTenant: vi.fn(async () => true),
    switchTenantBySlug: vi.fn(async () => true),
    ...overrides,
  }
}

describe('ParentPortalPage Component Suite', () => {
  beforeEach(() => {
    clearParentPortalMemoryStore()
  })

  it('fails closed when unauthenticated — never exposes demo students or sample invoices', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider value={makeTenantCtx()}>
        <ParentPortalPage />
      </TenantContext.Provider>,
    )
    expect(html).toContain('Sign in required')
    expect(html).toContain('Sign in as Guardian')
    expect(html).toContain('View Sample Demo Tour')
    expect(html).not.toContain('Aarav Sharma')
    expect(html).not.toContain('Vihaan Verma')
    expect(html).not.toContain('INV-2026-NOV-042')
    expect(html).not.toContain('Dr. Sneha Pillai')
  })

  it('renders loading indicator while guardian session is still verifying', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider value={makeTenantCtx({ isLoading: true })}>
        <ParentPortalPage />
      </TenantContext.Provider>,
    )
    expect(html).toContain('Verifying guardian session')
    expect(html).not.toContain('Aarav Sharma')
  })

  it('renders honest empty state when authenticated guardian has zero linked students', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider value={makeTenantCtx({ userId: 'parent-user-1', isAuthenticated: true })}>
        <ParentPortalPage />
      </TenantContext.Provider>,
    )
    expect(html).toContain('No linked athlete passbooks yet')
    expect(html).toContain('Browse Verified Academies')
    expect(html).not.toContain('Aarav Sharma')
    expect(html).not.toContain('INV-2026-NOV-042')
  })
})
