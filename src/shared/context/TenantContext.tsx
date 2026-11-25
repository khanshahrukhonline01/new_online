import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import {
  getUserTenantMemberships,
  getTenantBySlug,
  type DbTenant,
  type DbTenantMembership,
} from '../../integrations/supabase/tenant-client'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'
import { TenantContext } from './tenantContextCore'
export type { TenantContextValue } from './tenantContextCore'

export interface TenantProviderProps {
  children: ReactNode
  initialTenantSlug?: string
  initialLoading?: boolean
}

export function TenantProvider({ children, initialTenantSlug, initialLoading = false }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<DbTenant | null>(null)
  const [currentMembership, setCurrentMembership] = useState<DbTenantMembership | null>(null)
  const [memberships, setMemberships] = useState<DbTenantMembership[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const loadTenantData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const user = getStoredAuthUser()
      if (!user) {
        // Unauthenticated visitor
        setMemberships([])
        setCurrentTenant(null)
        setCurrentMembership(null)
        setIsLoading(false)
        return
      }

      const userMemberships = await getUserTenantMemberships()
      setMemberships(userMemberships)

      if (userMemberships.length > 0) {
        let selected = userMemberships[0]
        if (initialTenantSlug) {
          const match = userMemberships.find(m => m.tenant?.slug === initialTenantSlug)
          if (match) selected = match
        }

        setCurrentMembership(selected)
        setCurrentTenant(selected.tenant || null)
      } else {
        // User has no tenant memberships yet
        setCurrentTenant(null)
        setCurrentMembership(null)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [initialTenantSlug])

  useEffect(() => {
    loadTenantData()

    const handleAuthChange = () => {
      loadTenantData()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('khelgrid:auth-changed', handleAuthChange)
      return () => {
        window.removeEventListener('khelgrid:auth-changed', handleAuthChange)
      }
    }
  }, [loadTenantData])

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    const target = memberships.find(m => m.tenant_id === tenantId)
    if (!target) {
      setError(`Access denied: you do not have an active membership in tenant ${tenantId}`)
      return false
    }

    setCurrentMembership(target)
    setCurrentTenant(target.tenant || null)
    return true
  }

  const switchTenantBySlug = async (slug: string): Promise<boolean> => {
    const target = memberships.find(m => m.tenant?.slug === slug)
    if (target) {
      setCurrentMembership(target)
      setCurrentTenant(target.tenant || null)
      return true
    }

    // Try fetching public tenant if not already in memberships
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      setCurrentTenant(tenant)
      setCurrentMembership(null)
      return true
    }

    return false
  }

  const userRole = currentMembership?.role || null

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        currentMembership,
        userRole,
        memberships,
        isLoading,
        error,
        refreshTenant: loadTenantData,
        switchTenant,
        switchTenantBySlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
