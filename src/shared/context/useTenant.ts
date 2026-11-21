import { useContext } from 'react'
import { TenantContext, type TenantContextValue } from './tenantContextCore'

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext)
  if (!context) {
    return {
      currentTenant: null,
      currentMembership: null,
      userRole: null,
      memberships: [],
      isLoading: false,
      error: null,
      refreshTenant: async () => {},
      switchTenant: async () => false,
      switchTenantBySlug: async () => false,
    }
  }
  return context
}
