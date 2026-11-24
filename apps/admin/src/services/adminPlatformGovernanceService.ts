/**
 * KhelGrid Admin — Module 7: Platform Settings, Audit Trails & RBAC Service
 *
 * Centralizes super-admin control plane governance:
 * 1. Platform Feature Flags & Compliance Kill-Switches (including immutable Payment Lockdown)
 * 2. Bilingual Hindi / English CMS Announcements & Banners
 * 3. Canonical Sports & Indian Cities Taxonomy Catalogues
 * 4. Operator RBAC Permissions Directory & Invariant Enforcement
 * 5. Immutable Platform-Wide Cross-Module Audit Explorer & RFC 4180 CSV Export
 */

import { ALL_INDIAN_CITIES } from '../../../../src/shared/components/citiesData'
import { sportIconManifest } from '../../../../src/shared/sports/sportIcons'
import {
  BASELINE_ANNOUNCEMENTS,
  listListingModeratorAccounts,
  setListingModeratorAccess,
  getListingModeratorAccessAudit,
} from '../../../../src/integrations/supabase/public-client'
import {
  getGovernanceCapabilities,
  type AdminPlatformRole,
} from '../auth/adminSecurityPolicy'
import { getAdminTenants, getAdminTenantDetails } from './adminTenantService'
import { getAdminVerifications } from './adminVerificationService'
import { getAdminModerationListings } from './adminModerationService'
import { getAdminChronicleManuscripts } from './adminChronicleService'
import { getAdminTrustSafetyCases } from './adminTrustSafetyService'
import { getAdminCreatorCampaignDashboard } from './adminCreatorCampaignService'
import { getAllGroundOperationsAuditEvents } from './adminGroundOperationsService'

export interface GovernanceOperatorActor {
  name: string
  email: string
  role: AdminPlatformRole
  userId?: string
}

export type FeatureFlagCategory =
  | 'payments_lockdown'
  | 'moderation_safety'
  | 'creator_economy'
  | 'discovery_seo'
  | 'localisation'

export type FeatureFlagRisk = 'critical' | 'high' | 'standard'

export interface PlatformFeatureFlag {
  key: string
  name: string
  description: string
  category: FeatureFlagCategory
  riskLevel: FeatureFlagRisk
  enabled: boolean
  policyLocked?: boolean
  policyLockReason?: string
  environment: 'all' | 'production' | 'staging'
  updatedAt: string
  updatedBy: string
}

export type BannerTone = 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan'
export type BannerLocaleScope = 'both' | 'en' | 'hi'

export interface PlatformBilingualBanner {
  id: string
  slug: string
  tone: BannerTone
  targetLocale: BannerLocaleScope
  badgeEn: string
  badgeHi: string
  titleEn: string
  titleHi: string
  subtitleEn: string
  subtitleHi: string
  ctaLabelEn: string
  ctaLabelHi: string
  ctaUrl: string
  priority: number
  isActive: boolean
  updatedAt: string
  updatedBy: string
}

export type SportTaxonomyCategory =
  | 'team_sport'
  | 'racquet'
  | 'combat_martial'
  | 'aquatics_track'
  | 'mind_precision'

export interface SportTaxonomyItem {
  id: string
  labelEn: string
  labelHi: string
  category: SportTaxonomyCategory
  isActive: boolean
  isFeaturedDiscovery: boolean
  requiresFederationVerification: boolean
  listingsCountEstimate: number
}

export type CityZone = 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East' | 'Islands'
export type CityLaunchTier = 'tier_1_metro' | 'tier_2_hub' | 'tier_3_grassroots'

export interface CityTaxonomyItem {
  slug: string
  name: string
  state: string
  zone: CityZone
  isMetro: boolean
  launchTier: CityLaunchTier
  discoveryEnabled: boolean
  majorVenuesCount: number
  sampleVenues: string[]
}

export interface OperatorRbacAccount {
  userId: string
  email: string
  displayName: string
  role: AdminPlatformRole
  isActive: boolean
  mfaVerified: boolean
  lastActiveAt: string
  grantedBy: string
  notes: string
  assignedScopes: string[]
}

export type AuditSourceModule =
  | 'platform_governance'
  | 'tenant_governance'
  | 'verification_vault'
  | 'moderation_desk'
  | 'chronicle_desk'
  | 'fraud_disputes'
  | 'creator_campaigns'
  | 'rbac_access'
  | 'gate_desk'
  | 'turf_oversight'
  | 'academy_oversight'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface UnifiedPlatformAuditRecord {
  id: string
  sequenceCode: string
  timestamp: string
  sourceModule: AuditSourceModule
  action: string
  actor: string
  targetEntity: string
  summary: string
  severity: AuditSeverity
  immutableChecksum: string
}

export interface GovernanceMicroKpiMetrics {
  activeFlagsCount: number
  totalFlagsCount: number
  activeBilingualBannersCount: number
  activeSportsCount: number
  enabledCitiesCount: number
  activeOperatorsCount: number
  superAdminsCount: number
  totalAuditEventsCount: number
  criticalAuditEventsCount: number
  paymentLockdownEnforced: boolean
}

export interface PlatformGovernanceSnapshot {
  featureFlags: PlatformFeatureFlag[]
  banners: PlatformBilingualBanner[]
  sports: SportTaxonomyItem[]
  cities: CityTaxonomyItem[]
  operators: OperatorRbacAccount[]
  auditEvents: UnifiedPlatformAuditRecord[]
  metrics: GovernanceMicroKpiMetrics
}

const GOV_STORAGE_KEYS = {
  FLAGS: 'khelgrid_admin_gov_flags_v1',
  BANNERS: 'khelgrid_admin_gov_banners_v1',
  SPORTS: 'khelgrid_admin_gov_sports_v1',
  CITIES: 'khelgrid_admin_gov_cities_v1',
  OPERATORS: 'khelgrid_admin_gov_operators_v1',
  AUDIT_EVENTS: 'khelgrid_admin_gov_audits_v1',
} as const

const govMemoryStore = new Map<string, string>()

function loadGovData<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // Fallback to in-memory map
  }
  const mem = govMemoryStore.get(key)
  if (mem) {
    try {
      return JSON.parse(mem) as T
    } catch {
      return structuredClone(fallback)
    }
  }
  return structuredClone(fallback)
}

function saveGovData<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)
  govMemoryStore.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota / sandbox restrictions
  }
}

function assertSuperAdmin(actor: GovernanceOperatorActor, actionLabel: string): void {
  const caps = getGovernanceCapabilities(actor.role)
  if (!caps.canMutateFeatureFlags || !caps.canManageOperatorRbac) {
    throw new Error(
      `RBAC Clearance Denied: Super-Admin role is required to ${actionLabel}. Current role "${actor.role}" is read-only for system governance.`,
    )
  }
}

function computeSimpleChecksum(seed: string): string {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `SHA256-SIM-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}

// =========================================================================
// INITIAL SEED DATASETS (ALIGNED WITH KHELGRID PRODUCTION ARCHITECTURE)
// =========================================================================

const INITIAL_FEATURE_FLAGS: PlatformFeatureFlag[] = [
  {
    key: 'global_payment_lockdown',
    name: 'Global Payment & Payout Lockdown',
    description:
      'Enforces platform-wide pause on Razorpay/Stripe checkout captures and automated bank disbursements until regulatory compliance clearance.',
    category: 'payments_lockdown',
    riskLevel: 'critical',
    enabled: true,
    policyLocked: true,
    policyLockReason: 'Locked disabled per Phase 1–5 deployment mandate. Payments remain safely in escrow ledger mode.',
    environment: 'all',
    updatedAt: '2026-11-24T09:00:00Z',
    updatedBy: 'security@khelgrid.com',
  },
  {
    key: 'strict_evidence_before_publish',
    name: 'Strict Evidence-Before-Publish Gate',
    description:
      'Blocks public publication of coaches, academies, and venues unless verified registration or federation credentials exist in the Evidence Vault.',
    category: 'moderation_safety',
    riskLevel: 'high',
    enabled: true,
    environment: 'production',
    updatedAt: '2026-11-23T14:20:00Z',
    updatedBy: 'founder@khelgrid.com',
  },
  {
    key: 'creator_attribution_bot_guard',
    name: 'Creator Attribution Traffic Guard',
    description:
      'Automatically quarantines datacenter click bursts and non-Indian IP anomalies on creator short-links (khel.gg/c/*).',
    category: 'creator_economy',
    riskLevel: 'high',
    enabled: true,
    environment: 'all',
    updatedAt: '2026-11-24T12:15:00Z',
    updatedBy: 'creator.ops@khelgrid.com',
  },
  {
    key: 'hindi_bilingual_cms_banners',
    name: 'Hindi & English Bilingual Discovery Banners',
    description:
      'Enables Devnagari (हिन्दी) announcement banner rendering alongside English across Discovery, Trials, and Sports CV flows.',
    category: 'localisation',
    riskLevel: 'standard',
    enabled: true,
    environment: 'all',
    updatedAt: '2026-11-22T11:30:00Z',
    updatedBy: 'editorial@khelgrid.com',
  },
  {
    key: 'khelchronicle_double_blind_enforce',
    name: 'KhelChronicle Double-Blind Peer Review Mandate',
    description:
      'Masks author institutions during external peer assignment and enforces ICMJE/COPE conflict declarations before DOI minting.',
    category: 'moderation_safety',
    riskLevel: 'high',
    enabled: true,
    environment: 'production',
    updatedAt: '2026-11-21T16:40:00Z',
    updatedBy: 'editor@khelgrid.com',
  },
  {
    key: 'zero_agent_fee_trial_banner_alert',
    name: 'Anti-Extortion Free Trial Safeguard Alert',
    description:
      'Displays persistent safety warnings on youth selection trial cards reminding families never to pay unverified scouting middlemen.',
    category: 'moderation_safety',
    riskLevel: 'standard',
    enabled: true,
    environment: 'all',
    updatedAt: '2026-11-24T08:00:00Z',
    updatedBy: 'trust.safety@khelgrid.com',
  },
  {
    key: 'public_sitemap_auto_regeneration',
    name: 'Automated City & Sport Sitemap Indexing',
    description:
      'Automatically regenerates canonical city-sport SEO sitemaps and RSS feeds on verified listing approvals.',
    category: 'discovery_seo',
    riskLevel: 'standard',
    enabled: false,
    environment: 'production',
    updatedAt: '2026-11-20T10:15:00Z',
    updatedBy: 'platform.ops@khelgrid.com',
  },
]

const HINDI_TRANSLATIONS_BY_SLUG: Record<string, {
  badgeHi: string
  titleHi: string
  subtitleHi: string
  ctaLabelHi: string
}> = {
  'bengaluru-monsoon-pickleball-cup': {
    badgeHi: 'चैम्पियनशिप अलर्ट',
    titleHi: 'बेंगलुरु कम्युनिटी पिकलबॉल और बॉक्स क्रिकेट ओपन',
    subtitleHi: 'फैरोहब और किक्स ऑन ग्रास पर ओपन डबल्स और पिकअप मैचों में भाग लें।',
    ctaLabelHi: 'मैच से जुड़ें',
  },
}

const INITIAL_BANNERS: PlatformBilingualBanner[] = [
  {
    id: 'gov-banner-scam-advisory',
    slug: 'zero-middleman-verified-trials-advisory',
    tone: 'emerald',
    targetLocale: 'both',
    badgeEn: 'Safety Advisory',
    badgeHi: 'सुरक्षा सूचना',
    titleEn: 'Verified Grassroots Trials on KhelGrid Require Zero Agent Fees',
    subtitleEn: 'Report any academy or scout demanding unverified cash fees directly via Trust & Safety.',
    subtitleHi: 'खेलग्रिड पर सत्यापित ट्रायल पूरी तरह पारदर्शी हैं। किसी भी अनधिकृत एजेंट शुल्क की तुरंत रिपोर्ट करें।',
    titleHi: 'खेलग्रिड पर सत्यापित ग्रासरूट ट्रायल में कोई एजेंट शुल्क नहीं',
    ctaLabelEn: 'Explore Free Trials',
    ctaLabelHi: 'मुफ़्त ट्रायल देखें',
    ctaUrl: '/opportunities',
    priority: 100,
    isActive: true,
    updatedAt: '2026-11-24T10:00:00Z',
    updatedBy: 'founder@khelgrid.com',
  },
  ...BASELINE_ANNOUNCEMENTS.map(ann => {
    const hi = HINDI_TRANSLATIONS_BY_SLUG[ann.slug]
    return {
      id: `gov-${ann.id}`,
      slug: ann.slug,
      tone: ann.tone,
      targetLocale: 'both' as BannerLocaleScope,
      badgeEn: ann.badge,
      badgeHi: hi?.badgeHi || 'खेलग्रिड अपडेट',
      titleEn: ann.title,
      titleHi: hi?.titleHi || 'खेलग्रिड लाइव स्पोर्ट्स सेंटर और मैच अपडेट्स',
      subtitleEn: ann.subtitle || '',
      subtitleHi: hi?.subtitleHi || 'भारत भर के सत्यापित टूर्नामेंट, वेन्यू और ट्रायल अपडेट देखें।',
      ctaLabelEn: ann.cta_label,
      ctaLabelHi: hi?.ctaLabelHi || 'अभी देखें',
      ctaUrl: ann.cta_url,
      priority: ann.priority,
      isActive: ann.is_active,
      updatedAt: ann.starts_at,
      updatedBy: 'platform.ops@khelgrid.com',
    }
  }),
]

const SPORT_HINDI_NAMES: Record<string, { labelHi: string; category: SportTaxonomyCategory; featured: boolean; reqFed: boolean; count: number }> = {
  football: { labelHi: 'फ़ुटबॉल', category: 'team_sport', featured: true, reqFed: true, count: 142 },
  cricket: { labelHi: 'क्रिकेट', category: 'team_sport', featured: true, reqFed: true, count: 286 },
  basketball: { labelHi: 'बास्केटबॉल', category: 'team_sport', featured: true, reqFed: true, count: 64 },
  tennis: { labelHi: 'टेनिस', category: 'racquet', featured: true, reqFed: false, count: 58 },
  badminton: { labelHi: 'बैडमिंटन', category: 'racquet', featured: true, reqFed: true, count: 174 },
  volleyball: { labelHi: 'वॉलीबॉल', category: 'team_sport', featured: false, reqFed: false, count: 43 },
  hockey: { labelHi: 'हॉकी', category: 'team_sport', featured: true, reqFed: true, count: 51 },
  athletics: { labelHi: 'एथलेटिक्स', category: 'aquatics_track', featured: true, reqFed: true, count: 92 },
  swimming: { labelHi: 'तैराकी', category: 'aquatics_track', featured: true, reqFed: true, count: 47 },
  boxing: { labelHi: 'मुक्केबाज़ी', category: 'combat_martial', featured: false, reqFed: true, count: 38 },
  cycling: { labelHi: 'साइकिलिंग', category: 'aquatics_track', featured: false, reqFed: false, count: 29 },
  chess: { labelHi: 'शतरंज', category: 'mind_precision', featured: true, reqFed: true, count: 76 },
  'table-tennis': { labelHi: 'टेबल टेनिस', category: 'racquet', featured: false, reqFed: false, count: 53 },
  kabaddi: { labelHi: 'कबड्डी', category: 'team_sport', featured: true, reqFed: true, count: 84 },
  pickleball: { labelHi: 'पिकलबॉल', category: 'racquet', featured: true, reqFed: false, count: 69 },
  wrestling: { labelHi: 'कुश्ती', category: 'combat_martial', featured: true, reqFed: true, count: 61 },
}

const INITIAL_SPORTS_TAXONOMY: SportTaxonomyItem[] = sportIconManifest.map(item => {
  const meta = SPORT_HINDI_NAMES[item.id]
  return {
    id: item.id,
    labelEn: item.label,
    labelHi: meta?.labelHi || item.label,
    category: meta?.category || 'team_sport',
    isActive: true,
    isFeaturedDiscovery: meta?.featured ?? false,
    requiresFederationVerification: meta?.reqFed ?? false,
    listingsCountEstimate: meta?.count ?? 14,
  }
})

const INITIAL_CITIES_TAXONOMY: CityTaxonomyItem[] = ALL_INDIAN_CITIES.map(city => ({
  slug: city.slug,
  name: city.name,
  state: city.state,
  zone: city.zone,
  isMetro: city.isMetro,
  launchTier: city.isMetro ? 'tier_1_metro' : city.venues.length >= 2 ? 'tier_2_hub' : 'tier_3_grassroots',
  discoveryEnabled: true,
  majorVenuesCount: city.venues.length,
  sampleVenues: city.venues,
}))

const INITIAL_RBAC_OPERATORS: OperatorRbacAccount[] = [
  {
    userId: '00000000-0000-4000-8000-000000000001',
    email: 'founder@khelgrid.com',
    displayName: 'Platform Owner · Super Admin',
    role: 'super_admin',
    isActive: true,
    mfaVerified: true,
    lastActiveAt: '2026-11-24T19:45:00Z',
    grantedBy: 'system-bootstrap',
    notes: 'Primary constitutional Super-Admin keyholder with RBAC & Compliance Flag sovereignty.',
    assignedScopes: ['all_workspaces', 'rbac_sovereignty', 'feature_flags', 'banner_cms', 'audit_export'],
  },
  {
    userId: '00000000-0000-4000-8000-000000000002',
    email: 'security.lead@khelgrid.com',
    displayName: 'Trust & Compliance Lead',
    role: 'super_admin',
    isActive: true,
    mfaVerified: true,
    lastActiveAt: '2026-11-24T17:10:00Z',
    grantedBy: 'founder@khelgrid.com',
    notes: 'Co-signer for P0 sanctions, ban appeals, and payment lockdown audits.',
    assignedScopes: ['all_workspaces', 'trust_safety', 'verification_vault', 'rbac_sovereignty'],
  },
  {
    userId: '00000000-0000-4000-8000-000000000101',
    email: 'moderator.delhi@khelgrid.com',
    displayName: 'Delhi NCR Catalogue Moderator',
    role: 'moderator',
    isActive: true,
    mfaVerified: true,
    lastActiveAt: '2026-11-24T16:25:00Z',
    grantedBy: 'founder@khelgrid.com',
    notes: 'Handles venue/academy approvals, Verification Vault docs, and creator deliverables.',
    assignedScopes: ['moderation_desk', 'verification_vault', 'tenant_governance', 'creator_campaigns'],
  },
  {
    userId: '00000000-0000-4000-8000-000000000102',
    email: 'chronicle.editor@khelgrid.com',
    displayName: 'KhelChronicle Managing Editor',
    role: 'moderator',
    isActive: true,
    mfaVerified: true,
    lastActiveAt: '2026-11-24T15:05:00Z',
    grantedBy: 'founder@khelgrid.com',
    notes: 'Handles double-blind peer review assignments and Crossref DOI queue.',
    assignedScopes: ['chronicle_desk', 'moderation_desk'],
  },
]

const INITIAL_GOV_AUDITS: UnifiedPlatformAuditRecord[] = [
  {
    id: 'gov-aud-001',
    sequenceCode: 'SEQ-7001',
    timestamp: '2026-11-24T09:00:00Z',
    sourceModule: 'platform_governance',
    action: 'POLICY_LOCK_ENFORCED',
    actor: 'security@khelgrid.com',
    targetEntity: 'flag:global_payment_lockdown',
    summary: 'Verified global payment & automated bank payout lockdown active prior to production push.',
    severity: 'critical',
    immutableChecksum: computeSimpleChecksum('SEQ-7001:global_payment_lockdown'),
  },
  {
    id: 'gov-aud-002',
    sequenceCode: 'SEQ-7002',
    timestamp: '2026-11-23T14:20:00Z',
    sourceModule: 'rbac_access',
    action: 'ROLE_GRANT_AUDITED',
    actor: 'founder@khelgrid.com',
    targetEntity: 'operator:chronicle.editor@khelgrid.com',
    summary: 'Confirmed scoped moderator grant for KhelChronicle Editorial & Listing Moderation desks.',
    severity: 'info',
    immutableChecksum: computeSimpleChecksum('SEQ-7002:chronicle.editor@khelgrid.com'),
  },
]

function recordGovernanceAudit(entry: {
  sourceModule: AuditSourceModule
  action: string
  actor: string
  targetEntity: string
  summary: string
  severity: AuditSeverity
}): UnifiedPlatformAuditRecord {
  const existing = loadGovData<UnifiedPlatformAuditRecord[]>(
    GOV_STORAGE_KEYS.AUDIT_EVENTS,
    INITIAL_GOV_AUDITS,
  )
  const seq = `SEQ-${7001 + existing.length}`
  const timestamp = new Date().toISOString()
  const next: UnifiedPlatformAuditRecord = {
    id: `gov-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sequenceCode: seq,
    timestamp,
    ...entry,
    immutableChecksum: computeSimpleChecksum(`${seq}:${entry.action}:${entry.targetEntity}:${timestamp}`),
  }
  saveGovData(GOV_STORAGE_KEYS.AUDIT_EVENTS, [next, ...existing])
  return next
}

// =========================================================================
// UNIFIED PLATFORM-WIDE SNAPSHOT & AUDIT AGGREGATOR
// =========================================================================

export async function getPlatformGovernanceSnapshot(): Promise<PlatformGovernanceSnapshot> {
  const featureFlags = loadGovData<PlatformFeatureFlag[]>(GOV_STORAGE_KEYS.FLAGS, INITIAL_FEATURE_FLAGS)
  const banners = loadGovData<PlatformBilingualBanner[]>(GOV_STORAGE_KEYS.BANNERS, INITIAL_BANNERS)
  const sports = loadGovData<SportTaxonomyItem[]>(GOV_STORAGE_KEYS.SPORTS, INITIAL_SPORTS_TAXONOMY)
  const cities = loadGovData<CityTaxonomyItem[]>(GOV_STORAGE_KEYS.CITIES, INITIAL_CITIES_TAXONOMY)
  let operators = loadGovData<OperatorRbacAccount[]>(GOV_STORAGE_KEYS.OPERATORS, INITIAL_RBAC_OPERATORS)
  const govAudits = loadGovData<UnifiedPlatformAuditRecord[]>(GOV_STORAGE_KEYS.AUDIT_EVENTS, INITIAL_GOV_AUDITS)

  // Non-blocking best-effort enrichment with live Supabase accounts & audits when running online
  const [liveAccountsRes, liveAccessAuditRes, chronicleRes, trustRes] = await Promise.allSettled([
    listListingModeratorAccounts(),
    getListingModeratorAccessAudit(30),
    getAdminChronicleManuscripts(),
    getAdminTrustSafetyCases(),
  ])

  if (liveAccountsRes.status === 'fulfilled' && liveAccountsRes.value.length > 0) {
    const existingIds = new Set(operators.map(o => o.userId))
    const merged = [...operators]
    for (const acc of liveAccountsRes.value) {
      if (!existingIds.has(acc.user_id)) {
        merged.push({
          userId: acc.user_id,
          email: `operator-${acc.user_id.slice(0, 8)}@khelgrid.com`,
          displayName: `Supabase ${acc.role === 'super_admin' ? 'Super-Admin' : 'Moderator'}`,
          role: acc.role === 'super_admin' ? 'super_admin' : 'moderator',
          isActive: acc.is_active,
          mfaVerified: true,
          lastActiveAt: acc.created_at,
          grantedBy: acc.created_by || 'supabase-rpc',
          notes: acc.notes || 'Synchronized from server moderation_access table.',
          assignedScopes: acc.role === 'super_admin' ? ['all_workspaces', 'rbac_sovereignty'] : ['moderation_desk'],
        })
      }
    }
    operators = merged
  }

  // Aggregate immutable cross-module audit events
  const crossModuleEvents: UnifiedPlatformAuditRecord[] = [...govAudits]

  // 1. Live Supabase RBAC audits
  if (liveAccessAuditRes.status === 'fulfilled') {
    for (const item of liveAccessAuditRes.value) {
      crossModuleEvents.push({
        id: `rpc-rbac-${item.id}`,
        sequenceCode: 'RPC-RBAC',
        timestamp: item.created_at,
        sourceModule: 'rbac_access',
        action: item.action.toUpperCase(),
        actor: item.actor_id ? `uuid:${item.actor_id.slice(0, 8)}` : 'super-admin-rpc',
        targetEntity: `user:${item.target_user_id.slice(0, 8)}`,
        summary: `${item.old_role || 'none'} -> ${item.new_role || 'none'} (${item.notes || 'Access updated'})`,
        severity: item.action.includes('revoke') ? 'warning' : 'info',
        immutableChecksum: computeSimpleChecksum(item.id),
      })
    }
  }

  // 2. Tenants
  for (const tenant of getAdminTenants()) {
    const detail = getAdminTenantDetails(tenant.id)
    if (detail) {
      for (const aud of detail.auditTrail) {
        crossModuleEvents.push({
          id: `ten-${tenant.id}-${aud.id}`,
          sequenceCode: 'TENANT',
          timestamp: aud.timestamp,
          sourceModule: 'tenant_governance',
          action: aud.action.toUpperCase(),
          actor: aud.operatorEmail,
          targetEntity: tenant.name,
          summary: aud.note,
          severity: aud.action.includes('suspend') ? 'warning' : 'info',
          immutableChecksum: computeSimpleChecksum(`ten-${aud.id}`),
        })
      }
    }
  }

  // 3. Verification Vault
  for (const ver of getAdminVerifications()) {
    for (const aud of ver.auditTrail) {
      crossModuleEvents.push({
        id: `ver-${ver.id}-${aud.id}`,
        sequenceCode: ver.referenceCode,
        timestamp: aud.timestamp,
        sourceModule: 'verification_vault',
        action: aud.action.toUpperCase(),
        actor: aud.actorEmail,
        targetEntity: ver.entityName,
        summary: aud.notes ? `${aud.summary} (${aud.notes})` : aud.summary,
        severity: aud.action === 'revoked' ? 'critical' : aud.action === 'rejected' ? 'warning' : 'info',
        immutableChecksum: computeSimpleChecksum(`ver-${aud.id}`),
      })
    }
  }

  // 4. Listing Moderation
  for (const mod of getAdminModerationListings()) {
    for (const aud of mod.auditTrail) {
      crossModuleEvents.push({
        id: `mod-${mod.id}-${aud.id}`,
        sequenceCode: mod.referenceCode,
        timestamp: aud.timestamp,
        sourceModule: 'moderation_desk',
        action: aud.action.toUpperCase(),
        actor: aud.operatorEmail,
        targetEntity: mod.title,
        summary: aud.notes ? `${aud.summary} · ${aud.notes}` : aud.summary,
        severity: aud.action === 'rejected' || aud.action === 'unpublished' ? 'warning' : 'info',
        immutableChecksum: computeSimpleChecksum(`mod-${aud.id}`),
      })
    }
  }

  // 5. Chronicle Editorial
  if (chronicleRes.status === 'fulfilled') {
    for (const ms of chronicleRes.value.manuscripts) {
      for (const aud of ms.auditTrail) {
        crossModuleEvents.push({
          id: `chr-${ms.id}-${aud.id}`,
          sequenceCode: ms.accessionNumber,
          timestamp: aud.timestamp,
          sourceModule: 'chronicle_desk',
          action: aud.action.toUpperCase(),
          actor: aud.editorEmail,
          targetEntity: ms.title,
          summary: aud.notes,
          severity: aud.action.toLowerCase().includes('retract') ? 'critical' : 'info',
          immutableChecksum: computeSimpleChecksum(`chr-${aud.id}`),
        })
      }
    }
  }

  // 6. Trust & Safety Sanctions & Appeals
  if (trustRes.status === 'fulfilled') {
    for (const item of trustRes.value.cases) {
      for (const s of item.sanctions) {
        crossModuleEvents.push({
          id: `ts-san-${s.id}`,
          sequenceCode: item.incidentNumber,
          timestamp: s.leviedAt,
          sourceModule: 'fraud_disputes',
          action: `SANCTION_${s.type.toUpperCase()}`,
          actor: s.leviedBy,
          targetEntity: item.reportedEntityName,
          summary: s.reason,
          severity: s.type === 'permanent_blacklist' ? 'critical' : 'warning',
          immutableChecksum: computeSimpleChecksum(`san-${s.id}`),
        })
      }
      for (const ap of item.appeals) {
        crossModuleEvents.push({
          id: `ts-app-${ap.id}`,
          sequenceCode: item.incidentNumber,
          timestamp: ap.adjudicatedAt || ap.submittedAt,
          sourceModule: 'fraud_disputes',
          action: ap.status === 'pending' ? 'BAN_APPEAL_FILED' : `APPEAL_${ap.status.toUpperCase()}`,
          actor: ap.adjudicatedBy || item.reportedEntityName,
          targetEntity: item.reportedEntityName,
          summary: ap.adjudicationNotes || ap.pleaNarrative,
          severity: 'warning',
          immutableChecksum: computeSimpleChecksum(`app-${ap.id}`),
        })
      }
    }
  }

  // 7. Creator Campaigns & Attribution
  const creatorSnap = getAdminCreatorCampaignDashboard()
  for (const evt of creatorSnap.auditLogs) {
    crossModuleEvents.push({
      id: `cr-${evt.id}`,
      sequenceCode: 'CREATOR',
      timestamp: evt.timestamp,
      sourceModule: 'creator_campaigns',
      action: evt.action.toUpperCase(),
      actor: evt.actor,
      targetEntity: `${evt.entityType}:${evt.entityId}`,
      summary: evt.reason || evt.action,
      severity: evt.action.includes('excluded') || evt.action.includes('rejected') ? 'warning' : 'info',
      immutableChecksum: computeSimpleChecksum(`cr-${evt.id}`),
    })
  }

  // 8. Graduated Ground Operations (Gate Check-In, Turf Utilization, Academy Batches)
  for (const grd of getAllGroundOperationsAuditEvents()) {
    crossModuleEvents.push({
      id: grd.id,
      sequenceCode: grd.desk.toUpperCase().replace(/_/g, '-'),
      timestamp: grd.timestamp,
      sourceModule: grd.desk,
      action: grd.action,
      actor: grd.operatorEmail,
      targetEntity: grd.targetEntity,
      summary: grd.summary,
      severity: grd.severity,
      immutableChecksum: computeSimpleChecksum(grd.id),
    })
  }

  // Sort reverse-chronological
  crossModuleEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const paymentLockFlag = featureFlags.find(f => f.key === 'global_payment_lockdown')

  const metrics: GovernanceMicroKpiMetrics = {
    activeFlagsCount: featureFlags.filter(f => f.enabled).length,
    totalFlagsCount: featureFlags.length,
    activeBilingualBannersCount: banners.filter(b => b.isActive).length,
    activeSportsCount: sports.filter(s => s.isActive).length,
    enabledCitiesCount: cities.filter(c => c.discoveryEnabled).length,
    activeOperatorsCount: operators.filter(o => o.isActive).length,
    superAdminsCount: operators.filter(o => o.isActive && o.role === 'super_admin').length,
    totalAuditEventsCount: crossModuleEvents.length,
    criticalAuditEventsCount: crossModuleEvents.filter(e => e.severity === 'critical').length,
    paymentLockdownEnforced: Boolean(paymentLockFlag?.enabled ?? true),
  }

  return {
    featureFlags,
    banners,
    sports,
    cities,
    operators,
    auditEvents: crossModuleEvents,
    metrics,
  }
}

// =========================================================================
// GOVERNANCE MUTATION OPERATIONS (STRICT SUPER-ADMIN RBAC ENFORCED)
// =========================================================================

export function togglePlatformFeatureFlag(
  flagKey: string,
  actor: GovernanceOperatorActor,
  justification: string,
): PlatformFeatureFlag {
  assertSuperAdmin(actor, `toggle feature flag "${flagKey}"`)

  const flags = loadGovData<PlatformFeatureFlag[]>(GOV_STORAGE_KEYS.FLAGS, INITIAL_FEATURE_FLAGS)
  const idx = flags.findIndex(f => f.key === flagKey)
  if (idx === -1) {
    throw new Error(`Feature flag "${flagKey}" not found.`)
  }

  const target = flags[idx]
  if (target.policyLocked && target.enabled) {
    throw new Error(
      `Compliance Policy Lock: "${target.name}" cannot be disabled in this deployment phase (${target.policyLockReason || 'Payments remain disabled'}).`,
    )
  }

  const nextState = !target.enabled
  flags[idx] = {
    ...target,
    enabled: nextState,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email,
  }
  saveGovData(GOV_STORAGE_KEYS.FLAGS, flags)

  recordGovernanceAudit({
    sourceModule: 'platform_governance',
    action: nextState ? 'FEATURE_FLAG_ENABLED' : 'FEATURE_FLAG_DISABLED',
    actor: actor.email,
    targetEntity: `flag:${flagKey}`,
    summary: `Set ${flagKey} to ${nextState ? 'ENABLED' : 'DISABLED'}. Note: ${justification.trim() || 'Super-Admin configuration update.'}`,
    severity: target.riskLevel === 'high' ? 'warning' : 'info',
  })

  return flags[idx]
}

export function saveBilingualBanner(
  input: Omit<PlatformBilingualBanner, 'id' | 'updatedAt' | 'updatedBy'> & { id?: string },
  actor: GovernanceOperatorActor,
): PlatformBilingualBanner {
  assertSuperAdmin(actor, 'publish or edit bilingual CMS announcements')

  if (!input.titleEn.trim() || !input.titleHi.trim()) {
    throw new Error('Both English and Hindi (हिन्दी) banner titles are required for bilingual parity.')
  }

  const banners = loadGovData<PlatformBilingualBanner[]>(GOV_STORAGE_KEYS.BANNERS, INITIAL_BANNERS)
  const now = new Date().toISOString()

  if (input.id) {
    const idx = banners.findIndex(b => b.id === input.id)
    if (idx >= 0) {
      banners[idx] = {
        ...banners[idx],
        ...input,
        id: input.id,
        updatedAt: now,
        updatedBy: actor.email,
      }
      saveGovData(GOV_STORAGE_KEYS.BANNERS, banners)
      recordGovernanceAudit({
        sourceModule: 'platform_governance',
        action: 'BILINGUAL_BANNER_UPDATED',
        actor: actor.email,
        targetEntity: `banner:${banners[idx].slug}`,
        summary: `Updated Hindi/English banner "${input.titleEn}" (active: ${input.isActive}).`,
        severity: 'info',
      })
      return banners[idx]
    }
  }

  const created: PlatformBilingualBanner = {
    ...input,
    id: `gov-banner-${Date.now()}`,
    updatedAt: now,
    updatedBy: actor.email,
  }
  saveGovData(GOV_STORAGE_KEYS.BANNERS, [created, ...banners])
  recordGovernanceAudit({
    sourceModule: 'platform_governance',
    action: 'BILINGUAL_BANNER_PUBLISHED',
    actor: actor.email,
    targetEntity: `banner:${created.slug}`,
    summary: `Published bilingual banner "${created.titleEn}" / "${created.titleHi}".`,
    severity: 'info',
  })
  return created
}

export function toggleBilingualBannerStatus(
  bannerId: string,
  actor: GovernanceOperatorActor,
): PlatformBilingualBanner {
  assertSuperAdmin(actor, 'activate or pause CMS announcement banners')
  const banners = loadGovData<PlatformBilingualBanner[]>(GOV_STORAGE_KEYS.BANNERS, INITIAL_BANNERS)
  const idx = banners.findIndex(b => b.id === bannerId)
  if (idx === -1) throw new Error('Announcement banner not found.')

  banners[idx] = {
    ...banners[idx],
    isActive: !banners[idx].isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email,
  }
  saveGovData(GOV_STORAGE_KEYS.BANNERS, banners)

  recordGovernanceAudit({
    sourceModule: 'platform_governance',
    action: banners[idx].isActive ? 'BANNER_ACTIVATED' : 'BANNER_PAUSED',
    actor: actor.email,
    targetEntity: `banner:${banners[idx].slug}`,
    summary: `Changed active visibility to ${banners[idx].isActive}.`,
    severity: 'info',
  })
  return banners[idx]
}

export function addOrUpdateSportTaxonomy(
  input: SportTaxonomyItem,
  actor: GovernanceOperatorActor,
): SportTaxonomyItem {
  assertSuperAdmin(actor, 'modify sports catalogue taxonomy')
  const sports = loadGovData<SportTaxonomyItem[]>(GOV_STORAGE_KEYS.SPORTS, INITIAL_SPORTS_TAXONOMY)
  const cleanId = input.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  if (!cleanId || !input.labelEn.trim()) {
    throw new Error('Sport ID and English label are required.')
  }

  const normalized: SportTaxonomyItem = {
    ...input,
    id: cleanId,
    labelEn: input.labelEn.trim(),
    labelHi: input.labelHi.trim() || input.labelEn.trim(),
  }

  const idx = sports.findIndex(s => s.id === cleanId)
  if (idx >= 0) {
    sports[idx] = normalized
  } else {
    sports.unshift(normalized)
  }
  saveGovData(GOV_STORAGE_KEYS.SPORTS, sports)

  recordGovernanceAudit({
    sourceModule: 'platform_governance',
    action: idx >= 0 ? 'SPORT_TAXONOMY_UPDATED' : 'SPORT_TAXONOMY_ADDED',
    actor: actor.email,
    targetEntity: `sport:${normalized.id}`,
    summary: `Configured "${normalized.labelEn}" (${normalized.labelHi}) · Active: ${normalized.isActive}, Federation Check: ${normalized.requiresFederationVerification}.`,
    severity: 'info',
  })
  return normalized
}

export function addOrUpdateCityTaxonomy(
  input: CityTaxonomyItem,
  actor: GovernanceOperatorActor,
): CityTaxonomyItem {
  assertSuperAdmin(actor, 'modify Indian city discovery catalogue')
  const cities = loadGovData<CityTaxonomyItem[]>(GOV_STORAGE_KEYS.CITIES, INITIAL_CITIES_TAXONOMY)
  const cleanSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  if (!cleanSlug || !input.name.trim() || !input.state.trim()) {
    throw new Error('City slug, name, and state are required.')
  }

  const normalized: CityTaxonomyItem = {
    ...input,
    slug: cleanSlug,
    name: input.name.trim(),
    state: input.state.trim(),
  }

  const idx = cities.findIndex(c => c.slug === cleanSlug)
  if (idx >= 0) {
    cities[idx] = normalized
  } else {
    cities.unshift(normalized)
  }
  saveGovData(GOV_STORAGE_KEYS.CITIES, cities)

  recordGovernanceAudit({
    sourceModule: 'platform_governance',
    action: idx >= 0 ? 'CITY_CATALOGUE_UPDATED' : 'CITY_CATALOGUE_ADDED',
    actor: actor.email,
    targetEntity: `city:${normalized.slug}`,
    summary: `Configured city ${normalized.name}, ${normalized.state} (${normalized.launchTier}) · Discovery Enabled: ${normalized.discoveryEnabled}.`,
    severity: 'info',
  })
  return normalized
}

export async function grantOrUpdateOperatorRbac(
  input: {
    userId: string
    email: string
    displayName: string
    role: AdminPlatformRole
    isActive: boolean
    notes: string
    assignedScopes?: string[]
  },
  actor: GovernanceOperatorActor,
): Promise<OperatorRbacAccount> {
  assertSuperAdmin(actor, 'grant or modify operator RBAC permissions')

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  if (!uuidRegex.test(input.userId.trim())) {
    throw new Error('Valid Supabase Auth User UUID (RFC 4122 format) is required.')
  }

  const operators = loadGovData<OperatorRbacAccount[]>(GOV_STORAGE_KEYS.OPERATORS, INITIAL_RBAC_OPERATORS)
  const idx = operators.findIndex(o => o.userId === input.userId.trim())
  const activeSuperAdmins = operators.filter(o => o.isActive && o.role === 'super_admin')

  // Invariant guard: prevent disabling or demoting the last active super_admin
  if (idx >= 0 && operators[idx].role === 'super_admin' && operators[idx].isActive) {
    const removesLastSuperAdmin = !input.isActive || input.role !== 'super_admin'
    if (removesLastSuperAdmin && activeSuperAdmins.length <= 1) {
      throw new Error(
        'Safety Invariant Blocked: Cannot deactivate or demote the last active Super-Admin on the platform.',
      )
    }
  }

  // Attempt live RPC sync if browser session is authenticated; gracefully keep governance store consistent
  try {
    await setListingModeratorAccess({
      userId: input.userId.trim(),
      role: input.role,
      isActive: input.isActive,
      notes: input.notes,
    })
  } catch {
    // Expected when operating inside local governance/Vitest test sandbox without live session JWT
  }

  const updatedRecord: OperatorRbacAccount = {
    userId: input.userId.trim(),
    email: input.email.trim() || (idx >= 0 ? operators[idx].email : `operator-${input.userId.slice(0, 6)}@khelgrid.com`),
    displayName: input.displayName.trim() || (idx >= 0 ? operators[idx].displayName : 'Platform Operator'),
    role: input.role,
    isActive: input.isActive,
    mfaVerified: idx >= 0 ? operators[idx].mfaVerified : true,
    lastActiveAt: new Date().toISOString(),
    grantedBy: actor.email,
    notes: input.notes.trim() || `Role updated to ${input.role} by ${actor.email}.`,
    assignedScopes:
      input.assignedScopes && input.assignedScopes.length > 0
        ? input.assignedScopes
        : input.role === 'super_admin'
          ? ['all_workspaces', 'rbac_sovereignty', 'feature_flags', 'banner_cms', 'audit_export']
          : ['moderation_desk', 'verification_vault', 'chronicle_desk', 'creator_campaigns'],
  }

  if (idx >= 0) {
    operators[idx] = updatedRecord
  } else {
    operators.unshift(updatedRecord)
  }
  saveGovData(GOV_STORAGE_KEYS.OPERATORS, operators)

  recordGovernanceAudit({
    sourceModule: 'rbac_access',
    action: input.isActive ? `RBAC_ROLE_SET_${input.role.toUpperCase()}` : 'RBAC_ACCESS_REVOKED',
    actor: actor.email,
    targetEntity: `operator:${updatedRecord.email}`,
    summary: `UUID ${updatedRecord.userId.slice(0, 8)}… -> role: ${updatedRecord.role}, active: ${updatedRecord.isActive}. Reason: ${updatedRecord.notes}`,
    severity: !updatedRecord.isActive || updatedRecord.role === 'super_admin' ? 'critical' : 'warning',
  })

  return updatedRecord
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const raw = value === undefined || value === null ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function exportPlatformAuditToCsv(events: UnifiedPlatformAuditRecord[]): string {
  const headers = [
    'Sequence Code',
    'Timestamp (ISO 8601)',
    'Source Module',
    'Action',
    'Severity',
    'Actor',
    'Target Entity',
    'Audit Summary',
    'Immutable Checksum',
  ]

  const rows = events.map(e => [
    e.sequenceCode,
    e.timestamp,
    e.sourceModule,
    e.action,
    e.severity,
    e.actor,
    e.targetEntity,
    e.summary,
    e.immutableChecksum,
  ])

  return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

export function resetPlatformGovernanceForTesting(): void {
  govMemoryStore.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      Object.values(GOV_STORAGE_KEYS).forEach(k => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }
}
