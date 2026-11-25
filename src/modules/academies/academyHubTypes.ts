export type AcademyHubTab =
  | 'leads'
  | 'batches'
  | 'fees'
  | 'ledger'
  | 'attendance'
  | 'staff'
  | 'trial_passes'
  | 'kits'
  | 'safeguarding'
  | 'settings'
  | 'audit_logs'

export const ACADEMY_HUB_TABS: readonly AcademyHubTab[] = [
  'leads',
  'batches',
  'fees',
  'ledger',
  'attendance',
  'staff',
  'trial_passes',
  'kits',
  'safeguarding',
  'settings',
  'audit_logs',
]

const SECTION_TO_ACADEMY_TAB: Record<string, AcademyHubTab> = {
  overview: 'leads',
  batches: 'batches',
  coaches: 'staff',
}

/** Maps a WorkspaceShell section id onto an AcademyHubPage operational tab. */
export function resolveAcademyTabForSection(section?: string): AcademyHubTab | null {
  if (!section) return null
  return SECTION_TO_ACADEMY_TAB[section] ?? null
}
