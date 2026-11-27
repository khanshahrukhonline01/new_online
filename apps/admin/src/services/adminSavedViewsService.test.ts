import { describe, it, expect, beforeEach } from 'vitest'
import {
  deleteSavedView,
  formatSavedViewFilterSummary,
  listSavedViews,
  resetSavedViewsForTesting,
  saveFilterView,
  togglePinSavedView,
} from './adminSavedViewsService'

describe('adminSavedViewsService', () => {
  beforeEach(() => {
    resetSavedViewsForTesting()
  })

  it('lists built-in presets per desk and creates, pins, and deletes custom views', () => {
    const builtInInbox = listSavedViews('regulatory_inbox')
    expect(builtInInbox.length).toBeGreaterThanOrEqual(2)
    expect(builtInInbox.some(v => v.filters.sla === 'breached')).toBe(true)

    const created = saveFilterView({
      desk: 'moderation_desk',
      name: 'Mumbai Pending Venues',
      filters: { status: 'pending_review', city: 'Mumbai', sport: 'all' },
      createdBy: 'superadmin@khelgrid.com',
    })

    // Strips 'all' default filter entries
    expect(created.filters).toEqual({ status: 'pending_review', city: 'Mumbai' })
    expect(created.isPinned).toBe(true)

    const unpinned = togglePinSavedView(created.id)
    expect(unpinned?.isPinned).toBe(false)

    expect(deleteSavedView(created.id)).toBe(true)
    expect(listSavedViews('moderation_desk').some(v => v.id === created.id)).toBe(false)
  })

  it('formats human-readable filter summaries and rejects empty names', () => {
    expect(formatSavedViewFilterSummary({ status: 'pending_review', city: 'Delhi' })).toBe(
      'status: pending review · city: Delhi',
    )
    expect(formatSavedViewFilterSummary({ status: 'all' })).toBe('All records')

    expect(() =>
      saveFilterView({
        desk: 'audit_explorer',
        name: '   ',
        filters: {},
        createdBy: 'admin@khelgrid.com',
      }),
    ).toThrow()
  })
})
