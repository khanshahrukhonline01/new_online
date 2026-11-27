import { createContext } from 'react'
import type { DbTenant, DbTenantMembership } from '../../integrations/supabase/tenant-client'

export interface TenantContextValue {
  userId: string | null
  isAuthenticated: boolean
  currentTenant: DbTenant | null
  currentMembership: DbTenantMembership | null
  userRole: string | null
  memberships: DbTenantMembership[]
  isLoading: boolean
  error: string | null
  refreshTenant: () => Promise<void>
  switchTenant: (tenantId: string) => Promise<boolean>
  switchTenantBySlug: (slug: string) => Promise<boolean>
}

export const TenantContext = createContext<TenantContextValue | undefined>(undefined)
