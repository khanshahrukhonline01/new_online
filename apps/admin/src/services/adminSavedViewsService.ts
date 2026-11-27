/**
 * KhelGrid Admin — Saved Filter Views & Desk Presets Service
 *
 * Lets admins save, pin, apply, and share frequent filter combinations across
 * Moderation, Verification Vault, Trust & Safety, Regulatory Inbox, Audit Explorer,
 * and Regulatory Compliance desks — and surfaces pinned views inside Ctrl+K.
 */

import { notifyRegulatoryStateChanged } from '../../../../src/shared/governance/regulatoryBridge'
import type { AdminWorkspaceTab } from '../components/AdminSidebar'

export const SAVED_VIEWS_STORAGE_KEY = 'khelgrid_admin_saved_views_v1'

export type SavedViewDeskId = Extract<
  AdminWorkspaceTab,
  | 'post_regulation_gate'
  | 'moderation_desk'
  | 'verification_vault'
  | 'fraud_disputes'
  | 'regulatory_inbox'
  | 'audit_explorer'
  | 'regulatory_compliance'
>

export interface AdminSavedFilterView {
  id: string
  desk: SavedViewDeskId
  deskLabel: string
  name: string
  description?: string
  filters: Record<string, string>
  isPinned: boolean
  isBuiltIn?: boolean
  createdBy: string
  createdAt: string
}

const memoryStore = new Map<string, string>()

const BUILTIN_SAVED_VIEWS: AdminSavedFilterView[] = [
  {
    id: 'preset-mod-pending-delhi',
    desk: 'moderation_desk',
    deskLabel: 'Listing Moderation',
    name: 'Pending Trials · Delhi',
    description: 'Pending review submissions in Delhi NCR',
    filters: { status: 'pending_review', city: 'Delhi' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-mod-under-review',
    desk: 'moderation_desk',
    deskLabel: 'Listing Moderation',
    name: 'Active Reviews',
    description: 'Submissions currently in active moderator review',
    filters: { status: 'under_review' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-inbox-breached',
    desk: 'regulatory_inbox',
    deskLabel: 'Regulatory Inbox',
    name: 'SLA Breached Watch',
    description: 'All overdue regulatory items across desks',
    filters: { sla: 'breached' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-inbox-at-risk',
    desk: 'regulatory_inbox',
    deskLabel: 'Regulatory Inbox',
    name: 'Due Soon (At Risk)',
    description: 'Regulatory queues approaching SLA deadline',
    filters: { sla: 'at_risk' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-verif-action-required',
    desk: 'verification_vault',
    deskLabel: 'Verification Vault',
    name: 'Action Required KYC',
    description: 'Dossiers awaiting missing partner evidence',
    filters: { status: 'action_required' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-ts-high-priority',
    desk: 'fraud_disputes',
    deskLabel: 'Trust & Safety',
    name: 'Critical P0 Incidents',
    description: 'Highest severity safety & fraud escalations',
    filters: { severity: 'critical_p0' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-audit-critical',
    desk: 'audit_explorer',
    deskLabel: 'Audit Explorer',
    name: 'Critical Governance Events',
    description: 'RBAC, sanctions, and statutory takedown events',
    filters: { severity: 'critical' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-reg-dpdp-open',
    desk: 'regulatory_compliance',
    deskLabel: 'Statutory Compliance',
    name: 'DPDP Act 2023 DSARs',
    description: 'Active data subject rights & erasure requests',
    filters: { tab: 'dpdp_dsar', status: 'open' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-post-gate-hard-holds',
    desk: 'post_regulation_gate',
    deskLabel: 'Post Evaluation Gate',
    name: 'Hard Holds · Pre-Pub Gate',
    description: 'Tenant posts blocked from publishing by statutory rules',
    filters: { workflow: 'pending_evaluation', disposition: 'hard_hold' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'preset-post-gate-auto-clear',
    desk: 'post_regulation_gate',
    deskLabel: 'Post Evaluation Gate',
    name: 'Auto-Clear Ready Posts',
    description: 'Tenant posts passing all statutory pre-screen checks',
    filters: { workflow: 'pending_evaluation', disposition: 'auto_clear_eligible' },
    isPinned: true,
    isBuiltIn: true,
    createdBy: 'system@khelgrid.com',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
]

const DESK_LABELS: Record<SavedViewDeskId, string> = {
  post_regulation_gate: 'Post Evaluation Gate',
  moderation_desk: 'Listing Moderation',
  verification_vault: 'Verification Vault',
  fraud_disputes: 'Trust & Safety',
  regulatory_inbox: 'Regulatory Inbox',
  audit_explorer: 'Audit Explorer',
  regulatory_compliance: 'Statutory Compliance',
}

function readCustomViews(): AdminSavedFilterView[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY)
      if (raw) return JSON.parse(raw) as AdminSavedFilterView[]
    }
  } catch {
    // fallback
  }
  const mem = memoryStore.get(SAVED_VIEWS_STORAGE_KEY)
  if (mem) {
    try {
      return JSON.parse(mem) as AdminSavedFilterView[]
    } catch {
      return []
    }
  }
  return []
}

function writeCustomViews(views: AdminSavedFilterView[]): void {
  const serialized = JSON.stringify(views)
  memoryStore.set(SAVED_VIEWS_STORAGE_KEY, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, serialized)
    }
  } catch {
    // ignore
  }
  notifyRegulatoryStateChanged()
}

export function listSavedViews(desk?: SavedViewDeskId): AdminSavedFilterView[] {
  const custom = readCustomViews()
  const combined = [...custom, ...BUILTIN_SAVED_VIEWS]
  return desk ? combined.filter(v => v.desk === desk) : combined
}

export function saveFilterView(params: {
  desk: SavedViewDeskId
  name: string
  filters: Record<string, string>
  createdBy: string
  description?: string
  isPinned?: boolean
}): AdminSavedFilterView {
  const trimmedName = params.name.trim()
  if (!trimmedName) {
    throw new Error('Saved view name is required.')
  }

  const normalizedFilters: Record<string, string> = {}
  Object.entries(params.filters).forEach(([k, v]) => {
    if (v && v !== 'all') {
      normalizedFilters[k] = v
    }
  })

  const view: AdminSavedFilterView = {
    id: `view-${params.desk}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    desk: params.desk,
    deskLabel: DESK_LABELS[params.desk],
    name: trimmedName,
    description: params.description?.trim() || undefined,
    filters: normalizedFilters,
    isPinned: params.isPinned ?? true,
    isBuiltIn: false,
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
  }

  const custom = readCustomViews()
  writeCustomViews([view, ...custom])
  return view
}

export function deleteSavedView(viewId: string): boolean {
  const custom = readCustomViews()
  const next = custom.filter(v => v.id !== viewId)
  if (next.length === custom.length) return false
  writeCustomViews(next)
  return true
}

export function togglePinSavedView(viewId: string): AdminSavedFilterView | null {
  const custom = readCustomViews()
  const idx = custom.findIndex(v => v.id === viewId)
  if (idx < 0) return null
  const updated = { ...custom[idx], isPinned: !custom[idx].isPinned }
  const next = [...custom]
  next[idx] = updated
  writeCustomViews(next)
  return updated
}

export function formatSavedViewFilterSummary(filters: Record<string, string>): string {
  const entries = Object.entries(filters).filter(([, v]) => Boolean(v && v !== 'all'))
  if (entries.length === 0) return 'All records'
  return entries
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v.replace(/_/g, ' ')}`)
    .join(' · ')
}

export function resetSavedViewsForTesting(): void {
  memoryStore.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(SAVED_VIEWS_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  notifyRegulatoryStateChanged()
}
