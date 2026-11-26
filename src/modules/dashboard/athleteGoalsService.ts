/**
 * Athlete Goals & Training Milestones Service
 *
 * Provides client-side and offline-first CRUD capabilities for athletes to track,
 * update, and achieve structured performance milestones, normative combine targets,
 * and physical development plans across grassroots sports in India.
 */

export type GoalCategory = 'speed' | 'endurance' | 'strength' | 'skill' | 'match_readiness' | 'general'
export type GoalStatus = 'in_progress' | 'achieved' | 'paused'

export interface AthleteGoal {
  id: string
  userId?: string
  title: string
  sport: string
  category: GoalCategory
  targetMetric: string
  targetValue: string
  currentValue: string
  status: GoalStatus
  deadline?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'khelgrid_athlete_goals_v1'
export const ATHLETE_GOALS_EVENT = 'khelgrid:athlete-goals-updated'

let memoryStore: AthleteGoal[] | null = null

function dispatchGoalsUpdated(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(ATHLETE_GOALS_EVENT))
    } catch {
      // safe fallback in restricted testing environments
    }
  }
}

function loadGoals(): AthleteGoal[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStore ?? []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as AthleteGoal[]
    }
  } catch {
    // fallback to memory
  }
  return memoryStore ?? []
}

function persistGoals(goals: AthleteGoal[]): void {
  memoryStore = goals
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
    } catch {
      // storage quota or disabled
    }
  }
  dispatchGoalsUpdated()
}

export function clearAthleteGoalsForTesting(): void {
  memoryStore = []
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

export function getAthleteGoals(userId?: string): AthleteGoal[] {
  const all = loadGoals()
  if (!userId) return all
  return all.filter(g => !g.userId || g.userId === userId)
}

export function saveAthleteGoal(
  input: Omit<AthleteGoal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): AthleteGoal {
  const current = loadGoals()
  const now = new Date().toISOString()

  if (input.id) {
    const idx = current.findIndex(g => g.id === input.id)
    if (idx >= 0) {
      const updated: AthleteGoal = {
        ...current[idx],
        ...input,
        id: input.id,
        updatedAt: now,
      }
      current[idx] = updated
      persistGoals([...current])
      return updated
    }
  }

  const newGoal: AthleteGoal = {
    ...input,
    id: input.id || `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    status: input.status || 'in_progress',
    category: input.category || 'general',
    createdAt: now,
    updatedAt: now,
  }

  const nextList = [newGoal, ...current]
  persistGoals(nextList)
  return newGoal
}

export function updateGoalProgress(
  goalId: string,
  currentValue: string,
  status?: GoalStatus
): AthleteGoal | null {
  const current = loadGoals()
  const idx = current.findIndex(g => g.id === goalId)
  if (idx < 0) return null

  const now = new Date().toISOString()
  const updated: AthleteGoal = {
    ...current[idx],
    currentValue,
    status: status ?? (current[idx].status),
    updatedAt: now,
  }
  current[idx] = updated
  persistGoals([...current])
  return updated
}

export function deleteAthleteGoal(goalId: string): boolean {
  const current = loadGoals()
  const filtered = current.filter(g => g.id !== goalId)
  if (filtered.length === current.length) return false

  persistGoals(filtered)
  return true
}

export function getAthleteGoalSummary(userId?: string): {
  total: number
  inProgress: number
  achieved: number
  paused: number
} {
  const goals = getAthleteGoals(userId)
  return {
    total: goals.length,
    inProgress: goals.filter(g => g.status === 'in_progress').length,
    achieved: goals.filter(g => g.status === 'achieved').length,
    paused: goals.filter(g => g.status === 'paused').length,
  }
}
