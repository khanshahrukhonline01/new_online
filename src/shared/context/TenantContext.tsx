import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import {
  getUserTenantMemberships,
  type DbTenant,
  type DbTenantMembership,
} from '../../integrations/supabase/tenant-client'
import { TenantContext } from './tenantContextCore'
export type { TenantContextValue } from './tenantContextCore'

export interface TenantProviderProps {
  children: ReactNode
  initialTenantSlug?: string
  initialLoading?: boolean
}

/**
 * Resolves tenant context from the live Supabase Auth session and RLS-filtered
 * tenant_memberships rows. Browser profile/localStorage values are never used
 * as proof of identity or membership.
 */
export function TenantProvider({ children, initialTenantSlug, initialLoading = false }: TenantProviderProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [currentTenant, setCurrentTenant] = useState<DbTenant | null>(null)
  const [currentMembership, setCurrentMembership] = useState<DbTenantMembership | null>(null)
  const [memberships, setMemberships] = useState<DbTenantMembership[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading || true)
  const [error, setError] = useState<string | null>(null)

  const clearMemberships = useCallback(() => {
    setUserId(null)
    setMemberships([])
    setCurrentTenant(null)
    setCurrentMembership(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const resolveForUser = useCallback(async (nextUserId: string | null) => {
    if (!nextUserId) {
      clearMemberships()
      return
    }

    setIsLoading(true)
    setError(null)
    setUserId(nextUserId)
    try {
      const rows = await getUserTenantMemberships(nextUserId)
      const safeRows = rows.filter(row =>
        row.user_id === nextUserId &&
        row.status === 'active' &&
        row.tenant?.status === 'active'
      )
      setMemberships(safeRows)

      const selected = (initialTenantSlug
        ? safeRows.find(row => row.tenant?.slug === initialTenantSlug)
        : undefined) || safeRows[0] || null
      setCurrentMembership(selected)
      setCurrentTenant(selected?.tenant || null)
    } catch (err) {
      setMemberships([])
      setCurrentMembership(null)
      setCurrentTenant(null)
      setError(err instanceof Error ? err.message : 'Workspace membership could not be verified.')
    } finally {
      setIsLoading(false)
    }
  }, [clearMemberships, initialTenantSlug])

  const refreshTenant = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) {
      clearMemberships()
      setError('Authentication service is not configured. Workspace access is unavailable.')
      return
    }
    const { data, error: sessionError } = await client.auth.getSession()
    if (sessionError) {
      clearMemberships()
      setError('Could not verify your sign-in session. Please sign in again.')
      return
    }
    await resolveForUser(data.session?.user.id ?? null)
  }, [clearMemberships, resolveForUser])

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      clearMemberships()
      setError('Authentication service is not configured. Workspace access is unavailable.')
      return
    }

    let active = true
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        clearMemberships()
        setError('Could not verify your sign-in session. Please sign in again.')
        return
      }
      void resolveForUser(data.session?.user.id ?? null)
    })

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      // Defer network work outside Supabase's auth callback to avoid blocking it.
      queueMicrotask(() => {
        if (active) void resolveForUser(session?.user.id ?? null)
      })
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [clearMemberships, resolveForUser])

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    const target = memberships.find(row =>
      row.tenant_id === tenantId &&
      row.user_id === userId &&
      row.status === 'active' &&
      row.tenant?.status === 'active'
    )
    if (!target) {
      setError('Access denied. This account does not have an active membership in that workspace.')
      return false
    }
    setError(null)
    setCurrentMembership(target)
    setCurrentTenant(target.tenant || null)
    return true
  }, [memberships, userId])

  const switchTenantBySlug = useCallback(async (slug: string): Promise<boolean> => {
    const target = memberships.find(row =>
      row.tenant?.slug === slug &&
      row.user_id === userId &&
      row.status === 'active' &&
      row.tenant?.status === 'active'
    )
    if (!target) {
      setError('Access denied. This account is not a member of that workspace.')
      return false
    }
    setError(null)
    setCurrentMembership(target)
    setCurrentTenant(target.tenant || null)
    return true
  }, [memberships, userId])

  return (
    <TenantContext.Provider
      value={{
        userId,
        isAuthenticated: Boolean(userId),
        currentTenant,
        currentMembership,
        userRole: currentMembership?.role || null,
        memberships,
        isLoading,
        error,
        refreshTenant,
        switchTenant,
        switchTenantBySlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
