import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAthleteGoalsForTesting,
  deleteAthleteGoal,
  getAthleteGoals,
  getAthleteGoalSummary,
  saveAthleteGoal,
  updateGoalProgress,
} from './athleteGoalsService'

describe('athleteGoalsService', () => {
  beforeEach(() => {
    clearAthleteGoalsForTesting()
  })

  it('performs complete CRUD cycle for athlete performance goals', () => {
    // 1. Create
    const created = saveAthleteGoal({
      userId: 'usr-1',
      title: 'Sub 11.5s 100m sprint',
      sport: 'Athletics',
      category: 'speed',
      targetMetric: '100m sprint time',
      targetValue: '11.40s',
      currentValue: '11.85s',
      status: 'in_progress',
      notes: 'Focus on block start reaction time',
    })

    expect(created.id).toBeDefined()
    expect(created.title).toBe('Sub 11.5s 100m sprint')

    // 2. Read
    const goals = getAthleteGoals('usr-1')
    expect(goals).toHaveLength(1)
    expect(goals[0].targetValue).toBe('11.40s')

    // 3. Update progress
    const updated = updateGoalProgress(created.id, '11.38s', 'achieved')
    expect(updated).not.toBeNull()
    expect(updated?.currentValue).toBe('11.38s')
    expect(updated?.status).toBe('achieved')

    // Summary calculation
    const summary = getAthleteGoalSummary('usr-1')
    expect(summary.total).toBe(1)
    expect(summary.achieved).toBe(1)
    expect(summary.inProgress).toBe(0)

    // 4. Delete
    const deleted = deleteAthleteGoal(created.id)
    expect(deleted).toBe(true)
    expect(getAthleteGoals('usr-1')).toHaveLength(0)
  })

  it('isolates goals by userId and ignores unowned records when filtered', () => {
    saveAthleteGoal({
      userId: 'athlete-a',
      title: 'Beep test level 12',
      sport: 'Football',
      category: 'endurance',
      targetMetric: 'Yo-Yo Test',
      targetValue: '18.1',
      currentValue: '16.5',
      status: 'in_progress',
    })

    saveAthleteGoal({
      userId: 'athlete-b',
      title: 'Bowling speed 130 km/h',
      sport: 'Cricket',
      category: 'strength',
      targetMetric: 'Bowling Radar',
      targetValue: '130 km/h',
      currentValue: '124 km/h',
      status: 'in_progress',
    })

    const aGoals = getAthleteGoals('athlete-a')
    expect(aGoals).toHaveLength(1)
    expect(aGoals[0].title).toBe('Beep test level 12')

    const bGoals = getAthleteGoals('athlete-b')
    expect(bGoals).toHaveLength(1)
    expect(bGoals[0].title).toBe('Bowling speed 130 km/h')
  })
})
