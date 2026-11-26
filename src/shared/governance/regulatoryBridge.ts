/**
 * KhelGrid Live Regulatory Control Plane Bridge (Phase 1)
 *
 * Connects the Admin Panel (Platform Governance & Tenant Management) directly
 * to the public site and client operational workspaces (Academies, Coaches,
 * Venues/Turfs, Tournaments, Creators, Athletes) in real time.
 *
 * Design invariants:
 * - Pure evaluation helpers accept optional data snapshots for deterministic testing.
 * - Safe in SSR / Node test environments (no direct window/localStorage crashes).
 * - Never locks out /admin routes even when platform_maintenance_mode is enabled.
 */

export const GOV_FLAGS_STORAGE_KEY = 'khelgrid_admin_gov_flags_v1'
export const GOV_BANNERS_STORAGE_KEY = 'khelgrid_admin_gov_banners_v1'
export const ADMIN_TENANTS_STORAGE_KEY = 'khelgrid_admin_tenants_v1'
export const ADMIN_COMPLIANCE_ADVISORIES_KEY = 'khelgrid_admin_compliance_advisories_v1'
export const ADMIN_INSPECTION_SESSION_KEY = 'khelgrid_admin_readonly_inspection_v1'
export const REGULATORY_STATE_EVENT = 'khelgrid:governance-updated'

export type BannerAudienceScope =
  | 'all'
  | 'athlete'
  | 'academy'
  | 'coach'
  | 'venue'
  | 'tournament'
  | 'creator'

export const BANNER_AUDIENCE_LABELS: Record<BannerAudienceScope, string> = {
  all: 'All Public & Platform Users',
  athlete: 'Athletes & Players',
  academy: 'Academies & Organisations',
  coach: 'Coaches & Trainers',
  venue: 'Venue & Turf Holders',
  tournament: 'Tournament Organisers',
  creator: 'Creators & Media Partners',
}

export type RegulatoryWorkspaceKey =
  | 'athlete'
  | 'organization'
  | 'academy'
  | 'coach'
  | 'turf'
  | 'host'
  | 'tournament'
  | 'creator'
  | 'parent'

export type TenantRegulatoryStatus =
  | 'active'
  | 'restricted'
  | 'pending_verification'
  | 'suspended'
  | 'archived'

export interface GovernanceFlagRecord {
  key: string
  name: string
  description?: string
  enabled: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface GovernanceBannerRecord {
  id: string
  slug: string
  tone: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan'
  targetLocale?: 'both' | 'en' | 'hi'
  targetAudience?: BannerAudienceScope
  badgeEn: string
  badgeHi?: string
  titleEn: string
  titleHi?: string
  subtitleEn?: string
  subtitleHi?: string
  ctaLabelEn: string
  ctaLabelHi?: string
  ctaUrl: string
  priority: number
  isActive: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface TenantGovernanceRecord {
  id: string
  slug: string
  name: string
  tenantType?: string
  status: TenantRegulatoryStatus
  updatedAt?: string
  auditTrail?: Array<{
    action?: string
    note?: string
    operatorEmail?: string
    timestamp?: string
  }>
}

export interface RegulatoryBannerItem {
  id: string
  slug: string
  tone: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan'
  badge: string
  title: string
  subtitle: string
  cta_label: string
  cta_url: string
  priority: number
  is_active: boolean
  starts_at: string
  targetAudience: BannerAudienceScope
}

export type PartnerComplianceSeverity =
  | 'action_required'
  | 'expiring_soon'
  | 'warning'
  | 'resolved'

export interface PartnerComplianceAdvisory {
  id: string
  referenceCode: string
  sourceDesk:
    | 'verification_vault'
    | 'moderation_desk'
    | 'fraud_disputes'
    | 'tenant_governance'
    | 'regulatory_inbox'
  targetPersona: RegulatoryWorkspaceKey
  tenantId?: string
  tenantSlug?: string
  entityName: string
  severity: PartnerComplianceSeverity
  headline: string
  message: string
  missingItems?: string[]
  dueAt?: string
  issuedBy: string
  issuedAt: string
  resolvedAt?: string
  actionUrl?: string
}

export interface ReadOnlyInspectionSession {
  id: string
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantType: string
  persona: RegulatoryWorkspaceKey
  routePath: string
  workspaceLabel: string
  adminEmail: string
  startedAt: string
  expiresAt: string
}

export type WorkspaceRegulationState =
  | 'allowed'
  | 'restricted'
  | 'suspended'
  | 'module_disabled'
  | 'maintenance'

export interface WorkspaceRegulationDecision {
  state: WorkspaceRegulationState
  headline: string
  reason: string
  flagKey?: string
  actorEmail?: string
  updatedAt?: string
  affectedTenantName?: string
  targetedBanners: RegulatoryBannerItem[]
  complianceAdvisories: PartnerComplianceAdvisory[]
}

export const WORKSPACE_FLAG_BY_PERSONA: Partial<Record<RegulatoryWorkspaceKey, string>> = {
  academy: 'workspace_academy_enabled',
  organization: 'workspace_academy_enabled',
  coach: 'workspace_coach_enabled',
  turf: 'workspace_turf_enabled',
  host: 'workspace_turf_enabled',
  tournament: 'workspace_tournament_enabled',
  creator: 'workspace_creator_enabled',
}

export const WORKSPACE_AUDIENCE_BY_PERSONA: Record<RegulatoryWorkspaceKey, BannerAudienceScope> = {
  athlete: 'athlete',
  organization: 'academy',
  academy: 'academy',
  coach: 'coach',
  turf: 'venue',
  host: 'venue',
  tournament: 'tournament',
  creator: 'creator',
  parent: 'athlete',
}

const WORKSPACE_DISPLAY_LABELS: Record<RegulatoryWorkspaceKey, string> = {
  athlete: 'Athlete Dashboard',
  organization: 'Organisation Workspace',
  academy: 'Academy Management Hub',
  coach: 'Coach Workspace',
  turf: 'Venue & Turf Calendar',
  host: 'Venue Partner Dashboard',
  tournament: 'Tournament Operations Hub',
  creator: 'Creator Studio',
  parent: 'Parent & Athlete Passbook',
}

function readLocalStorageJson<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null
    }
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function notifyRegulatoryStateChanged(): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(REGULATORY_STATE_EVENT))
  } catch {
    // Ignore in constrained environments
  }
}

export function subscribeRegulatoryState(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleCustom = () => onChange()
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === GOV_FLAGS_STORAGE_KEY ||
      event.key === GOV_BANNERS_STORAGE_KEY ||
      event.key === ADMIN_TENANTS_STORAGE_KEY ||
      event.key === ADMIN_COMPLIANCE_ADVISORIES_KEY ||
      event.key === ADMIN_INSPECTION_SESSION_KEY
    ) {
      onChange()
    }
  }

  window.addEventListener(REGULATORY_STATE_EVENT, handleCustom)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(REGULATORY_STATE_EVENT, handleCustom)
    window.removeEventListener('storage', handleStorage)
  }
}

export function readStoredGovernanceFlags(): GovernanceFlagRecord[] | null {
  const parsed = readLocalStorageJson<unknown>(GOV_FLAGS_STORAGE_KEY)
  return Array.isArray(parsed) ? (parsed as GovernanceFlagRecord[]) : null
}

export function readStoredGovernanceBanners(): GovernanceBannerRecord[] | null {
  const parsed = readLocalStorageJson<unknown>(GOV_BANNERS_STORAGE_KEY)
  return Array.isArray(parsed) ? (parsed as GovernanceBannerRecord[]) : null
}

export function readStoredAdminTenants(): TenantGovernanceRecord[] | null {
  const parsed = readLocalStorageJson<unknown>(ADMIN_TENANTS_STORAGE_KEY)
  return Array.isArray(parsed) ? (parsed as TenantGovernanceRecord[]) : null
}

const complianceMemoryStore: { items: PartnerComplianceAdvisory[] } = { items: [] }

export function readStoredComplianceAdvisories(): PartnerComplianceAdvisory[] {
  const parsed = readLocalStorageJson<unknown>(ADMIN_COMPLIANCE_ADVISORIES_KEY)
  if (Array.isArray(parsed)) {
    return parsed as PartnerComplianceAdvisory[]
  }
  return [...complianceMemoryStore.items]
}

function writeStoredComplianceAdvisories(items: PartnerComplianceAdvisory[]): void {
  complianceMemoryStore.items = [...items]
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(ADMIN_COMPLIANCE_ADVISORIES_KEY, JSON.stringify(items))
    }
  } catch {
    // Ignore storage quota / sandbox restrictions
  }
  notifyRegulatoryStateChanged()
}

export function publishPartnerComplianceAdvisory(
  input: Omit<PartnerComplianceAdvisory, 'id' | 'issuedAt'> & { id?: string; issuedAt?: string },
): PartnerComplianceAdvisory {
  const existing = readStoredComplianceAdvisories()
  const now = input.issuedAt || new Date().toISOString()
  const record: PartnerComplianceAdvisory = {
    ...input,
    id: input.id || `adv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    issuedAt: now,
  }
  // Replace active notice for the same referenceCode if one already exists
  const filtered = existing.filter(
    item => !(item.referenceCode === record.referenceCode && item.severity !== 'resolved'),
  )
  writeStoredComplianceAdvisories([record, ...filtered])
  return record
}

export function resolvePartnerComplianceAdvisory(
  idOrReferenceCode: string,
  resolvedBy?: string,
): boolean {
  const existing = readStoredComplianceAdvisories()
  let changed = false
  const now = new Date().toISOString()
  const updated = existing.map(item => {
    if (
      (item.id === idOrReferenceCode || item.referenceCode === idOrReferenceCode) &&
      item.severity !== 'resolved'
    ) {
      changed = true
      return {
        ...item,
        severity: 'resolved' as const,
        resolvedAt: now,
        issuedBy: resolvedBy || item.issuedBy,
      }
    }
    return item
  })
  if (changed) {
    writeStoredComplianceAdvisories(updated)
  }
  return changed
}

export function resetComplianceAdvisoriesForTesting(): void {
  complianceMemoryStore.items = []
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(ADMIN_COMPLIANCE_ADVISORIES_KEY)
    }
  } catch {
    // ignore
  }
  notifyRegulatoryStateChanged()
}

function personasMatchForCompliance(
  advisoryPersona: RegulatoryWorkspaceKey,
  workspacePersona: RegulatoryWorkspaceKey,
): boolean {
  if (advisoryPersona === workspacePersona) return true
  if (
    (advisoryPersona === 'turf' || advisoryPersona === 'host') &&
    (workspacePersona === 'turf' || workspacePersona === 'host')
  ) {
    return true
  }
  if (
    (advisoryPersona === 'academy' || advisoryPersona === 'organization') &&
    (workspacePersona === 'academy' || workspacePersona === 'organization')
  ) {
    return true
  }
  return false
}

export function getActivePartnerComplianceAdvisories(
  input: {
    persona: RegulatoryWorkspaceKey
    tenantId?: string | null
    tenantSlug?: string | null
  },
  advisoriesOverride?: PartnerComplianceAdvisory[] | null,
): PartnerComplianceAdvisory[] {
  const all =
    advisoriesOverride !== undefined && advisoriesOverride !== null
      ? advisoriesOverride
      : readStoredComplianceAdvisories()

  const normalizedSlug = input.tenantSlug?.trim().toLowerCase()

  return all
    .filter(item => {
      if (item.severity === 'resolved') return false
      if (!personasMatchForCompliance(item.targetPersona, input.persona)) return false
      // If advisory is scoped to a specific tenant AND workspace has an active tenant, enforce match
      if (item.tenantId && input.tenantId && item.tenantId !== input.tenantId) return false
      if (
        item.tenantSlug &&
        normalizedSlug &&
        item.tenantSlug.trim().toLowerCase() !== normalizedSlug
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
}

export function isPlatformFeatureFlagEnabled(
  flagKey: string,
  defaultValue = true,
  flagsOverride?: GovernanceFlagRecord[] | null,
): boolean {
  const flags = flagsOverride !== undefined ? flagsOverride : readStoredGovernanceFlags()
  if (!flags) return defaultValue
  const found = flags.find(flag => flag.key === flagKey)
  return found ? Boolean(found.enabled) : defaultValue
}

export function getPlatformFeatureFlagRecord(
  flagKey: string,
  flagsOverride?: GovernanceFlagRecord[] | null,
): GovernanceFlagRecord | null {
  const flags = flagsOverride !== undefined ? flagsOverride : readStoredGovernanceFlags()
  if (!flags) return null
  return flags.find(flag => flag.key === flagKey) ?? null
}

export function isPlatformMaintenanceActive(
  flagsOverride?: GovernanceFlagRecord[] | null,
): boolean {
  return isPlatformFeatureFlagEnabled('platform_maintenance_mode', false, flagsOverride)
}

function normalizeBannerToItem(
  banner: GovernanceBannerRecord,
  locale: 'en' | 'hi',
): RegulatoryBannerItem {
  const useHindi = locale === 'hi' && banner.targetLocale !== 'en' && Boolean(banner.titleHi?.trim())
  return {
    id: banner.id,
    slug: banner.slug,
    tone: banner.tone || 'emerald',
    badge: useHindi ? (banner.badgeHi || banner.badgeEn) : banner.badgeEn,
    title: useHindi ? (banner.titleHi || banner.titleEn) : banner.titleEn,
    subtitle: useHindi ? (banner.subtitleHi || banner.subtitleEn || '') : (banner.subtitleEn || ''),
    cta_label: useHindi ? (banner.ctaLabelHi || banner.ctaLabelEn) : banner.ctaLabelEn,
    cta_url: banner.ctaUrl || '/opportunities',
    priority: typeof banner.priority === 'number' ? banner.priority : 50,
    is_active: Boolean(banner.isActive),
    starts_at: banner.updatedAt || new Date().toISOString(),
    targetAudience: banner.targetAudience || 'all',
  }
}

/**
 * Returns active Admin CMS banners matching the requested audience & locale.
 *
 * Returns `null` if Admin has never saved custom banners to localStorage (and no override
 * was passed), allowing public pages like SiteAnnouncementBanner to preserve baseline defaults.
 *
 * Audience matching rules:
 * - `audience === 'all'`: returns only sitewide (`targetAudience === 'all'` or unset) active banners.
 * - `audience === '<role>'`: returns role-specific active banners (`targetAudience === audience`),
 *   unless `includeSitewide` is true, in which case sitewide banners are also included.
 */
export function getLiveAdminBannersForAudience(
  audience: BannerAudienceScope = 'all',
  locale: 'en' | 'hi' = 'en',
  options?: {
    bannersOverride?: GovernanceBannerRecord[] | null
    includeSitewide?: boolean
  },
): RegulatoryBannerItem[] | null {
  const stored =
    options?.bannersOverride !== undefined
      ? options.bannersOverride
      : readStoredGovernanceBanners()

  if (!stored) return null

  const includeSitewide = options?.includeSitewide ?? false

  return stored
    .filter(banner => {
      if (!banner.isActive) return false
      const bannerAudience: BannerAudienceScope = banner.targetAudience || 'all'
      if (audience === 'all') {
        return bannerAudience === 'all'
      }
      if (includeSitewide) {
        return bannerAudience === audience || bannerAudience === 'all'
      }
      return bannerAudience === audience
    })
    .filter(banner => {
      if (banner.targetLocale === 'en' && locale === 'hi') return false
      if (banner.targetLocale === 'hi' && locale === 'en') return false
      return true
    })
    .map(banner => normalizeBannerToItem(banner, locale))
    .sort((a, b) => b.priority - a.priority)
}

export interface WorkspaceRegulationInput {
  persona: RegulatoryWorkspaceKey
  tenantId?: string | null
  tenantSlug?: string | null
  locale?: 'en' | 'hi'
}

export interface WorkspaceRegulationOverrides {
  flags?: GovernanceFlagRecord[] | null
  banners?: GovernanceBannerRecord[] | null
  tenants?: TenantGovernanceRecord[] | null
  complianceAdvisories?: PartnerComplianceAdvisory[] | null
}

/**
 * Evaluates live regulatory posture for any front-end client workspace.
 * Precedence:
 * 1. Global Platform Maintenance Mode (`platform_maintenance_mode`)
 * 2. Module / Workspace Kill-Switch (`workspace_*_enabled`)
 * 3. Tenant-specific Suspension (`status === 'suspended'`)
 * 4. Tenant-specific Restriction (`status === 'restricted'`)
 * 5. Allowed (with any active role-targeted Admin announcements & compliance advisories attached)
 */
export function evaluateWorkspaceRegulation(
  input: WorkspaceRegulationInput,
  overrides?: WorkspaceRegulationOverrides,
): WorkspaceRegulationDecision {
  const locale = input.locale ?? 'en'
  const audience = WORKSPACE_AUDIENCE_BY_PERSONA[input.persona] ?? 'all'
  const targetedBanners =
    getLiveAdminBannersForAudience(audience, locale, {
      bannersOverride: overrides?.banners,
      includeSitewide: false,
    }) ?? []
  const complianceAdvisories = getActivePartnerComplianceAdvisories(
    {
      persona: input.persona,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
    },
    overrides?.complianceAdvisories,
  )

  // 1. Global platform maintenance mode
  const maintenanceFlag = getPlatformFeatureFlagRecord('platform_maintenance_mode', overrides?.flags)
  if (maintenanceFlag?.enabled) {
    return {
      state: 'maintenance',
      flagKey: 'platform_maintenance_mode',
      headline: 'Platform Maintenance Mode Active',
      reason:
        'KhelGrid Administration has temporarily placed partner and athlete workspaces into scheduled maintenance hold. All existing schedules and records remain safely preserved.',
      actorEmail: maintenanceFlag.updatedBy,
      updatedAt: maintenanceFlag.updatedAt,
      targetedBanners,
      complianceAdvisories,
    }
  }

  // 2. Per-workspace module kill-switch
  const workspaceFlagKey = WORKSPACE_FLAG_BY_PERSONA[input.persona]
  if (workspaceFlagKey) {
    const moduleFlag = getPlatformFeatureFlagRecord(workspaceFlagKey, overrides?.flags)
    if (moduleFlag && !moduleFlag.enabled) {
      const workspaceLabel = WORKSPACE_DISPLAY_LABELS[input.persona] || 'Operational Workspace'
      return {
        state: 'module_disabled',
        flagKey: workspaceFlagKey,
        headline: `${workspaceLabel} Temporarily Paused`,
        reason: `KhelGrid Administration has temporarily paused access to ${workspaceLabel} for regulatory compliance or operational maintenance. Existing records remain safely preserved.`,
        actorEmail: moduleFlag.updatedBy,
        updatedAt: moduleFlag.updatedAt,
        targetedBanners,
        complianceAdvisories,
      }
    }
  }

  // 3 & 4. Tenant-specific lifecycle enforcement (suspended / restricted)
  const tenants = overrides?.tenants !== undefined ? overrides.tenants : readStoredAdminTenants()
  if (tenants && (input.tenantId || input.tenantSlug)) {
    const normalizedSlug = input.tenantSlug?.trim().toLowerCase()
    const matchedTenant = tenants.find(
      t =>
        (input.tenantId && t.id === input.tenantId) ||
        (normalizedSlug && t.slug.toLowerCase() === normalizedSlug),
    )

    if (matchedTenant) {
      const latestAudit = matchedTenant.auditTrail?.[0]
      if (matchedTenant.status === 'suspended') {
        return {
          state: 'suspended',
          headline: 'Organisation Workspace Suspended',
          reason:
            latestAudit?.note ||
            'This organisation has been suspended by KhelGrid Administration pending compliance review. Public listings and operational mutations are paused.',
          actorEmail: latestAudit?.operatorEmail,
          updatedAt: matchedTenant.updatedAt || latestAudit?.timestamp,
          affectedTenantName: matchedTenant.name,
          targetedBanners,
          complianceAdvisories,
        }
      }

      if (matchedTenant.status === 'restricted') {
        return {
          state: 'restricted',
          headline: 'Compliance Restriction Active (Read-Only Guard)',
          reason:
            latestAudit?.note ||
            'This organisation is currently restricted by KhelGrid Administration. Existing schedules remain visible, while new public listings and expansions are held pending verification.',
          actorEmail: latestAudit?.operatorEmail,
          updatedAt: matchedTenant.updatedAt || latestAudit?.timestamp,
          affectedTenantName: matchedTenant.name,
          targetedBanners,
          complianceAdvisories,
        }
      }
    }
  }

  return {
    state: 'allowed',
    headline: 'Operational',
    reason: 'Workspace operating under normal KhelGrid regulatory clearance.',
    targetedBanners,
    complianceAdvisories,
  }
}

// ============================================================================
// Phase 3: Read-Only Admin Workspace Inspection Session
// ============================================================================

let inspectionMemoryStore: ReadOnlyInspectionSession | null = null

export function mapTenantTypeToInspectionTarget(tenantType: string): {
  persona: RegulatoryWorkspaceKey
  routePath: string
  workspaceLabel: string
} {
  switch (tenantType.toLowerCase()) {
    case 'venue':
    case 'turf':
      return {
        persona: 'turf',
        routePath: '/turf-calendar',
        workspaceLabel: 'Turf & Venue Operations Workspace',
      }
    case 'coach':
      return {
        persona: 'coach',
        routePath: '/coach-dashboard',
        workspaceLabel: 'Coach Operations Workspace',
      }
    case 'tournament':
    case 'organiser':
      return {
        persona: 'tournament',
        routePath: '/tournament-ops',
        workspaceLabel: 'Tournament Operations Workspace',
      }
    case 'academy':
    case 'club':
    case 'university':
    default:
      return {
        persona: 'academy',
        routePath: '/academy-hub',
        workspaceLabel: 'Academy & Organisation Workspace',
      }
  }
}

export function startReadOnlyWorkspaceInspection(params: {
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantType: string
  adminEmail: string
  durationMinutes?: number
}): ReadOnlyInspectionSession {
  const target = mapTenantTypeToInspectionTarget(params.tenantType)
  const nowMs = Date.now()
  const ttlMinutes = Math.max(5, params.durationMinutes ?? 30)
  const session: ReadOnlyInspectionSession = {
    id: `insp-${nowMs.toString(36)}`,
    tenantId: params.tenantId,
    tenantSlug: params.tenantSlug,
    tenantName: params.tenantName,
    tenantType: params.tenantType,
    persona: target.persona,
    routePath: target.routePath,
    workspaceLabel: target.workspaceLabel,
    adminEmail: params.adminEmail,
    startedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMinutes * 60 * 1000).toISOString(),
  }

  inspectionMemoryStore = session
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ADMIN_INSPECTION_SESSION_KEY, JSON.stringify(session))
    } catch {
      // ignore quota errors
    }
  }
  notifyRegulatoryStateChanged()
  return session
}

export function getActiveReadOnlyInspection(nowMs: number = Date.now()): ReadOnlyInspectionSession | null {
  let session: ReadOnlyInspectionSession | null = inspectionMemoryStore
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(ADMIN_INSPECTION_SESSION_KEY)
      session = raw ? (JSON.parse(raw) as ReadOnlyInspectionSession) : null
      inspectionMemoryStore = session
    } catch {
      session = null
    }
  }

  if (!session) return null
  const expMs = Date.parse(session.expiresAt)
  if (Number.isFinite(expMs) && expMs <= nowMs) {
    endReadOnlyWorkspaceInspection()
    return null
  }
  return session
}

export function endReadOnlyWorkspaceInspection(): void {
  inspectionMemoryStore = null
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ADMIN_INSPECTION_SESSION_KEY)
    } catch {
      // ignore
    }
  }
  notifyRegulatoryStateChanged()
}

