import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminPlatformGovernanceDesk } from './AdminPlatformGovernanceDesk'
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
  type GovernanceOperatorActor,
} from '../services/adminPlatformGovernanceService'

const SUPER_ADMIN_ACTOR: GovernanceOperatorActor = {
  name: 'Founder Admin',
  email: 'founder@khelgrid.com',
  role: 'super_admin',
  userId: '00000000-0000-4000-8000-000000000001',
}

const MODERATOR_ACTOR: GovernanceOperatorActor = {
  name: 'Catalogue Moderator',
  email: 'moderator.delhi@khelgrid.com',
  role: 'moderator',
  userId: '00000000-0000-4000-8000-000000000101',
}

describe('Module 7: Platform Settings, Audit Trails & Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    resetPlatformGovernanceForTesting()
  })

  it('renders Sovereign Write view for super_admin and Read-Only Separation Guard for moderator', () => {
    const superHtml = renderToStaticMarkup(
      <AdminPlatformGovernanceDesk
        operatorEmail="founder@khelgrid.com"
        operatorRole="super_admin"
      />,
    )
    expect(superHtml).toContain('Platform Settings, Audit Trails &amp; Role-Based Access Control')
    expect(superHtml).toContain('Sovereign RBAC Write Access')
    expect(superHtml).toContain('LOCKED DISABLED')
    expect(superHtml).toContain('Feature Flags &amp; Kill Switches')
    expect(superHtml).toContain('Hindi / English CMS Banners')
    expect(superHtml).toContain('Sports &amp; City Taxonomies')
    expect(superHtml).toContain('Operator RBAC Matrix')
    expect(superHtml).toContain('Immutable Audit Explorer')
    expect(superHtml).not.toContain('Read-Only Moderator View')

    const modHtml = renderToStaticMarkup(
      <AdminPlatformGovernanceDesk
        operatorEmail="moderator.delhi@khelgrid.com"
        operatorRole="moderator"
      />,
    )
    expect(modHtml).toContain('Read-Only Moderator View')
    expect(modHtml).toContain('RBAC Separation of Duties Active')
  })

  it('enforces RBAC clearance & global_payment_lockdown policy lock while allowing super_admin flag toggles', async () => {
    // Moderator blocked from mutating flags
    expect(() =>
      togglePlatformFeatureFlag('public_sitemap_auto_regeneration', MODERATOR_ACTOR, 'Attempted change'),
    ).toThrow(/RBAC Clearance Denied/)

    // Policy lock blocks disabling global_payment_lockdown even by super_admin
    expect(() =>
      togglePlatformFeatureFlag('global_payment_lockdown', SUPER_ADMIN_ACTOR, 'Unlock attempt'),
    ).toThrow(/Compliance Policy Lock/)

    // Super-admin can toggle non-locked operational flags and emits immutable audit
    const updated = togglePlatformFeatureFlag(
      'public_sitemap_auto_regeneration',
      SUPER_ADMIN_ACTOR,
      'Enable automatic SEO sitemap updates before national showcase',
    )
    expect(updated.enabled).toBe(true)

    const snap = await getPlatformGovernanceSnapshot()
    expect(snap.metrics.paymentLockdownEnforced).toBe(true)
    const audit = snap.auditEvents.find(e => e.targetEntity === 'flag:public_sitemap_auto_regeneration')
    expect(audit).toBeDefined()
    expect(audit?.action).toBe('FEATURE_FLAG_ENABLED')
    expect(audit?.immutableChecksum).toMatch(/^SHA256-SIM-/)
  })

  it('publishes and toggles bilingual Hindi & English CMS banners with strict parity checks', async () => {
    // Rejects missing Hindi copy
    expect(() =>
      saveBilingualBanner(
        {
          slug: 'incomplete-banner',
          tone: 'indigo',
          targetLocale: 'both',
          badgeEn: 'Notice',
          badgeHi: 'सूचना',
          titleEn: 'Open Athletics Trials',
          titleHi: '',
          subtitleEn: 'Join free',
          subtitleHi: 'मुफ़्त जुड़ें',
          ctaLabelEn: 'Apply',
          ctaLabelHi: 'आवेदन करें',
          ctaUrl: '/opportunities',
          priority: 90,
          isActive: true,
        },
        SUPER_ADMIN_ACTOR,
      ),
    ).toThrow(/English and Hindi/)

    // Moderator blocked from publishing banners
    expect(() => toggleBilingualBannerStatus('gov-banner-scam-advisory', MODERATOR_ACTOR)).toThrow(
      /RBAC Clearance Denied/,
    )

    const created = saveBilingualBanner(
      {
        slug: 'national-u17-selection-2026',
        tone: 'emerald',
        targetLocale: 'both',
        badgeEn: 'National Call',
        badgeHi: 'राष्ट्रीय अवसर',
        titleEn: 'National U-17 Track & Field Trials Now Open',
        titleHi: 'राष्ट्रीय अंडर-17 एथलेटिक्स ट्रायल अब खुले हैं',
        subtitleEn: 'Verified venues across 12 states.',
        subtitleHi: '12 राज्यों के सत्यापित स्टेडियमों में पंजीकरण।',
        ctaLabelEn: 'Explore',
        ctaLabelHi: 'देखें',
        ctaUrl: '/opportunities',
        priority: 98,
        isActive: true,
      },
      SUPER_ADMIN_ACTOR,
    )
    expect(created.id).toMatch(/^gov-banner-/)

    const paused = toggleBilingualBannerStatus(created.id, SUPER_ADMIN_ACTOR)
    expect(paused.isActive).toBe(false)
  })

  it('manages canonical Indian sports & city taxonomies with audit trails', async () => {
    const snapBefore = await getPlatformGovernanceSnapshot()
    expect(snapBefore.sports.length).toBeGreaterThanOrEqual(30)
    expect(snapBefore.cities.length).toBeGreaterThanOrEqual(15)

    // Add indigenous Indian sport Kho-Kho
    const newSport = addOrUpdateSportTaxonomy(
      {
        id: 'kho-kho',
        labelEn: 'Kho-Kho',
        labelHi: 'खो-खो',
        category: 'team_sport',
        isActive: true,
        isFeaturedDiscovery: true,
        requiresFederationVerification: true,
        listingsCountEstimate: 24,
      },
      SUPER_ADMIN_ACTOR,
    )
    expect(newSport.labelHi).toBe('खो-खो')

    // Add Jharkhand hub city Ranchi
    const newCity = addOrUpdateCityTaxonomy(
      {
        slug: 'ranchi',
        name: 'Ranchi',
        state: 'Jharkhand',
        zone: 'East',
        isMetro: false,
        launchTier: 'tier_2_hub',
        discoveryEnabled: true,
        majorVenuesCount: 3,
        sampleVenues: ['Birsa Munda Athletics Stadium', 'Mega Sports Complex'],
      },
      SUPER_ADMIN_ACTOR,
    )
    expect(newCity.state).toBe('Jharkhand')

    const snapAfter = await getPlatformGovernanceSnapshot()
    expect(snapAfter.sports.some(s => s.id === 'kho-kho')).toBe(true)
    expect(snapAfter.cities.some(c => c.slug === 'ranchi')).toBe(true)
  })

  it('enforces operator RBAC grant validation and blocks removing the last active super_admin', async () => {
    // Rejects invalid UUID
    await expect(
      grantOrUpdateOperatorRbac(
        {
          userId: 'not-a-valid-uuid',
          email: 'bad@khelgrid.com',
          displayName: 'Invalid User',
          role: 'moderator',
          isActive: true,
          notes: 'Invalid test',
        },
        SUPER_ADMIN_ACTOR,
      ),
    ).rejects.toThrow(/RFC 4122/)

    // Demoting one of two active super_admins succeeds
    await grantOrUpdateOperatorRbac(
      {
        userId: '00000000-0000-4000-8000-000000000002',
        email: 'security.lead@khelgrid.com',
        displayName: 'Trust & Compliance Lead',
        role: 'moderator',
        isActive: true,
        notes: 'Stepped down to scoped moderator role',
      },
      SUPER_ADMIN_ACTOR,
    )

    // Attempting to deactivate the final remaining active super_admin is blocked
    await expect(
      grantOrUpdateOperatorRbac(
        {
          userId: '00000000-0000-4000-8000-000000000001',
          email: 'founder@khelgrid.com',
          displayName: 'Platform Owner',
          role: 'super_admin',
          isActive: false,
          notes: 'Illegal lockout attempt',
        },
        SUPER_ADMIN_ACTOR,
      ),
    ).rejects.toThrow(/last active Super-Admin/)

    // Valid grant of a new regional moderator succeeds
    const createdOp = await grantOrUpdateOperatorRbac(
      {
        userId: '00000000-0000-4000-8000-000000000205',
        email: 'bengaluru.ops@khelgrid.com',
        displayName: 'South Zone Verification Lead',
        role: 'moderator',
        isActive: true,
        notes: 'Assigned South India venue verification scope',
      },
      SUPER_ADMIN_ACTOR,
    )
    expect(createdOp.role).toBe('moderator')
    expect(createdOp.isActive).toBe(true)
  })

  it('aggregates immutable cross-module audit logs across all active KhelGrid workspaces and exports CSV', async () => {
    const snap = await getPlatformGovernanceSnapshot()
    const modulesPresent = new Set(snap.auditEvents.map(e => e.sourceModule))

    expect(modulesPresent.has('platform_governance')).toBe(true)
    expect(modulesPresent.has('rbac_access')).toBe(true)
    expect(modulesPresent.has('tenant_governance')).toBe(true)
    expect(modulesPresent.has('verification_vault')).toBe(true)
    expect(modulesPresent.has('moderation_desk')).toBe(true)
    expect(modulesPresent.has('chronicle_desk')).toBe(true)
    expect(modulesPresent.has('fraud_disputes')).toBe(true)

    const csv = exportPlatformAuditToCsv(snap.auditEvents)
    expect(csv).toContain('Sequence Code,Timestamp (ISO 8601),Source Module,Action,Severity,Actor,Target Entity,Audit Summary,Immutable Checksum')
    expect(csv).toContain('POLICY_LOCK_ENFORCED')
    expect(csv).toContain('SHA256-SIM-')
  })
})
