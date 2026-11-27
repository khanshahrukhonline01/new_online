import { useContext } from 'react'
import { TenantContext, type TenantContextValue } from './tenantContextCore'

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext)
  if (!context) {
    return {
      userId: null,
      isAuthenticated: false,
      currentTenant: null,
      currentMembership: null,
      userRole: null,
      memberships: [],
      isLoading: false,
      error: 'Tenant context is unavailable.',
      refreshTenant: async () => {},
      switchTenant: async () => false,
      switchTenantBySlug: async () => false,
    }
  }
  return context
}
