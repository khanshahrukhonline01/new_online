import { useState, useEffect, useMemo, useCallback, type FC } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getGovernanceCapabilities,
  type AdminPlatformRole,
} from '../auth/adminSecurityPolicy'
import {
  getPlatformGovernanceSnapshot,
  togglePlatformFeatureFlag,
  saveBilingualBanner,
  toggleBilingualBannerStatus,
  addOrUpdateSportTaxonomy,
  addOrUpdateCityTaxonomy,
  grantOrUpdateOperatorRbac,
  exportPlatformAuditToCsv,
  resetPlatformGovernanceForTesting,
  type PlatformGovernanceSnapshot,
  type PlatformFeatureFlag,
  type PlatformBilingualBanner,
  type BannerTone,
  type SportTaxonomyCategory,
  type CityZone,
  type CityLaunchTier,
  type AuditSourceModule,
  type AuditSeverity,
  type BannerAudienceScope,
} from '../services/adminPlatformGovernanceService'
import { BANNER_AUDIENCE_LABELS, subscribeRegulatoryState } from '../../../../src/shared/governance/regulatoryBridge'
import { getMakerCheckerProposals } from '../services/adminGovernanceEscalationService'
import { AdminMakerCheckerPanel } from './AdminMakerCheckerPanel'
import './AdminPlatformGovernanceDesk.css'

export type GovernanceSubDesk =
  | 'feature_flags'
  | 'bilingual_cms'
  | 'taxonomies'
  | 'operator_rbac'
  | 'audit_explorer'
  | 'maker_checker'

export interface AdminPlatformGovernanceDeskProps {
  operatorEmail?: string
  operatorRole?: AdminPlatformRole
  operatorUserId?: string
}

function formatIsoDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export const AdminPlatformGovernanceDesk: FC<AdminPlatformGovernanceDeskProps> = ({
  operatorEmail = 'founder@khelgrid.com',
  operatorRole = 'super_admin',
  operatorUserId,
}) => {
  const actor = useMemo(
    () => ({
      name: operatorEmail.split('@')[0] || 'Platform Governance Officer',
      email: operatorEmail,
      role: operatorRole,
      userId: operatorUserId,
    }),
    [operatorEmail, operatorRole, operatorUserId],
  )

  const capabilities = useMemo(() => getGovernanceCapabilities(operatorRole), [operatorRole])

  const [subDesk, setSubDesk] = useState<GovernanceSubDesk>('feature_flags')
  const [snapshot, setSnapshot] = useState<PlatformGovernanceSnapshot | null>(null)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(() =>
    getMakerCheckerProposals().filter(p => p.status === 'pending_approval').length,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null)

  // Filters
  const [sportSearch, setSportSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [cityZoneFilter, setCityZoneFilter] = useState<CityZone | 'all'>('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditModuleFilter, setAuditModuleFilter] = useState<AuditSourceModule | 'all'>('all')
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<AuditSeverity | 'all'>('all')

  // Banner CMS Modal
  const [bannerModalOpen, setBannerModalOpen] = useState(false)
  const [editingBannerId, setEditingBannerId] = useState<string | undefined>(undefined)
  const [bannerSlug, setBannerSlug] = useState('')
  const [bannerTone, setBannerTone] = useState<BannerTone>('emerald')
  const [bannerAudience, setBannerAudience] = useState<BannerAudienceScope>('all')
  const [bannerBadgeEn, setBannerBadgeEn] = useState('Platform Alert')
  const [bannerBadgeHi, setBannerBadgeHi] = useState('प्लेटफ़ॉर्म अलर्ट')
  const [bannerTitleEn, setBannerTitleEn] = useState('')
  const [bannerTitleHi, setBannerTitleHi] = useState('')
  const [bannerSubEn, setBannerSubEn] = useState('')
  const [bannerSubHi, setBannerSubHi] = useState('')
  const [bannerCtaEn, setBannerCtaEn] = useState('Explore')
  const [bannerCtaHi, setBannerCtaHi] = useState('देखें')
  const [bannerCtaUrl, setBannerCtaUrl] = useState('/opportunities')

  // Taxonomy Add Modals
  const [sportModalOpen, setSportModalOpen] = useState(false)
  const [newSportId, setNewSportId] = useState('')
  const [newSportEn, setNewSportEn] = useState('')
  const [newSportHi, setNewSportHi] = useState('')
  const [newSportCategory, setNewSportCategory] = useState<SportTaxonomyCategory>('team_sport')
  const [newSportFeatured, setNewSportFeatured] = useState(true)
  const [newSportReqFed, setNewSportReqFed] = useState(false)

  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [newCityName, setNewCityName] = useState('')
  const [newCityState, setNewCityState] = useState('')
  const [newCityZone, setNewCityZone] = useState<CityZone>('North')
  const [newCityTier, setNewCityTier] = useState<CityLaunchTier>('tier_2_hub')
  const [newCityMetro, setNewCityMetro] = useState(false)

  // RBAC Operator Grant Modal
  const [rbacModalOpen, setRbacModalOpen] = useState(false)
  const [rbacUserId, setRbacUserId] = useState('')
  const [rbacEmail, setRbacEmail] = useState('')
  const [rbacDisplayName, setRbacDisplayName] = useState('')
  const [rbacRole, setRbacRole] = useState<AdminPlatformRole>('moderator')
  const [rbacActive, setRbacActive] = useState(true)
  const [rbacNotes, setRbacNotes] = useState('')

  const showToast = useCallback((text: string, isError = false) => {
    setToast({ text, isError })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true)
    try {
      const next = await getPlatformGovernanceSnapshot()
      setSnapshot(next)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load platform governance state.', true)
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadSnapshot()
    const syncApprovals = () => {
      setPendingApprovalsCount(
        getMakerCheckerProposals().filter(p => p.status === 'pending_approval').length,
      )
    }
    const handleOpenMakerChecker = () => {
      syncApprovals()
      setSubDesk('maker_checker')
    }
    syncApprovals()
    const unsub = subscribeRegulatoryState(syncApprovals)
    if (typeof window !== 'undefined') {
      window.addEventListener('khelgrid-admin-open-maker-checker', handleOpenMakerChecker)
    }
    return () => {
      unsub()
      if (typeof window !== 'undefined') {
        window.removeEventListener('khelgrid-admin-open-maker-checker', handleOpenMakerChecker)
      }
    }
  }, [loadSnapshot])

  const filteredSports = useMemo(() => {
    if (!snapshot) return []
    const q = sportSearch.trim().toLowerCase()
    if (!q) return snapshot.sports
    return snapshot.sports.filter(
      s =>
        s.labelEn.toLowerCase().includes(q) ||
        s.labelHi.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    )
  }, [snapshot, sportSearch])

  const filteredCities = useMemo(() => {
    if (!snapshot) return []
    const q = citySearch.trim().toLowerCase()
    return snapshot.cities.filter(c => {
      if (cityZoneFilter !== 'all' && c.zone !== cityZoneFilter) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      )
    })
  }, [snapshot, citySearch, cityZoneFilter])

  const filteredAudits = useMemo(() => {
    if (!snapshot) return []
    const q = auditSearch.trim().toLowerCase()
    return snapshot.auditEvents.filter(e => {
      if (auditModuleFilter !== 'all' && e.sourceModule !== auditModuleFilter) return false
      if (auditSeverityFilter !== 'all' && e.severity !== auditSeverityFilter) return false
      if (!q) return true
      return (
        e.sequenceCode.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.targetEntity.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q)
      )
    })
  }, [snapshot, auditSearch, auditModuleFilter, auditSeverityFilter])

  // Mutations
  const handleFlagToggle = async (flag: PlatformFeatureFlag) => {
    try {
      const updated = togglePlatformFeatureFlag(
        flag.key,
        actor,
        `Toggled ${flag.name} via Governance Control Plane`,
      )
      showToast(`Flag "${updated.name}" set to ${updated.enabled ? 'ENABLED' : 'DISABLED'}.`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update flag.', true)
    }
  }

  const openEditBannerModal = (banner?: PlatformBilingualBanner) => {
    setEditingBannerId(banner?.id)
    setBannerSlug(banner?.slug || `announcement-${Date.now().toString(36)}`)
    setBannerTone(banner?.tone || 'emerald')
    setBannerAudience(banner?.targetAudience || 'all')
    setBannerBadgeEn(banner?.badgeEn || 'Platform Update')
    setBannerBadgeHi(banner?.badgeHi || 'खेलग्रिड सूचना')
    setBannerTitleEn(banner?.titleEn || '')
    setBannerTitleHi(banner?.titleHi || '')
    setBannerSubEn(banner?.subtitleEn || '')
    setBannerSubHi(banner?.subtitleHi || '')
    setBannerCtaEn(banner?.ctaLabelEn || 'Learn More')
    setBannerCtaHi(banner?.ctaLabelHi || 'और जानें')
    setBannerCtaUrl(banner?.ctaUrl || '/opportunities')
    setBannerModalOpen(true)
  }

  const handleSaveBanner = async () => {
    try {
      saveBilingualBanner(
        {
          id: editingBannerId,
          slug: bannerSlug,
          tone: bannerTone,
          targetLocale: 'both',
          targetAudience: bannerAudience,
          badgeEn: bannerBadgeEn,
          badgeHi: bannerBadgeHi,
          titleEn: bannerTitleEn,
          titleHi: bannerTitleHi,
          subtitleEn: bannerSubEn,
          subtitleHi: bannerSubHi,
          ctaLabelEn: bannerCtaEn,
          ctaLabelHi: bannerCtaHi,
          ctaUrl: bannerCtaUrl,
          priority: 95,
          isActive: true,
        },
        actor,
      )
      setBannerModalOpen(false)
      showToast(`Bilingual CMS banner published to ${BANNER_AUDIENCE_LABELS[bannerAudience]}.`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save banner.', true)
    }
  }

  const handleToggleBanner = async (bannerId: string) => {
    try {
      const updated = toggleBilingualBannerStatus(bannerId, actor)
      showToast(`Banner "${updated.titleEn}" ${updated.isActive ? 'activated' : 'paused'}.`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not toggle banner.', true)
    }
  }

  const handleToggleSportActive = async (sportId: string) => {
    if (!snapshot) return
    const target = snapshot.sports.find(s => s.id === sportId)
    if (!target) return
    try {
      addOrUpdateSportTaxonomy({ ...target, isActive: !target.isActive }, actor)
      showToast(`Sport "${target.labelEn}" ${!target.isActive ? 'enabled' : 'hidden'} in discovery.`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update sport taxonomy.', true)
    }
  }

  const handleSaveNewSport = async () => {
    try {
      const added = addOrUpdateSportTaxonomy(
        {
          id: newSportId || newSportEn,
          labelEn: newSportEn,
          labelHi: newSportHi || newSportEn,
          category: newSportCategory,
          isActive: true,
          isFeaturedDiscovery: newSportFeatured,
          requiresFederationVerification: newSportReqFed,
          listingsCountEstimate: 0,
        },
        actor,
      )
      setSportModalOpen(false)
      setNewSportId('')
      setNewSportEn('')
      setNewSportHi('')
      showToast(`Added sport taxonomy "${added.labelEn}" (${added.labelHi}).`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add sport taxonomy.', true)
    }
  }

  const handleToggleCityEnabled = async (citySlug: string) => {
    if (!snapshot) return
    const target = snapshot.cities.find(c => c.slug === citySlug)
    if (!target) return
    try {
      addOrUpdateCityTaxonomy({ ...target, discoveryEnabled: !target.discoveryEnabled }, actor)
      showToast(`City "${target.name}" discovery ${!target.discoveryEnabled ? 'enabled' : 'paused'}.`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update city catalogue.', true)
    }
  }

  const handleSaveNewCity = async () => {
    try {
      const added = addOrUpdateCityTaxonomy(
        {
          slug: newCityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: newCityName,
          state: newCityState,
          zone: newCityZone,
          isMetro: newCityMetro,
          launchTier: newCityTier,
          discoveryEnabled: true,
          majorVenuesCount: 1,
          sampleVenues: [`${newCityName} Municipal Sports Complex`],
        },
        actor,
      )
      setCityModalOpen(false)
      setNewCityName('')
      setNewCityState('')
      showToast(`City "${added.name}, ${added.state}" added to discovery catalogue.`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save city.', true)
    }
  }

  const openRbacEdit = (op?: {
    userId: string
    email: string
    displayName: string
    role: AdminPlatformRole
    isActive: boolean
    notes: string
  }) => {
    setRbacUserId(op?.userId || '')
    setRbacEmail(op?.email || '')
    setRbacDisplayName(op?.displayName || '')
    setRbacRole(op?.role || 'moderator')
    setRbacActive(op?.isActive ?? true)
    setRbacNotes(op?.notes || '')
    setRbacModalOpen(true)
  }

  const handleSaveRbac = async () => {
    try {
      const updated = await grantOrUpdateOperatorRbac(
        {
          userId: rbacUserId,
          email: rbacEmail,
          displayName: rbacDisplayName,
          role: rbacRole,
          isActive: rbacActive,
          notes: rbacNotes,
        },
        actor,
      )
      setRbacModalOpen(false)
      showToast(`RBAC role saved for ${updated.email} (${updated.role}).`)
      await loadSnapshot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'RBAC update failed.', true)
    }
  }

  const handleExportAuditCsv = () => {
    const csv = exportPlatformAuditToCsv(filteredAudits)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `khelgrid-platform-audit-trail-${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${filteredAudits.length} immutable audit records to CSV.`)
  }

  const handleResetData = () => {
    resetPlatformGovernanceForTesting()
    showToast('Governance flags, bilingual banners, taxonomies, and audit state reset.')
    void loadSnapshot()
  }

  return (
    <div className="gov-desk-root" data-testid="platform-governance-desk">
      {/* 1. Header Ribbon */}
      <header className="gov-header-ribbon">
        <div className="gov-title-block">
          <div className="gov-eyebrow">
            <SiteIcon name="settings" size={14} />
            <span>KHELGRID CONTROL PLANE · MODULE 7 GOVERNANCE &amp; RBAC</span>
          </div>
          <h1>Platform Settings, Audit Trails &amp; Role-Based Access Control</h1>
          <p>
            Constitutional governance for platform feature flags, global payment lockdown enforcement, Hindi/English CMS banners, sports &amp; Indian city taxonomies, operator RBAC permissions, and immutable cross-module audit trails.
          </p>
        </div>

        <div className="gov-header-actions">
          <span
            className={`gov-rbac-pill ${capabilities.canManageOperatorRbac ? 'is-super' : 'is-readonly'}`}
            data-testid="gov-clearance-pill"
          >
            <SiteIcon name={capabilities.canManageOperatorRbac ? 'shield-check' : 'lock'} size={13} />
            <span>
              {capabilities.canManageOperatorRbac
                ? 'Sovereign RBAC Write Access'
                : 'Read-Only Moderator View'}
            </span>
          </span>
          <button
            type="button"
            className="gov-btn gov-btn-secondary"
            onClick={handleExportAuditCsv}
          >
            <SiteIcon name="download" size={14} />
            <span>Export Audit CSV</span>
          </button>
          <button
            type="button"
            className="gov-btn gov-btn-secondary"
            onClick={handleResetData}
          >
            <span>Reset Seed Config</span>
          </button>
          <button
            type="button"
            className="gov-btn gov-btn-primary"
            onClick={() => void loadSnapshot()}
          >
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Read-only RBAC Alert Banner if Moderator */}
      {!capabilities.canManageOperatorRbac && (
        <div className="gov-readonly-banner" role="alert" data-testid="moderator-readonly-guard">
          <div>
            <strong>RBAC Separation of Duties Active:</strong> Your current role (<code>{operatorRole}</code>) can inspect system flags, browse city/sport catalogues, and audit cross-module logs. State mutations (Feature Flags, Bilingual CMS, Taxonomies, Operator RBAC Grants) strictly require sovereign Super-Admin clearance.
          </div>
        </div>
      )}

      {/* 2. Micro-KPI Telemetry Ribbon */}
      <section className="gov-kpi-grid" aria-label="Platform Governance Telemetry">
        <div className="gov-kpi-card kpi-lock" data-testid="kpi-payment-lock">
          <span className="gov-kpi-label">
            <SiteIcon name="lock" size={12} /> Payment Gateway State
          </span>
          <span className="gov-kpi-value" style={{ color: '#6ee7b7', fontSize: '1.25rem' }}>
            {snapshot?.metrics.paymentLockdownEnforced ?? true ? 'LOCKED DISABLED' : 'UNLOCKED'}
          </span>
          <span className="gov-kpi-sub">Escrow ledger only · Zero live captures</span>
        </div>

        <div className="gov-kpi-card" data-testid="kpi-flags">
          <span className="gov-kpi-label">Feature Flags Enabled</span>
          <span className="gov-kpi-value">
            {snapshot ? `${snapshot.metrics.activeFlagsCount}/${snapshot.metrics.totalFlagsCount}` : '6/7'}
          </span>
          <span className="gov-kpi-sub">Safety, SEO &amp; localisation gates</span>
        </div>

        <div className="gov-kpi-card" data-testid="kpi-banners">
          <span className="gov-kpi-label">Bilingual CMS Banners</span>
          <span className="gov-kpi-value">{snapshot?.metrics.activeBilingualBannersCount ?? 4}</span>
          <span className="gov-kpi-sub">English + हिन्दी live banners</span>
        </div>

        <div className="gov-kpi-card" data-testid="kpi-taxonomies">
          <span className="gov-kpi-label">Active Sports &amp; Cities</span>
          <span className="gov-kpi-value">
            {snapshot ? `${snapshot.metrics.activeSportsCount} · ${snapshot.metrics.enabledCitiesCount}` : '35 · 20+'}
          </span>
          <span className="gov-kpi-sub">Canonical India discovery index</span>
        </div>

        <div className="gov-kpi-card" data-testid="kpi-operators">
          <span className="gov-kpi-label">Authorized Operators</span>
          <span className="gov-kpi-value">{snapshot?.metrics.activeOperatorsCount ?? 4}</span>
          <span className="gov-kpi-sub">{snapshot?.metrics.superAdminsCount ?? 2} root · MFA verified</span>
        </div>

        <div className="gov-kpi-card kpi-audit" data-testid="kpi-audits">
          <span className="gov-kpi-label">Immutable Audit Events</span>
          <span className="gov-kpi-value">{snapshot?.metrics.totalAuditEventsCount ?? '—'}</span>
          <span className="gov-kpi-sub">
            {snapshot?.metrics.criticalAuditEventsCount ?? 0} critical security events
          </span>
        </div>
      </section>

      {/* 3. Sub-Desk Navigation Tabs */}
      <nav className="gov-tab-bar" role="tablist" aria-label="Platform Governance Sub-Desks">
        <button
          type="button"
          role="tab"
          aria-selected={subDesk === 'feature_flags'}
          className={`gov-tab-btn ${subDesk === 'feature_flags' ? 'is-active' : ''}`}
          onClick={() => setSubDesk('feature_flags')}
          data-testid="tab-feature-flags"
        >
          <SiteIcon name="sliders" size={14} />
          <span>Feature Flags &amp; Kill Switches</span>
          <span className="gov-tab-count">{snapshot?.featureFlags.length ?? 7}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subDesk === 'bilingual_cms'}
          className={`gov-tab-btn ${subDesk === 'bilingual_cms' ? 'is-active' : ''}`}
          onClick={() => setSubDesk('bilingual_cms')}
          data-testid="tab-bilingual-cms"
        >
          <SiteIcon name="languages" size={14} />
          <span>Hindi / English CMS Banners</span>
          <span className="gov-tab-count">{snapshot?.banners.length ?? 4}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subDesk === 'taxonomies'}
          className={`gov-tab-btn ${subDesk === 'taxonomies' ? 'is-active' : ''}`}
          onClick={() => setSubDesk('taxonomies')}
          data-testid="tab-taxonomies"
        >
          <SiteIcon name="globe" size={14} />
          <span>Sports &amp; City Taxonomies</span>
          <span className="gov-tab-count">{snapshot ? snapshot.sports.length + snapshot.cities.length : '—'}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subDesk === 'operator_rbac'}
          className={`gov-tab-btn ${subDesk === 'operator_rbac' ? 'is-active' : ''}`}
          onClick={() => setSubDesk('operator_rbac')}
          data-testid="tab-operator-rbac"
        >
          <SiteIcon name="users" size={14} />
          <span>Operator RBAC Matrix</span>
          <span className="gov-tab-count">{snapshot?.operators.length ?? 4}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subDesk === 'audit_explorer'}
          className={`gov-tab-btn ${subDesk === 'audit_explorer' ? 'is-active' : ''}`}
          onClick={() => setSubDesk('audit_explorer')}
          data-testid="tab-audit-explorer"
        >
          <SiteIcon name="shield-check" size={14} />
          <span>Immutable Audit Explorer</span>
          <span className="gov-tab-count">{snapshot?.auditEvents.length ?? '—'}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subDesk === 'maker_checker'}
          className={`gov-tab-btn ${subDesk === 'maker_checker' ? 'is-active' : ''}`}
          onClick={() => setSubDesk('maker_checker')}
          data-testid="tab-maker-checker"
        >
          <SiteIcon name="lock" size={14} />
          <span>Dual-Control Approvals</span>
          <span className="gov-tab-count">{pendingApprovalsCount}</span>
        </button>
      </nav>

      {subDesk === 'maker_checker' && (
        <section className="gov-panel-section" aria-label="Dual-Control Maker-Checker Approvals">
          <AdminMakerCheckerPanel
            operatorEmail={operatorEmail}
            onNotify={(msg, isError) => showToast(msg, isError)}
          />
        </section>
      )}

      {/* TAB 1: FEATURE FLAGS & KILL SWITCHES */}
      {subDesk === 'feature_flags' && (
        <section className="gov-flags-grid" data-testid="feature-flags-panel">
          {(snapshot?.featureFlags || []).map(flag => (
            <article
              key={flag.key}
              className={`gov-flag-card ${flag.policyLocked ? 'is-locked' : ''}`}
              data-testid={`flag-card-${flag.key}`}
            >
              <div className="gov-flag-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span className={`gov-badge gov-badge-${flag.riskLevel}`}>{flag.riskLevel}</span>
                    {flag.category === 'workspace_controls' && (
                      <span className="gov-badge gov-badge-active">Live Front-End Control</span>
                    )}
                    <code style={{ fontSize: '0.74rem', color: '#93c5fd' }}>{flag.key}</code>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', color: '#f8fafc' }}>{flag.name}</h3>
                </div>

                <button
                  type="button"
                  disabled={!capabilities.canMutateFeatureFlags || Boolean(flag.policyLocked)}
                  className={`gov-toggle-switch ${flag.enabled ? 'is-on' : 'is-off'}`}
                  onClick={() => void handleFlagToggle(flag)}
                  title={
                    flag.policyLocked
                      ? flag.policyLockReason
                      : !capabilities.canMutateFeatureFlags
                        ? 'Super-Admin privilege required to toggle flags'
                        : `Click to toggle ${flag.key}`
                  }
                >
                  <SiteIcon name={flag.policyLocked ? 'lock' : flag.enabled ? 'check-circle' : 'pause'} size={13} />
                  <span>{flag.policyLocked ? 'POLICY LOCKED' : flag.enabled ? 'ENABLED' : 'DISABLED'}</span>
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                {flag.description}
              </p>

              {flag.policyLocked && flag.policyLockReason && (
                <div style={{ fontSize: '0.75rem', color: '#6ee7b7', background: 'rgba(16,185,129,0.1)', padding: '0.45rem 0.65rem', borderRadius: '0.45rem' }}>
                  🔒 {flag.policyLockReason}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: '#94a3b8', marginTop: 'auto', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span>Scope: <strong>{flag.environment}</strong></span>
                <span>Updated by <strong>{flag.updatedBy}</strong> · {formatIsoDate(flag.updatedAt)}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* TAB 2: HINDI / ENGLISH BILINGUAL CMS BANNERS */}
      {subDesk === 'bilingual_cms' && (
        <section className="gov-panel-card" data-testid="bilingual-cms-panel">
          <div className="gov-panel-header">
            <div>
              <h4>Hindi &amp; English Bilingual Announcement Banners ({snapshot?.banners.length ?? 0})</h4>
              <span className="gov-panel-hint">
                Manage platform-wide safety advisories and seasonal discovery alerts synced in both English and देवनागरी (हिन्दी).
              </span>
            </div>
            <button
              type="button"
              className="gov-btn gov-btn-primary gov-btn-sm"
              disabled={!capabilities.canPublishBanners}
              onClick={() => openEditBannerModal()}
            >
              <SiteIcon name="plus" size={14} />
              <span>Publish Bilingual Banner</span>
            </button>
          </div>

          <div className="gov-banners-grid">
            {(snapshot?.banners || []).map(banner => (
              <article key={banner.id} className="gov-banner-card" data-testid={`banner-card-${banner.slug}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span className={`gov-badge ${banner.isActive ? 'gov-badge-active' : 'gov-badge-inactive'}`}>
                      {banner.isActive ? 'LIVE' : 'PAUSED'}
                    </span>
                    <span className="gov-badge gov-badge-standard">
                      Target: {BANNER_AUDIENCE_LABELS[banner.targetAudience || 'all']}
                    </span>
                    <code style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{banner.slug}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="gov-btn gov-btn-secondary gov-btn-sm"
                      disabled={!capabilities.canPublishBanners}
                      onClick={() => openEditBannerModal(banner)}
                    >
                      Edit Copy
                    </button>
                    <button
                      type="button"
                      className={`gov-btn gov-btn-sm ${banner.isActive ? 'gov-btn-danger' : 'gov-btn-success'}`}
                      disabled={!capabilities.canPublishBanners}
                      onClick={() => void handleToggleBanner(banner.id)}
                    >
                      {banner.isActive ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </div>

                <div className="gov-bilingual-split">
                  <div className="gov-lang-box">
                    <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      ENGLISH · {banner.badgeEn}
                    </div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                      {banner.titleEn}
                    </strong>
                    <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>{banner.subtitleEn}</div>
                    <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#6ee7b7' }}>
                      CTA: {banner.ctaLabelEn} ({banner.ctaUrl})
                    </div>
                  </div>

                  <div className="gov-lang-box">
                    <div style={{ fontSize: '0.68rem', color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      हिन्दी (DEVANAGARI) · {banner.badgeHi}
                    </div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                      {banner.titleHi}
                    </strong>
                    <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>{banner.subtitleHi}</div>
                    <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#6ee7b7' }}>
                      CTA: {banner.ctaLabelHi}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: SPORTS & INDIAN CITIES TAXONOMIES */}
      {subDesk === 'taxonomies' && (
        <div className="gov-taxonomy-split" data-testid="taxonomies-panel">
          {/* Sports Taxonomy */}
          <section className="gov-panel-card">
            <div className="gov-panel-header">
              <div>
                <h4>Sports Catalogue Taxonomy ({filteredSports.length})</h4>
                <span className="gov-panel-hint">Manage active sports, Hindi labels &amp; federation requirements</span>
              </div>
              <button
                type="button"
                className="gov-btn gov-btn-primary gov-btn-sm"
                disabled={!capabilities.canEditTaxonomies}
                onClick={() => setSportModalOpen(true)}
              >
                <SiteIcon name="plus" size={14} />
                <span>Add Sport</span>
              </button>
            </div>

            <div className="gov-toolbar-row">
              <input
                type="text"
                className="gov-input"
                style={{ flex: 1 }}
                placeholder="Search sports (Cricket, क्रिकेट, Pickleball…)"
                value={sportSearch}
                onChange={e => setSportSearch(e.target.value)}
              />
            </div>

            <div className="gov-table-scroll" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="gov-data-table" aria-label="Sports Taxonomy Table">
                <thead>
                  <tr>
                    <th>Sport (EN / HI)</th>
                    <th>Category</th>
                    <th>Fed. Req</th>
                    <th>State</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSports.map(sp => (
                    <tr key={sp.id}>
                      <td>
                        <strong>{sp.labelEn}</strong> · <span style={{ color: '#c4b5fd' }}>{sp.labelHi}</span>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}><code>{sp.id}</code></div>
                      </td>
                      <td>{sp.category.replace('_', ' ')}</td>
                      <td>{sp.requiresFederationVerification ? 'Required' : 'Optional'}</td>
                      <td>
                        <span className={`gov-badge ${sp.isActive ? 'gov-badge-active' : 'gov-badge-inactive'}`}>
                          {sp.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="gov-btn gov-btn-secondary gov-btn-sm"
                          disabled={!capabilities.canEditTaxonomies}
                          onClick={() => void handleToggleSportActive(sp.id)}
                        >
                          {sp.isActive ? 'Hide' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Indian Cities Taxonomy */}
          <section className="gov-panel-card">
            <div className="gov-panel-header">
              <div>
                <h4>Indian Cities Discovery Catalogue ({filteredCities.length})</h4>
                <span className="gov-panel-hint">Zone-wise Tier 1–3 sports hubs &amp; public visibility toggles</span>
              </div>
              <button
                type="button"
                className="gov-btn gov-btn-primary gov-btn-sm"
                disabled={!capabilities.canEditTaxonomies}
                onClick={() => setCityModalOpen(true)}
              >
                <SiteIcon name="plus" size={14} />
                <span>Add City</span>
              </button>
            </div>

            <div className="gov-toolbar-row">
              <input
                type="text"
                className="gov-input"
                style={{ flex: 1 }}
                placeholder="Search city or state..."
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
              />
              <select
                className="gov-select"
                value={cityZoneFilter}
                onChange={e => setCityZoneFilter(e.target.value as CityZone | 'all')}
              >
                <option value="all">All Indian Zones</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="West">West</option>
                <option value="East">East</option>
                <option value="Central">Central</option>
                <option value="North-East">North-East</option>
              </select>
            </div>

            <div className="gov-table-scroll" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="gov-data-table" aria-label="Cities Taxonomy Table">
                <thead>
                  <tr>
                    <th>City &amp; State</th>
                    <th>Zone / Tier</th>
                    <th>Discovery</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.map(ct => (
                    <tr key={ct.slug}>
                      <td>
                        <strong>{ct.name}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {ct.state} · {ct.majorVenuesCount} anchor venues
                        </div>
                      </td>
                      <td>
                        <div>{ct.zone}</div>
                        <div style={{ fontSize: '0.72rem', color: '#93c5fd' }}>{ct.launchTier.replace(/_/g, ' ')}</div>
                      </td>
                      <td>
                        <span className={`gov-badge ${ct.discoveryEnabled ? 'gov-badge-active' : 'gov-badge-inactive'}`}>
                          {ct.discoveryEnabled ? 'Enabled' : 'Paused'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="gov-btn gov-btn-secondary gov-btn-sm"
                          disabled={!capabilities.canEditTaxonomies}
                          onClick={() => void handleToggleCityEnabled(ct.slug)}
                        >
                          {ct.discoveryEnabled ? 'Pause' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: OPERATOR RBAC PERMISSIONS MATRIX */}
      {subDesk === 'operator_rbac' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} data-testid="operator-rbac-panel">
          <section className="gov-panel-card">
            <div className="gov-panel-header">
              <div>
                <h4>Authorized KhelGrid Platform Operators ({snapshot?.operators.length ?? 0})</h4>
                <span className="gov-panel-hint">
                  Least-privilege role grants enforced by Supabase Row-Level Security. System blocks deactivating the final active Super-Admin.
                </span>
              </div>
              <button
                type="button"
                className="gov-btn gov-btn-primary gov-btn-sm"
                disabled={!capabilities.canManageOperatorRbac}
                onClick={() => openRbacEdit()}
              >
                <SiteIcon name="plus" size={14} />
                <span>Grant Operator Access</span>
              </button>
            </div>

            <div className="gov-table-scroll">
              <table className="gov-data-table" aria-label="RBAC Operators Directory">
                <thead>
                  <tr>
                    <th>Operator &amp; Auth UUID</th>
                    <th>Role Grant</th>
                    <th>Assigned Workspace Scopes</th>
                    <th>Status / MFA</th>
                    <th>Granted By &amp; Notes</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {(snapshot?.operators || []).map(op => (
                    <tr key={op.userId} data-testid={`operator-row-${op.userId}`}>
                      <td>
                        <strong>{op.displayName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>{op.email}</div>
                        <code style={{ fontSize: '0.7rem', color: '#64748b' }}>{op.userId}</code>
                      </td>
                      <td>
                        <span className={`gov-badge gov-badge-${op.role}`}>
                          {op.role}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.74rem', color: '#cbd5e1' }}>
                        {op.assignedScopes.join(', ')}
                      </td>
                      <td>
                        <span className={`gov-badge ${op.isActive ? 'gov-badge-active' : 'gov-badge-inactive'}`}>
                          {op.isActive ? 'Active' : 'Revoked'}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '0.2rem' }}>
                          {op.mfaVerified ? 'MFA Enforced' : 'MFA Pending'}
                        </div>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.76rem', color: '#94a3b8' }}>
                        <div><strong>By:</strong> {op.grantedBy}</div>
                        <div>{op.notes}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="gov-btn gov-btn-secondary gov-btn-sm"
                          disabled={!capabilities.canManageOperatorRbac}
                          onClick={() => openRbacEdit(op)}
                        >
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="gov-panel-card">
            <div className="gov-panel-header">
              <div>
                <h4>RBAC Capability Boundary Matrix</h4>
                <span className="gov-panel-hint">Explicit permission boundaries between standard Moderators and sovereign Super-Admins</span>
              </div>
            </div>
            <div className="gov-table-scroll">
              <table className="gov-data-table" aria-label="RBAC Capability Matrix">
                <thead>
                  <tr>
                    <th>Operational Capability</th>
                    <th>Moderator Role (`moderator`)</th>
                    <th>Super-Admin Role (`super_admin`)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Listing Moderation, Tenants, Verification Vault, Chronicle, Creator &amp; Safety Desks</td>
                    <td><span className="gov-badge gov-badge-active">Full Desk Ops</span></td>
                    <td><span className="gov-badge gov-badge-active">Full Desk Ops</span></td>
                  </tr>
                  <tr>
                    <td>Immutable Cross-Module Audit Explorer &amp; RFC 4180 CSV Export</td>
                    <td><span className="gov-badge gov-badge-active">Read &amp; Export</span></td>
                    <td><span className="gov-badge gov-badge-active">Read &amp; Export</span></td>
                  </tr>
                  <tr>
                    <td>Platform Feature Flags, Hindi/English CMS Banners &amp; Taxonomies</td>
                    <td><span className="gov-badge gov-badge-inactive">Read-Only Locked</span></td>
                    <td><span className="gov-badge gov-badge-active">Full Write Sovereignty</span></td>
                  </tr>
                  <tr>
                    <td>Grant / Revoke Operator RBAC Roles &amp; Enforce Last-Admin Guard</td>
                    <td><span className="gov-badge gov-badge-inactive">Prohibited (RPC Denied)</span></td>
                    <td><span className="gov-badge gov-badge-active">Authorized via RPC</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: IMMUTABLE PLATFORM-WIDE AUDIT EXPLORER */}
      {subDesk === 'audit_explorer' && (
        <section className="gov-panel-card" data-testid="audit-explorer-panel">
          <div className="gov-panel-header">
            <div>
              <h4>Immutable Platform-Wide Audit Explorer ({filteredAudits.length} events)</h4>
              <span className="gov-panel-hint">
                Cryptographically checksummed unified log streaming events from Tenants, Verification Vault, Moderation, Chronicle, Trust &amp; Safety, Creator Attribution, and System RBAC.
              </span>
            </div>
            <button
              type="button"
              className="gov-btn gov-btn-primary gov-btn-sm"
              onClick={handleExportAuditCsv}
            >
              <SiteIcon name="download" size={14} />
              <span>Export Filtered CSV</span>
            </button>
          </div>

          <div className="gov-toolbar-row">
            <input
              type="text"
              className="gov-input"
              style={{ flex: '1 1 260px' }}
              placeholder="Search sequence #, action, actor email, target entity, or notes..."
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              data-testid="audit-search-input"
            />
            <select
              className="gov-select"
              value={auditModuleFilter}
              onChange={e => setAuditModuleFilter(e.target.value as AuditSourceModule | 'all')}
              data-testid="audit-module-filter"
            >
              <option value="all">All Platform Modules</option>
              <option value="platform_governance">Platform Governance &amp; Flags</option>
              <option value="rbac_access">RBAC Operator Access</option>
              <option value="tenant_governance">Tenant &amp; Org Governance</option>
              <option value="verification_vault">Verification &amp; Evidence Vault</option>
              <option value="moderation_desk">Listing Moderation Queue</option>
              <option value="chronicle_desk">Chronicle Editorial Desk</option>
              <option value="fraud_disputes">Trust &amp; Safety / Sanctions</option>
              <option value="creator_campaigns">Creator Campaigns &amp; Attribution</option>
              <option value="gate_desk">QR Gate Check-In Telemetry</option>
              <option value="turf_oversight">Turf Slot Utilization &amp; Maintenance</option>
              <option value="academy_oversight">Academy Batch &amp; Attendance</option>
            </select>
            <select
              className="gov-select"
              value={auditSeverityFilter}
              onChange={e => setAuditSeverityFilter(e.target.value as AuditSeverity | 'all')}
              data-testid="audit-severity-filter"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Security / Sanctions</option>
              <option value="warning">Warnings / Revisions / Rejections</option>
              <option value="info">Standard Operations</option>
            </select>
          </div>

          <div className="gov-table-scroll">
            <table className="gov-data-table" aria-label="Platform Audit Explorer Table">
              <thead>
                <tr>
                  <th>Sequence / Timestamp</th>
                  <th>Source Module</th>
                  <th>Action &amp; Severity</th>
                  <th>Operator / Actor</th>
                  <th>Target Entity</th>
                  <th>Audit Summary</th>
                  <th>Tamper Checksum</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                      Aggregating immutable logs across modules…
                    </td>
                  </tr>
                ) : filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No audit events matched current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.slice(0, 120).map(evt => (
                    <tr key={evt.id} data-testid={`audit-row-${evt.id}`}>
                      <td>
                        <strong style={{ fontFamily: 'monospace' }}>{evt.sequenceCode}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatIsoDate(evt.timestamp)}</div>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.74rem', color: '#93c5fd' }}>
                          {evt.sourceModule}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.76rem' }}>{evt.action}</div>
                        <span className={`gov-badge gov-badge-${evt.severity}`} style={{ marginTop: '0.2rem' }}>
                          {evt.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{evt.actor}</td>
                      <td style={{ maxWidth: '200px', fontWeight: 600 }}>{evt.targetEntity}</td>
                      <td style={{ maxWidth: '280px', fontSize: '0.78rem', color: '#cbd5e1' }}>{evt.summary}</td>
                      <td>
                        <code style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>{evt.immutableChecksum}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL 1: BILINGUAL CMS BANNER EDITOR */}
      {bannerModalOpen && (
        <div className="gov-modal-backdrop" onClick={() => setBannerModalOpen(false)}>
          <div className="gov-modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Bilingual Banner Editor">
            <div className="gov-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Publish / Edit Bilingual CMS Banner (EN + HI)</h3>
              <button type="button" className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => setBannerModalOpen(false)}>
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="gov-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="gov-form-field">
                  Banner Slug
                  <input className="gov-input" value={bannerSlug} onChange={e => setBannerSlug(e.target.value)} />
                </label>
                <label className="gov-form-field">
                  Tone
                  <select className="gov-select" value={bannerTone} onChange={e => setBannerTone(e.target.value as BannerTone)}>
                    <option value="emerald">Emerald (Verified / Trials)</option>
                    <option value="indigo">Indigo (Live Match Center)</option>
                    <option value="amber">Amber (Championship / Advisory)</option>
                    <option value="cyan">Cyan (Information / Taxonomy)</option>
                    <option value="rose">Rose (Urgent Trust Alert)</option>
                  </select>
                </label>
              </div>
              <label className="gov-form-field">
                Target Audience (Front-End Delivery Scope)
                <select
                  className="gov-select"
                  value={bannerAudience}
                  onChange={e => setBannerAudience(e.target.value as BannerAudienceScope)}
                  data-testid="banner-audience-select"
                >
                  {(Object.entries(BANNER_AUDIENCE_LABELS) as [BannerAudienceScope, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="gov-form-field">
                  Badge (English)
                  <input className="gov-input" value={bannerBadgeEn} onChange={e => setBannerBadgeEn(e.target.value)} />
                </label>
                <label className="gov-form-field">
                  Badge (हिन्दी)
                  <input className="gov-input" value={bannerBadgeHi} onChange={e => setBannerBadgeHi(e.target.value)} />
                </label>
              </div>
              <label className="gov-form-field">
                Headline (English)
                <input className="gov-input" value={bannerTitleEn} onChange={e => setBannerTitleEn(e.target.value)} placeholder="e.g. National Junior Athletics Trials Open" />
              </label>
              <label className="gov-form-field">
                Headline (हिन्दी)
                <input className="gov-input" value={bannerTitleHi} onChange={e => setBannerTitleHi(e.target.value)} placeholder="उदा. राष्ट्रीय जूनियर एथलेटिक्स ट्रायल प्रारंभ" />
              </label>
              <label className="gov-form-field">
                Subtitle (English)
                <textarea rows={2} className="gov-textarea" value={bannerSubEn} onChange={e => setBannerSubEn(e.target.value)} />
              </label>
              <label className="gov-form-field">
                Subtitle (हिन्दी)
                <textarea rows={2} className="gov-textarea" value={bannerSubHi} onChange={e => setBannerSubHi(e.target.value)} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <label className="gov-form-field">
                  CTA (English)
                  <input className="gov-input" value={bannerCtaEn} onChange={e => setBannerCtaEn(e.target.value)} />
                </label>
                <label className="gov-form-field">
                  CTA (हिन्दी)
                  <input className="gov-input" value={bannerCtaHi} onChange={e => setBannerCtaHi(e.target.value)} />
                </label>
                <label className="gov-form-field">
                  Target URL
                  <input className="gov-input" value={bannerCtaUrl} onChange={e => setBannerCtaUrl(e.target.value)} />
                </label>
              </div>
            </div>
            <div className="gov-modal-footer">
              <button type="button" className="gov-btn gov-btn-secondary" onClick={() => setBannerModalOpen(false)}>Cancel</button>
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => void handleSaveBanner()}>Save &amp; Publish Banner</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SPORT TAXONOMY */}
      {sportModalOpen && (
        <div className="gov-modal-backdrop" onClick={() => setSportModalOpen(false)}>
          <div className="gov-modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add Sport Taxonomy">
            <div className="gov-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Add Canonical Sport Taxonomy</h3>
              <button type="button" className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => setSportModalOpen(false)}>
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="gov-modal-body">
              <label className="gov-form-field">
                Sport Slug ID
                <input className="gov-input" value={newSportId} onChange={e => setNewSportId(e.target.value)} placeholder="e.g. kho-kho" />
              </label>
              <label className="gov-form-field">
                Display Name (English)
                <input className="gov-input" value={newSportEn} onChange={e => setNewSportEn(e.target.value)} placeholder="e.g. Kho-Kho" />
              </label>
              <label className="gov-form-field">
                Display Name (हिन्दी)
                <input className="gov-input" value={newSportHi} onChange={e => setNewSportHi(e.target.value)} placeholder="e.g. खो-खो" />
              </label>
              <label className="gov-form-field">
                Category
                <select className="gov-select" value={newSportCategory} onChange={e => setNewSportCategory(e.target.value as SportTaxonomyCategory)}>
                  <option value="team_sport">Team Sport</option>
                  <option value="racquet">Racquet Sport</option>
                  <option value="combat_martial">Combat / Martial</option>
                  <option value="aquatics_track">Aquatics / Track</option>
                  <option value="mind_precision">Mind / Precision</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={newSportFeatured} onChange={e => setNewSportFeatured(e.target.checked)} />
                  Featured in Discovery
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={newSportReqFed} onChange={e => setNewSportReqFed(e.target.checked)} />
                  Require Federation Document
                </label>
              </div>
            </div>
            <div className="gov-modal-footer">
              <button type="button" className="gov-btn gov-btn-secondary" onClick={() => setSportModalOpen(false)}>Cancel</button>
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => void handleSaveNewSport()}>Save Sport</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CITY TAXONOMY */}
      {cityModalOpen && (
        <div className="gov-modal-backdrop" onClick={() => setCityModalOpen(false)}>
          <div className="gov-modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add City Catalogue">
            <div className="gov-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Add Indian City to Discovery Index</h3>
              <button type="button" className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => setCityModalOpen(false)}>
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="gov-modal-body">
              <label className="gov-form-field">
                City Name
                <input className="gov-input" value={newCityName} onChange={e => setNewCityName(e.target.value)} placeholder="e.g. Ranchi" />
              </label>
              <label className="gov-form-field">
                State / Union Territory
                <input className="gov-input" value={newCityState} onChange={e => setNewCityState(e.target.value)} placeholder="e.g. Jharkhand" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="gov-form-field">
                  Indian Zone
                  <select className="gov-select" value={newCityZone} onChange={e => setNewCityZone(e.target.value as CityZone)}>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="West">West</option>
                    <option value="East">East</option>
                    <option value="Central">Central</option>
                    <option value="North-East">North-East</option>
                  </select>
                </label>
                <label className="gov-form-field">
                  Launch Tier
                  <select className="gov-select" value={newCityTier} onChange={e => setNewCityTier(e.target.value as CityLaunchTier)}>
                    <option value="tier_1_metro">Tier 1 Metro</option>
                    <option value="tier_2_hub">Tier 2 Sports Hub</option>
                    <option value="tier_3_grassroots">Tier 3 Grassroots</option>
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <input type="checkbox" checked={newCityMetro} onChange={e => setNewCityMetro(e.target.checked)} />
                Designate as Metro Hub
              </label>
            </div>
            <div className="gov-modal-footer">
              <button type="button" className="gov-btn gov-btn-secondary" onClick={() => setCityModalOpen(false)}>Cancel</button>
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => void handleSaveNewCity()}>Add City</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RBAC OPERATOR ROLE EDITOR */}
      {rbacModalOpen && (
        <div className="gov-modal-backdrop" onClick={() => setRbacModalOpen(false)}>
          <div className="gov-modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Operator RBAC Editor">
            <div className="gov-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Grant / Update Operator RBAC Role</h3>
              <button type="button" className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => setRbacModalOpen(false)}>
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="gov-modal-body">
              <label className="gov-form-field">
                Supabase Auth User UUID (RFC 4122)
                <input className="gov-input" value={rbacUserId} onChange={e => setRbacUserId(e.target.value)} placeholder="00000000-0000-4000-8000-000000000201" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="gov-form-field">
                  Operator Email
                  <input className="gov-input" type="email" value={rbacEmail} onChange={e => setRbacEmail(e.target.value)} placeholder="ops@khelgrid.com" />
                </label>
                <label className="gov-form-field">
                  Display Name
                  <input className="gov-input" value={rbacDisplayName} onChange={e => setRbacDisplayName(e.target.value)} placeholder="Regional Operations Lead" />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="gov-form-field">
                  Platform Role
                  <select className="gov-select" value={rbacRole} onChange={e => setRbacRole(e.target.value as AdminPlatformRole)}>
                    <option value="moderator">Moderator (`moderator`)</option>
                    <option value="super_admin">Super-Admin (`super_admin`)</option>
                  </select>
                </label>
                <label className="gov-form-field">
                  Access State
                  <select className="gov-select" value={rbacActive ? 'active' : 'inactive'} onChange={e => setRbacActive(e.target.value === 'active')}>
                    <option value="active">Active Grant</option>
                    <option value="inactive">Revoked / Suspended</option>
                  </select>
                </label>
              </div>
              <label className="gov-form-field">
                Governance Justification / Audit Reason
                <textarea rows={2} className="gov-textarea" value={rbacNotes} onChange={e => setRbacNotes(e.target.value)} placeholder="Reason for grant, promotion, or access revocation..." />
              </label>
            </div>
            <div className="gov-modal-footer">
              <button type="button" className="gov-btn gov-btn-secondary" onClick={() => setRbacModalOpen(false)}>Cancel</button>
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => void handleSaveRbac()}>Save RBAC Grant</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="gov-toast"
          role="status"
          style={toast.isError ? { borderColor: 'rgba(239, 68, 68, 0.55)', color: '#fecaca' } : undefined}
        >
          <SiteIcon name={toast.isError ? 'alert-triangle' : 'check-circle'} size={16} />
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  )
}
