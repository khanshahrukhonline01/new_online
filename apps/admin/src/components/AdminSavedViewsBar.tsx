import { useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import { subscribeRegulatoryState } from '../../../../src/shared/governance/regulatoryBridge'
import {
  deleteSavedView,
  formatSavedViewFilterSummary,
  listSavedViews,
  saveFilterView,
  type AdminSavedFilterView,
  type SavedViewDeskId,
} from '../services/adminSavedViewsService'
import './AdminSavedViewsBar.css'

export interface AdminSavedViewsBarProps {
  desk: SavedViewDeskId
  currentFilters: Record<string, string>
  onApplyFilters: (filters: Record<string, string>, viewName?: string) => void
  onResetFilters?: () => void
  operatorEmail?: string
}

function filtersMatch(
  viewFilters: Record<string, string>,
  currentFilters: Record<string, string>,
): boolean {
  const viewEntries = Object.entries(viewFilters).filter(([, v]) => Boolean(v && v !== 'all'))
  const currentEntries = Object.entries(currentFilters).filter(([, v]) => Boolean(v && v !== 'all'))
  if (viewEntries.length !== currentEntries.length) return false
  return viewEntries.every(([k, v]) => currentFilters[k] === v)
}

export function AdminSavedViewsBar({
  desk,
  currentFilters,
  onApplyFilters,
  onResetFilters,
  operatorEmail = 'admin@khelgrid.com',
}: AdminSavedViewsBarProps) {
  const [views, setViews] = useState<AdminSavedFilterView[]>(() => listSavedViews(desk))
  const [isSavingOpen, setIsSavingOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setViews(listSavedViews(desk))
    return subscribeRegulatoryState(() => {
      setViews(listSavedViews(desk))
    })
  }, [desk])

  const hasActiveFilters = useMemo(
    () => Object.values(currentFilters).some(v => Boolean(v && v !== 'all')),
    [currentFilters],
  )

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draftName.trim()) {
      setSaveError('Enter a short name for this filter preset.')
      return
    }
    try {
      saveFilterView({
        desk,
        name: draftName.trim(),
        filters: currentFilters,
        createdBy: operatorEmail,
        isPinned: true,
      })
      setDraftName('')
      setSaveError('')
      setIsSavingOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save view.')
    }
  }

  return (
    <div className="admin-saved-views-bar" data-testid={`saved-views-bar-${desk}`}>
      <div className="admin-saved-views-list" role="group" aria-label="Saved filter views">
        <span className="admin-saved-views-label">Views</span>

        {onResetFilters && (
          <button
            type="button"
            className={`admin-saved-view-tab ${!hasActiveFilters ? 'is-active' : ''}`}
            onClick={onResetFilters}
            data-testid={`saved-view-all-${desk}`}
          >
            All Records
          </button>
        )}

        {views.map(view => {
          const isActive = filtersMatch(view.filters, currentFilters)
          return (
            <div key={view.id} className={`admin-saved-view-item ${isActive ? 'is-active' : ''}`}>
              <button
                type="button"
                className="admin-saved-view-btn"
                onClick={() => onApplyFilters(view.filters, view.name)}
                title={`${view.name} — ${formatSavedViewFilterSummary(view.filters)}`}
                aria-pressed={isActive}
                data-testid={`saved-view-btn-${view.id}`}
              >
                <span>{view.name}</span>
              </button>
              {!view.isBuiltIn && (
                <button
                  type="button"
                  className="admin-saved-view-delete"
                  onClick={() => deleteSavedView(view.id)}
                  aria-label={`Delete saved view ${view.name}`}
                  title="Remove custom view"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="admin-saved-views-actions">
        {!isSavingOpen ? (
          <button
            type="button"
            className="admin-saved-view-add-btn"
            onClick={() => {
              setIsSavingOpen(true)
              setSaveError('')
            }}
            data-testid={`save-view-trigger-${desk}`}
          >
            <SiteIcon name="plus" size={13} />
            <span>Save View</span>
          </button>
        ) : (
          <form className="admin-saved-view-form" onSubmit={handleSave}>
            <input
              type="text"
              className="admin-saved-view-input"
              placeholder="e.g. Pending Delhi Trials"
              value={draftName}
              onChange={e => {
                setDraftName(e.target.value)
                setSaveError('')
              }}
              aria-label="New saved view name"
              data-testid={`save-view-input-${desk}`}
              autoFocus
            />
            <button
              type="submit"
              className="admin-saved-view-confirm"
              data-testid={`save-view-submit-${desk}`}
            >
              Pin
            </button>
            <button
              type="button"
              className="admin-saved-view-cancel"
              onClick={() => {
                setIsSavingOpen(false)
                setDraftName('')
                setSaveError('')
              }}
            >
              Cancel
            </button>
            {saveError && <span className="admin-saved-view-error">{saveError}</span>}
          </form>
        )}
      </div>
    </div>
  )
}
