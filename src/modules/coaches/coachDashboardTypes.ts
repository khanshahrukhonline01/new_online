export type CoachHubTab =
  | 'trainees'
  | 'inquiries'
  | 'batches'
  | 'attendance'
  | 'earnings'
  | 'credentials'
  | 'combines'
  | 'plans'
  | 'endorsements'
  | 'khelo_india'

export interface CoachSummaryStats {
  totalTrainees: number
  paidTrainees: number
  totalRevenue: number
  pendingRevenue: number
  collectionRate: number
  totalBatches: number
  newInquiriesCount: number
}

const SECTION_TO_COACH_TAB: Record<string, CoachHubTab> = {
  overview: 'trainees',
  athletes: 'attendance',
  credentials: 'credentials',
}

/** Maps a WorkspaceShell section id onto a CoachDashboardPage operational tab. */
export function resolveCoachTabForSection(section?: string): CoachHubTab | null {
  if (!section) return null
  return SECTION_TO_COACH_TAB[section] ?? null
}
