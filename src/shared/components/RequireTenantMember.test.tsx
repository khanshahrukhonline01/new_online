import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TenantContext, type TenantContextValue } from '../context/tenantContextCore'
import { RequireTenantMember } from './RequireTenantMember'

const makeContext = (overrides: Partial<TenantContextValue> = {}): TenantContextValue => ({
  userId: 'user-1',
  isAuthenticated: true,
  currentTenant: null,
  currentMembership: null,
  userRole: null,
  memberships: [],
  isLoading: false,
  error: 'Could not verify workspace memberships. Please retry.',
  refreshTenant: vi.fn(async () => {}),
  switchTenant: vi.fn(async () => false),
  switchTenantBySlug: vi.fn(async () => false),
  ...overrides,
})

describe('RequireTenantMember', () => {
  it('allows authenticated personal workspaces when tenant membership lookup fails', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider value={makeContext()}>
        <RequireTenantMember personaLabel="Athlete" requireTenantMembership={false}>
          <div>Personal athlete workspace</div>
        </RequireTenantMember>
      </TenantContext.Provider>,
    )

    expect(html).toContain('Personal athlete workspace')
    expect(html).not.toContain('Workspace access could not be verified')
  })

  it('still requires a verified sign-in for personal workspaces', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider value={makeContext({ userId: null, isAuthenticated: false, error: null })}>
        <RequireTenantMember personaLabel="Athlete" requireTenantMembership={false}>
          <div>Personal athlete workspace</div>
        </RequireTenantMember>
      </TenantContext.Provider>,
    )

    expect(html).toContain('Sign in required')
    expect(html).not.toContain('Personal athlete workspace')
  })

  it('fails closed for tenant workspaces when membership verification fails', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider value={makeContext()}>
        <RequireTenantMember personaLabel="Academy">
          <div>Private academy records</div>
        </RequireTenantMember>
      </TenantContext.Provider>,
    )

    expect(html).toContain('Workspace access could not be verified')
    expect(html).not.toContain('Private academy records')
  })

  it('fails closed with explicit error even when matchingMembership exists alongside an unauthorized ?tenant= error', () => {
    const html = renderToStaticMarkup(
      <TenantContext.Provider
        value={makeContext({
          error: 'Access denied. This account does not have an active membership in the requested workspace.',
          memberships: [
            {
              id: 'm-1',
              tenant_id: 't-1',
              user_id: 'user-1',
              role: 'owner',
              status: 'active',
              created_at: '2026-11-27T00:00:00Z',
              updated_at: '2026-11-27T00:00:00Z',
              tenant: {
                id: 't-1',
                slug: 'alpha-academy',
                name: 'Alpha Academy',
                tenant_type: 'academy',
                status: 'active',
                metadata: {},
                created_at: '2026-11-27T00:00:00Z',
                updated_at: '2026-11-27T00:00:00Z',
              },
            },
          ],
        })}
      >
        <RequireTenantMember personaLabel="Academy" requiredTenantTypes={['academy']}>
          <div>Private academy records</div>
        </RequireTenantMember>
      </TenantContext.Provider>,
    )

    expect(html).toContain('Workspace access could not be verified')
    expect(html).toContain('Access denied')
    expect(html).not.toContain('Verifying your secure workspace access')
    expect(html).not.toContain('Private academy records')
  })
})
