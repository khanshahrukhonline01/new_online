import { describe, it, expect, beforeEach } from 'vitest'
import {
  evaluateWorkspaceRegulation,
  getLiveAdminBannersForAudience,
  isPlatformMaintenanceActive,
  type GovernanceBannerRecord,
  type GovernanceFlagRecord,
  type TenantGovernanceRecord,
} from './regulatoryBridge'
import {
  resetPlatformGovernanceForTesting,
  saveBilingualBanner,
  togglePlatformFeatureFlag,
} from '../../../apps/admin/src/services/adminPlatformGovernanceService'
import {
  resetAdminTenantsForTesting,
  updateTenantLifecycleStatus,
} from '../../../apps/admin/src/services/adminTenantService'

const SUPER_ADMIN = {
  name: 'Platform Founder',
  email: 'founder@khelgrid.com',
  role: 'super_admin' as const,
}

describe('Phase 1 Regulatory Control Plane Bridge', () => {
  beforeEach(() => {
    resetPlatformGovernanceForTesting()
    resetAdminTenantsForTesting()
  })

  it('defaults to allowed when no kill-switch or tenant hold is active', () => {
    const decision = evaluateWorkspaceRegulation(
      { persona: 'turf', tenantId: 'org-1' },
      { flags: [], banners: null, tenants: [] },
    )
    expect(decision.state).toBe('allowed')
    expect(decision.targetedBanners).toEqual([])
  })

  it('enforces global platform_maintenance_mode across client workspaces', () => {
    const flags: GovernanceFlagRecord[] = [
      {
        key: 'platform_maintenance_mode',
        name: 'Global Platform Maintenance Mode',
        description: 'Scheduled national database upgrade window.',
        enabled: true,
        updatedBy: 'founder@khelgrid.com',
      },
    ]

    expect(isPlatformMaintenanceActive(flags)).toBe(true)
    const decision = evaluateWorkspaceRegulation({ persona: 'academy' }, { flags, banners: null, tenants: [] })
    expect(decision.state).toBe('maintenance')
    expect(decision.flagKey).toBe('platform_maintenance_mode')
    expect(decision.reason).toContain('scheduled maintenance hold')
  })

  it('isolates per-workspace kill switches so disabling Turf does not block Coach', () => {
    const flags: GovernanceFlagRecord[] = [
      { key: 'workspace_turf_enabled', name: 'Venue & Turf Calendar', enabled: false, updatedBy: 'founder@khelgrid.com' },
      { key: 'workspace_coach_enabled', name: 'Coach Dashboard', enabled: true, updatedBy: 'founder@khelgrid.com' },
    ]

    const turfDecision = evaluateWorkspaceRegulation({ persona: 'turf' }, { flags, banners: null, tenants: [] })
    const coachDecision = evaluateWorkspaceRegulation({ persona: 'coach' }, { flags, banners: null, tenants: [] })

    expect(turfDecision.state).toBe('module_disabled')
    expect(turfDecision.flagKey).toBe('workspace_turf_enabled')
    expect(coachDecision.state).toBe('allowed')
  })

  it('distinguishes tenant restricted (read-only) vs suspended (fail-closed) states', () => {
    const tenants: TenantGovernanceRecord[] = [
      {
        id: 'org-restricted-1',
        slug: 'delhi-sprint-academy',
        name: 'Delhi Sprint Academy',
        status: 'restricted',
        auditTrail: [{ operatorEmail: 'compliance@khelgrid.com', note: 'Renew fire safety certificate within 7 days.' }],
      },
      {
        id: 'org-suspended-2',
        slug: 'fake-trials-club',
        name: 'Unverified Trials Club',
        status: 'suspended',
        auditTrail: [{ operatorEmail: 'trust@khelgrid.com', note: 'Unauthorised cash fee demand reported.' }],
      },
    ]

    const restricted = evaluateWorkspaceRegulation(
      { persona: 'academy', tenantSlug: 'delhi-sprint-academy' },
      { flags: [], banners: null, tenants },
    )
    expect(restricted.state).toBe('restricted')
    expect(restricted.affectedTenantName).toBe('Delhi Sprint Academy')
    expect(restricted.reason).toContain('fire safety certificate')

    const suspended = evaluateWorkspaceRegulation(
      { persona: 'academy', tenantId: 'org-suspended-2' },
      { flags: [], banners: null, tenants },
    )
    expect(suspended.state).toBe('suspended')
    expect(suspended.affectedTenantName).toBe('Unverified Trials Club')
    expect(suspended.reason).toContain('Unauthorised cash fee')
  })

  it('routes targeted bilingual banners strictly by audience and locale', () => {
    const banners: GovernanceBannerRecord[] = [
      {
        id: 'b-public',
        slug: 'public-trials-alert',
        tone: 'emerald',
        targetLocale: 'both',
        targetAudience: 'all',
        badgeEn: 'Public',
        badgeHi: 'सार्वजनिक',
        titleEn: 'Free District Trials Open',
        titleHi: 'मुफ़्त जिला ट्रायल खुले हैं',
        subtitleEn: 'Register online with zero fee.',
        subtitleHi: 'शून्य शुल्क पर ऑनलाइन पंजीकरण करें।',
        ctaLabelEn: 'Explore',
        ctaLabelHi: 'देखें',
        ctaUrl: '/opportunities',
        priority: 80,
        isActive: true,
      },
      {
        id: 'b-venue',
        slug: 'venue-lighting-audit',
        tone: 'amber',
        targetLocale: 'both',
        targetAudience: 'venue',
        badgeEn: 'Venue Compliance',
        badgeHi: 'वेन्यू अनुपालन',
        titleEn: 'Upload Floodlight Safety Certificate by Friday',
        titleHi: 'शुक्रवार तक फ्लडलाइट सुरक्षा प्रमाणपत्र अपलोड करें',
        subtitleEn: 'Applies to all floodlit evening turf slots.',
        subtitleHi: 'सभी शाम के टर्फ स्लॉट पर लागू।',
        ctaLabelEn: 'Update Docs',
        ctaLabelHi: 'दस्तावेज़ अपडेट करें',
        ctaUrl: '/help-feedback',
        priority: 95,
        isActive: true,
      },
    ]

    // Returns null when Admin has not customized banners (preserves SSR baseline)
    expect(getLiveAdminBannersForAudience('all', 'en', { bannersOverride: null })).toBeNull()

    // Public site gets only 'all' banners, not venue-specific ones
    const publicList = getLiveAdminBannersForAudience('all', 'en', { bannersOverride: banners })
    expect(publicList?.map(b => b.slug)).toEqual(['public-trials-alert'])

    // Hindi locale picks Devanagari copy
    const venueHi = getLiveAdminBannersForAudience('venue', 'hi', { bannersOverride: banners })
    expect(venueHi?.[0]?.title).toBe('शुक्रवार तक फ्लडलाइट सुरक्षा प्रमाणपत्र अपलोड करें')

    // Turf workspace receives venue-targeted banner; Coach workspace does not
    const turfDecision = evaluateWorkspaceRegulation({ persona: 'turf' }, { flags: [], banners, tenants: [] })
    const coachDecision = evaluateWorkspaceRegulation({ persona: 'coach' }, { flags: [], banners, tenants: [] })
    expect(turfDecision.targetedBanners.map(b => b.slug)).toEqual(['venue-lighting-audit'])
    expect(coachDecision.targetedBanners).toEqual([])
  })

  it('propagates live mutations from Admin services directly to the regulatory bridge', () => {
    // 1. Toggle workspace_coach_enabled OFF via Admin Platform Governance Service
    const flag = togglePlatformFeatureFlag('workspace_coach_enabled', SUPER_ADMIN, 'Coach compliance audit')
    expect(flag.enabled).toBe(false)

    // 2. Publish a targeted banner for Coaches via Admin Platform Governance Service
    saveBilingualBanner(
      {
        slug: 'coach-safeguarding-update',
        tone: 'indigo',
        targetLocale: 'both',
        targetAudience: 'coach',
        badgeEn: 'Coach Policy',
        badgeHi: 'कोच नीति',
        titleEn: 'Complete Annual Youth Safeguarding Declaration',
        titleHi: 'वार्षिक युवा सुरक्षा घोषणा पूरी करें',
        subtitleEn: 'Required for all active KhelGrid mentors.',
        subtitleHi: 'सभी सक्रिय खेलग्रिड कोचों के लिए आवश्यक।',
        ctaLabelEn: 'Open Policy',
        ctaLabelHi: 'नीति देखें',
        ctaUrl: '/posh-policy',
        priority: 99,
        isActive: true,
      },
      SUPER_ADMIN,
    )

    // 3. Restrict an existing seed academy tenant via Admin Tenant Service
    const res = updateTenantLifecycleStatus(
      'org-ncr-elite-01',
      'restricted',
      'founder@khelgrid.com',
      'Pending annual coach roster verification.',
    )
    expect(res.success).toBe(true)

    // Verify all three live states in browser/jsdom localStorage
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const coachEval = evaluateWorkspaceRegulation({ persona: 'coach' })
      expect(coachEval.state).toBe('module_disabled')
      expect(coachEval.targetedBanners.some(b => b.slug === 'coach-safeguarding-update')).toBe(true)

      const academyEval = evaluateWorkspaceRegulation({
        persona: 'academy',
        tenantId: 'org-ncr-elite-01',
      })
      expect(academyEval.state).toBe('restricted')
      expect(academyEval.reason).toContain('Pending annual coach roster verification.')
    }
  })
})
