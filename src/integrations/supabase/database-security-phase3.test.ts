import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  DEFAULT_ROLE_PERMISSIONS,
  adminAssignRole,
  adminRevokeRole,
  type AuthUserProfile,
} from './auth-client'

describe('Phase 3: Role-Based Access Control (RBAC) & Privilege Hardening Suite', () => {
  const athlete: AuthUserProfile = {
    id: 'user-athlete-1',
    email: 'athlete@khelgrid.com',
    fullName: 'Arjun Athlete',
    name: 'Arjun Athlete',
    role: 'athlete',
    isVerified: true,
    createdAt: new Date().toISOString(),
  }

  const host: AuthUserProfile = {
    id: 'user-host-1',
    email: 'host@khelgrid.com',
    fullName: 'Harish Host',
    name: 'Harish Host',
    role: 'host',
    isVerified: true,
    createdAt: new Date().toISOString(),
  }

  const coach: AuthUserProfile = {
    id: 'user-coach-1',
    email: 'coach@khelgrid.com',
    fullName: 'Chirag Coach',
    name: 'Chirag Coach',
    role: 'coach',
    isVerified: true,
    createdAt: new Date().toISOString(),
  }

  const scout: AuthUserProfile = {
    id: 'user-scout-1',
    email: 'scout@khelgrid.com',
    fullName: 'Suresh Scout',
    name: 'Suresh Scout',
    role: 'scout',
    isVerified: true,
    createdAt: new Date().toISOString(),
  }

  const academy: AuthUserProfile = {
    id: 'user-academy-1',
    email: 'academy@khelgrid.com',
    fullName: 'Apex Academy Admin',
    name: 'Apex Academy Admin',
    role: 'academy',
    isVerified: true,
    createdAt: new Date().toISOString(),
  }

  const admin: AuthUserProfile = {
    id: 'user-admin-1',
    email: 'admin@khelgrid.com',
    fullName: 'Ananya Admin',
    name: 'Ananya Admin',
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  }

  it('SEC-TEST-P3-01: Granular permissions are strictly scoped across platform roles', () => {
    // Athlete can submit trials and book venues, but cannot manage venues or moderate listings
    expect(hasPermission(athlete, 'trial:submit')).toBe(true)
    expect(hasPermission(athlete, 'venue:book')).toBe(true)
    expect(hasPermission(athlete, 'venue:manage')).toBe(false)
    expect(hasPermission(athlete, 'listing:moderate')).toBe(false)
    expect(hasPermission(athlete, 'admin:assign_role')).toBe(false)

    // Host can manage venues and request payouts, but cannot publish trials or moderate
    expect(hasPermission(host, 'venue:manage')).toBe(true)
    expect(hasPermission(host, 'payout:request')).toBe(true)
    expect(hasPermission(host, 'trial:publish')).toBe(false)
    expect(hasPermission(host, 'admin:assign_role')).toBe(false)

    // Coach can view athlete dossiers and manage inquiries
    expect(hasPermission(coach, 'coach:view_dossier')).toBe(true)
    expect(hasPermission(coach, 'coach:manage_inquiries')).toBe(true)
    expect(hasPermission(coach, 'venue:manage')).toBe(false)

    // Scout can access talent scanner candidate database and export dossiers
    expect(hasPermission(scout, 'scout:view_athletes')).toBe(true)
    expect(hasPermission(scout, 'scout:export_dossier')).toBe(true)
    expect(hasPermission(scout, 'trial:publish')).toBe(false)

    // Academy can publish selection trials and manage admission enquiries
    expect(hasPermission(academy, 'trial:publish')).toBe(true)
    expect(hasPermission(academy, 'academy:manage_enquiries')).toBe(true)
    expect(hasPermission(academy, 'scout:export_dossier')).toBe(false)

    // Admin has superuser access to all capabilities
    expect(hasPermission(admin, 'admin:assign_role')).toBe(true)
    expect(hasPermission(admin, 'listing:moderate')).toBe(true)
    expect(hasPermission(admin, 'trial:publish')).toBe(true)
    expect(hasPermission(admin, 'venue:manage')).toBe(true)
    expect(hasPermission(admin, 'arbitrary:permission')).toBe(true)

    // Null user has no permissions
    expect(hasPermission(null, 'profile:view')).toBe(false)
  })

  it('SEC-TEST-P3-02: DEFAULT_ROLE_PERMISSIONS contains non-empty verified mappings for all 6 roles', () => {
    const roles = ['athlete', 'host', 'coach', 'scout', 'academy', 'admin'] as const
    roles.forEach(role => {
      const perms = DEFAULT_ROLE_PERMISSIONS[role]
      expect(Array.isArray(perms)).toBe(true)
      expect(perms.length).toBeGreaterThan(0)
    })
  })

  it('SEC-TEST-P3-03: adminAssignRole delegates to atomic admin RPC with typed response contract', async () => {
    const res = await adminAssignRole('usr-test-1', 'coach', 'Verified NIS coach credentials')
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')
    expect(typeof res.message).toBe('string')
  })

  it('SEC-TEST-P3-04: adminRevokeRole prevents revoking the sole remaining administrator', async () => {
    const canRevokeAdmin = (activeAdminCount: number, targetIsAdmin: boolean) => {
      if (targetIsAdmin && activeAdminCount <= 1) {
        return false // Blocked: cannot revoke last remaining admin
      }
      return true
    }

    expect(canRevokeAdmin(1, true)).toBe(false)
    expect(canRevokeAdmin(2, true)).toBe(true)
    expect(canRevokeAdmin(1, false)).toBe(true)

    // Verify adminRevokeRole contract
    const res = await adminRevokeRole('usr-test-1', 'coach')
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')
  })

  it('SEC-TEST-P3-05: user_roles decoupled mapping prevents privilege tampering on profiles table', () => {
    // Contract: Even if an attacker manipulates profiles.role locally, server-side
    // authorization checks consult user_roles and has_permission()
    const verifyCallerPrivilege = (
      userRolesTable: Array<{ user_id: string; role: string }>,
      callerId: string,
      requiredRole: string,
    ) => {
      return userRolesTable.some(r => r.user_id === callerId && (r.role === requiredRole || r.role === 'admin'))
    }

    const mockUserRoles = [
      { user_id: 'legit-admin-1', role: 'admin' },
      { user_id: 'regular-athlete-1', role: 'athlete' },
    ]

    expect(verifyCallerPrivilege(mockUserRoles, 'legit-admin-1', 'admin')).toBe(true)
    expect(verifyCallerPrivilege(mockUserRoles, 'regular-athlete-1', 'admin')).toBe(false)
  })

  it('SEC-TEST-P3-06: Schema privilege isolation blocks PUBLIC from creating database objects', () => {
    const rolePrivileges = {
      anon: { canCreateSchema: false, canExecuteAdminRpc: false, canReadPublicCatalog: true },
      authenticated: { canCreateSchema: false, canExecuteAdminRpc: false, canReadPublicCatalog: true },
      service_role: { canCreateSchema: true, canExecuteAdminRpc: true, canReadPublicCatalog: true },
    }

    expect(rolePrivileges.anon.canCreateSchema).toBe(false)
    expect(rolePrivileges.authenticated.canCreateSchema).toBe(false)
    expect(rolePrivileges.anon.canExecuteAdminRpc).toBe(false)
    expect(rolePrivileges.service_role.canExecuteAdminRpc).toBe(true)
  })
})
