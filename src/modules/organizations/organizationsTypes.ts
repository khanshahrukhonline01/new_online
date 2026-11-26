export type WorkspaceTab =
  | 'overview'
  | 'team'
  | 'permissions'
  | 'entitlements'
  | 'governance'

export function resolveOrgTabForSection(section?: string): WorkspaceTab {
  switch ((section || '').toLowerCase()) {
    case 'team':
    case 'members':
    case 'invites':
    case 'rbac':
      return 'team'
    case 'permissions':
    case 'ownership':
    case 'resources':
      return 'permissions'
    case 'entitlements':
    case 'metering':
    case 'plans':
    case 'billing':
      return 'entitlements'
    case 'governance':
    case 'branches':
    case 'units':
    case 'audit':
    case 'matrix':
      return 'governance'
    default:
      return 'overview'
  }
}
