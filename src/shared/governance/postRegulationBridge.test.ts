import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveAndReleaseTenantPost,
  blockAndQuarantineTenantPost,
  DEFAULT_REGULATORY_POLICY_RULES,
  enqueueTenantPostForRegulation,
  evaluateTenantPostAgainstRules,
  exportPostRegulationCsv,
  getPostRegulationAuditEvents,
  getPostRegulationSnapshot,
  reEvaluatePendingTenantPosts,
  resetPostRegulationForTesting,
  returnTenantPostForFix,
  updateRegulatoryPolicyRule,
} from './postRegulationBridge'
import {
  getActivePartnerComplianceAdvisories,
  resetComplianceAdvisoriesForTesting,
} from './regulatoryBridge'

describe('postRegulationBridge — Tenant Post Pre-Publication Evaluation Engine', () => {
  beforeEach(() => {
    resetPostRegulationForTesting()
    resetComplianceAdvisoriesForTesting()
  })

  it('auto-clears a compliant venue post from an active verified tenant', () => {
    const result = evaluateTenantPostAgainstRules(
      {
        title: 'Koramangala 4-Court Badminton Hub — Morning Slots Open',
        body: 'Transparent hourly booking tariff with purified drinking water and medical kit at front desk.',
        category: 'venue_listing',
        tenantName: 'Koramangala Shuttle Hub',
        tenantPersona: 'turf',
        tenantStanding: 'active',
        tenantFederationVerified: true,
        submitterName: 'Priya Menon',
        submitterEmail: 'ops@koramangalashuttle.in',
        sport: 'Badminton',
        city: 'Bengaluru',
      },
      DEFAULT_REGULATORY_POLICY_RULES,
    )

    expect(result.disposition).toBe('auto_clear_eligible')
    expect(result.riskScore).toBe(0)
    expect(result.failedCount).toBe(0)
  })

  it('places a U-16 trial post with exposed Aadhaar / missing guardian consent into hard_hold', () => {
    const result = evaluateTenantPostAgainstRules(
      {
        title: 'U-16 Football Trial — Send Aadhaar 4829 1940 7731 on WhatsApp',
        body: 'Under-16 trial registrations open immediately.',
        category: 'trial_opportunity',
        tenantName: 'City Youth Club',
        tenantPersona: 'academy',
        tenantStanding: 'active',
        submitterName: 'Coach Raj',
        submitterEmail: 'raj@cityyouth.in',
        sport: 'Football',
        city: 'Delhi',
        involvesMinors: true,
        guardianConsentAttested: false,
      },
      DEFAULT_REGULATORY_POLICY_RULES,
    )

    expect(result.disposition).toBe('hard_hold')
    expect(result.checks.find(c => c.ruleCode === 'RULE-DPDP-MINOR')?.outcome).toBe('fail')
  })

  it('blocks posts demanding personal UPI guaranteed selection fees or from suspended tenants', () => {
    const fraudEval = evaluateTenantPostAgainstRules(
      {
        title: 'State U-19 Trials',
        body: 'Transfer ₹4,000 to personal UPI for guaranteed selection into top squad.',
        category: 'tournament_notice',
        tenantName: 'Shady Trials Org',
        tenantPersona: 'tournament',
        tenantStanding: 'suspended',
        submitterName: 'Agent X',
        submitterEmail: 'agent@example.com',
        sport: 'Cricket',
        city: 'Mumbai',
      },
      DEFAULT_REGULATORY_POLICY_RULES,
    )

    expect(fraudEval.disposition).toBe('hard_hold')
    expect(fraudEval.riskScore).toBeGreaterThanOrEqual(90)
    expect(fraudEval.checks.find(c => c.ruleCode === 'RULE-ZERO-COMM')?.outcome).toBe('fail')
    expect(fraudEval.checks.find(c => c.ruleCode === 'RULE-TENANT-STANDING')?.outcome).toBe('fail')
  })

  it('flags creator campaign posts lacking mandatory #Ad / #Sponsored disclosure', () => {
    const evalRes = evaluateTenantPostAgainstRules(
      {
        title: 'Running Gear Reels Challenge',
        body: 'Post 30-second interval reels showcasing our new carbon trainers for paid perks.',
        category: 'creator_campaign',
        tenantName: 'Stride Athletics',
        tenantPersona: 'creator',
        tenantStanding: 'active',
        submitterName: 'Ananya',
        submitterEmail: 'ananya@stride.in',
        sport: 'Athletics',
        city: 'Bengaluru',
        hasSponsoredDisclosure: false,
      },
      DEFAULT_REGULATORY_POLICY_RULES,
    )

    expect(evalRes.disposition).toBe('manual_review')
    expect(evalRes.checks.find(c => c.ruleCode === 'RULE-ASCI-CREATOR')?.outcome).toBe('fail')
  })

  it('enqueues live tenant posts, publishes Partner Advisory on Return for Fix, and logs audit events', () => {
    const ingested = enqueueTenantPostForRegulation({
      title: 'Pune U-14 Tennis Camp',
      body: 'Under-14 weekend tennis camp at Balewadi.',
      category: 'camp_clinic',
      tenantName: 'Balewadi Tennis Academy',
      tenantSlug: 'balewadi-tennis',
      tenantPersona: 'academy',
      tenantStanding: 'active',
      submitterName: 'Rohan',
      submitterEmail: 'rohan@balewaditennis.in',
      sport: 'Tennis',
      city: 'Pune',
      involvesMinors: true,
      guardianConsentAttested: false,
    })

    expect(ingested.workflowStatus).toBe('pending_evaluation')
    expect(ingested.evaluation.disposition).toBe('hard_hold')

    const returned = returnTenantPostForFix(
      ingested.id,
      'compliance.lead@khelgrid.com',
      'Attach verifiable DPDP Sec. 9 guardian consent attestation before republishing.',
    )
    expect(returned?.workflowStatus).toBe('returned_for_fix')

    const advisories = getActivePartnerComplianceAdvisories({
      persona: 'academy',
      tenantSlug: 'balewadi-tennis',
    })
    expect(advisories.length).toBeGreaterThanOrEqual(1)
    expect(advisories[0].referenceCode).toBe(ingested.referenceCode)

    const approved = approveAndReleaseTenantPost(
      ingested.id,
      'superadmin@khelgrid.com',
      'Guardian consent received and verified.',
    )
    expect(approved?.workflowStatus).toBe('cleared_published')

    const audits = getPostRegulationAuditEvents()
    expect(audits.map(a => a.action)).toContain('TENANT_POST_INGESTED')
    expect(audits.map(a => a.action)).toContain('POST_GATE_RETURNED')
    expect(audits.map(a => a.action)).toContain('POST_GATE_CLEARED')
  })

  it('supports rule enforcement updates, bulk re-evaluation, quarantine blocking, and CSV export', () => {
    const snapBefore = getPostRegulationSnapshot()
    expect(snapBefore.items.length).toBeGreaterThanOrEqual(8)

    const updatedRule = updateRegulatoryPolicyRule(
      'rule-asci-creator',
      { enforcement: 'block', riskWeight: 50 },
      'superadmin@khelgrid.com',
    )
    expect(updatedRule?.enforcement).toBe('block')

    const reEval = reEvaluatePendingTenantPosts('superadmin@khelgrid.com')
    expect(reEval.reEvaluatedCount).toBeGreaterThan(0)

    const blocked = blockAndQuarantineTenantPost(
      'post-reg-102',
      'trust.ops@khelgrid.com',
      'Confirmed personal UPI selection fee extortion.',
    )
    expect(blocked?.workflowStatus).toBe('blocked_quarantined')

    const csv = exportPostRegulationCsv(getPostRegulationSnapshot().items)
    expect(csv).toContain('Reference Code')
    expect(csv).toContain('REG-POST-2601')
  })
})
