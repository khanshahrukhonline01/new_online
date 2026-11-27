/**
 * KhelGrid Platform — Tenant Post Pre-Publication Regulation Engine & Bridge
 *
 * Shared between all client tenant posting entry points (Listing Submission,
 * Campaigns, Academies, Venues, Coaches, Tournaments, Creators) and the
 * Admin Regulation Modules (Post Evaluation Gate & Policy Rules Engine).
 *
 * Every post created by any tenant on the platform is evaluated deterministically
 * against statutory & platform rules (DPDP Act 2023 Sec. 9, Zero-Commission
 * Anti-Fraud Fee Policy, IT Rules 2021 / IPR, SafeSport / POSH / NADA,
 * ASCI Creator Disclosure, and Tenant Compliance Standing) BEFORE publication.
 */

import {
  notifyRegulatoryStateChanged,
  publishPartnerComplianceAdvisory,
  readStoredAdminTenants,
  resolvePartnerComplianceAdvisory,
  type RegulatoryWorkspaceKey,
  type TenantRegulatoryStatus,
} from './regulatoryBridge'

export const POST_REGULATION_QUEUE_KEY = 'khelgrid_post_regulation_queue_v1'
export const POST_REGULATION_RULES_KEY = 'khelgrid_post_regulation_rules_v1'
export const POST_REGULATION_AUDIT_KEY = 'khelgrid_post_regulation_audit_v1'

export type TenantPostCategory =
  | 'trial_opportunity'
  | 'academy_program'
  | 'venue_listing'
  | 'coach_profile'
  | 'tournament_notice'
  | 'creator_campaign'
  | 'camp_clinic'

export type RegulatoryRuleEnforcement = 'block' | 'flag' | 'advisory'

export type RegulatoryRuleDomain =
  | 'dpdp_minor_safeguards'
  | 'zero_commission_fraud'
  | 'it_rules_ipr'
  | 'safesport_posh_nada'
  | 'asci_creator_disclosure'
  | 'tenant_standing'

export interface RegulatoryPolicyRule {
  id: string
  code: string
  name: string
  domain: RegulatoryRuleDomain
  statutoryCitation: string
  description: string
  enabled: boolean
  enforcement: RegulatoryRuleEnforcement
  riskWeight: number
  keywords: string[]
  appliesToCategories: 'all' | TenantPostCategory[]
  updatedAt: string
  updatedBy: string
}

export type RuleCheckOutcome = 'pass' | 'warn' | 'fail'

export interface RuleEvaluationCheckResult {
  ruleId: string
  ruleCode: string
  ruleName: string
  statutoryCitation: string
  enforcement: RegulatoryRuleEnforcement
  outcome: RuleCheckOutcome
  scoreContribution: number
  evidence: string
  remediationHint?: string
}

export type PostGateDisposition =
  | 'auto_clear_eligible'
  | 'manual_review'
  | 'hard_hold'

export type PostGateWorkflowStatus =
  | 'pending_evaluation'
  | 'cleared_published'
  | 'returned_for_fix'
  | 'blocked_quarantined'

export interface TenantPostDraftInput {
  id?: string
  referenceCode?: string
  title: string
  body: string
  category: TenantPostCategory
  tenantName: string
  tenantSlug?: string
  tenantId?: string
  tenantPersona: RegulatoryWorkspaceKey
  tenantStanding?: TenantRegulatoryStatus
  tenantFederationVerified?: boolean
  submitterName: string
  submitterEmail: string
  sport: string
  city: string
  involvesMinors?: boolean
  guardianConsentAttested?: boolean
  hasSponsoredDisclosure?: boolean
  sourceRoute?: string
  submittedAt?: string
}

export interface PostEvaluationSummary {
  riskScore: number
  disposition: PostGateDisposition
  checks: RuleEvaluationCheckResult[]
  failedCount: number
  warnCount: number
  passedCount: number
  summaryReason: string
}

export interface TenantPostEvaluationItem {
  id: string
  referenceCode: string
  title: string
  body: string
  category: TenantPostCategory
  tenantName: string
  tenantSlug?: string
  tenantId?: string
  tenantPersona: RegulatoryWorkspaceKey
  tenantStanding: TenantRegulatoryStatus
  tenantFederationVerified: boolean
  submitterName: string
  submitterEmail: string
  sport: string
  city: string
  involvesMinors: boolean
  guardianConsentAttested: boolean
  hasSponsoredDisclosure: boolean
  sourceRoute: string
  submittedAt: string
  evaluatedAt: string
  workflowStatus: PostGateWorkflowStatus
  evaluation: PostEvaluationSummary
  decisionBy?: string
  decisionAt?: string
  decisionNote?: string
  remediationItems?: string[]
}

export interface PostRegulationAuditRecord {
  id: string
  sequenceCode: string
  timestamp: string
  sourceModule: 'platform_governance' | 'moderation_desk' | 'fraud_disputes'
  action: string
  actor: string
  targetEntity: string
  summary: string
  severity: 'info' | 'warning' | 'critical'
  immutableChecksum: string
}

export interface PostRegulationMetrics {
  awaitingEvaluation: number
  hardHolds: number
  manualReview: number
  autoClearEligible: number
  clearedPublished: number
  returnedForFix: number
  blockedQuarantined: number
  activeRulesCount: number
  totalRulesCount: number
}

export const TENANT_POST_CATEGORY_LABELS: Record<TenantPostCategory, string> = {
  trial_opportunity: 'Trial & Selection',
  academy_program: 'Academy Program',
  venue_listing: 'Venue & Turf Post',
  coach_profile: 'Coach Announcement',
  tournament_notice: 'Tournament Notice',
  creator_campaign: 'Creator Campaign',
  camp_clinic: 'Camp & Clinic',
}

export const DEFAULT_REGULATORY_POLICY_RULES: RegulatoryPolicyRule[] = [
  {
    id: 'rule-dpdp-minor',
    code: 'RULE-DPDP-MINOR',
    name: 'DPDP Act 2023 · Minor Consent & PII Shield',
    domain: 'dpdp_minor_safeguards',
    statutoryCitation: 'DPDP Act 2023 Sec. 9 & Rule 10',
    description:
      'Blocks publication of U-18/minor posts without verifiable guardian consent attestation or containing exposed Aadhaar/personal phone/DOB identifiers.',
    enabled: true,
    enforcement: 'block',
    riskWeight: 42,
    keywords: ['aadhaar', 'aadhar', 'u-14', 'u-16', 'u-18', 'under-14', 'under-16', 'under-18', 'minor'],
    appliesToCategories: 'all',
    updatedAt: '2026-11-20T09:00:00.000Z',
    updatedBy: 'dpo@khelgrid.com',
  },
  {
    id: 'rule-zero-comm',
    code: 'RULE-ZERO-COMM',
    name: 'Zero-Commission & Anti-Fraud Fee Integrity',
    domain: 'zero_commission_fraud',
    statutoryCitation: 'KhelGrid Anti-Fraud Charter · Consumer Protection Act 2019',
    description:
      'Detects unauthorized personal UPI/cash registration demands, guaranteed selection fee extortion, and undisclosed broker commissions.',
    enabled: true,
    enforcement: 'block',
    riskWeight: 48,
    keywords: [
      'guaranteed selection',
      'personal upi',
      'gpay personal',
      'cash only registration',
      'selection bribe',
      'agent cut',
      'direct cash fee',
      'pay to coach number',
    ],
    appliesToCategories: 'all',
    updatedAt: '2026-11-20T09:00:00.000Z',
    updatedBy: 'trust.ops@khelgrid.com',
  },
  {
    id: 'rule-it-ipr',
    code: 'RULE-IT-IPR',
    name: 'IT Rules 2021 · IPR & Federation Affiliation Check',
    domain: 'it_rules_ipr',
    statutoryCitation: 'IT Rules 2021 Rule 3(1)(b) · Copyright Act Sec. 52',
    description:
      'Flags unverified claims of official national federation sanctioning (SAI, BCCI, AIFF, FIFA) or unauthorized broadcast footage reuse.',
    enabled: true,
    enforcement: 'flag',
    riskWeight: 28,
    keywords: [
      'official sai',
      'bcci certified',
      'aiff official',
      'fifa approved',
      'broadcast clip',
      'hotstar replay',
      'guaranteed national team',
    ],
    appliesToCategories: 'all',
    updatedAt: '2026-11-20T09:00:00.000Z',
    updatedBy: 'grievance.officer@khelgrid.com',
  },
  {
    id: 'rule-safesport-nada',
    code: 'RULE-SAFESPORT-NADA',
    name: 'SafeSport, POSH ICC & NADA Anti-Doping Screen',
    domain: 'safesport_posh_nada',
    statutoryCitation: 'National Anti-Doping Act 2022 · POSH Act 2013',
    description:
      'Blocks posts promoting prohibited athletic enhancers, untested hormones, or youth residential camps missing SafeSport / emergency disclosures.',
    enabled: true,
    enforcement: 'block',
    riskWeight: 45,
    keywords: [
      'steroid',
      'growth hormone',
      'fast-track injection',
      'untested supplement',
      'doping bypass',
      'rapid weight-cut pill',
    ],
    appliesToCategories: 'all',
    updatedAt: '2026-11-20T09:00:00.000Z',
    updatedBy: 'compliance.lead@khelgrid.com',
  },
  {
    id: 'rule-asci-creator',
    code: 'RULE-ASCI-CREATOR',
    name: 'ASCI Creator Sponsorship Disclosure Gate',
    domain: 'asci_creator_disclosure',
    statutoryCitation: 'ASCI Influencer Guidelines · CCPA Endorsement Rules',
    description:
      'Requires explicit #Ad or #Sponsored commercial disclosure on creator campaigns and paid partner brand promotions before publishing.',
    enabled: true,
    enforcement: 'flag',
    riskWeight: 24,
    keywords: ['#ad', '#sponsored', 'paid partnership', 'brand collaboration'],
    appliesToCategories: ['creator_campaign'],
    updatedAt: '2026-11-20T09:00:00.000Z',
    updatedBy: 'compliance.lead@khelgrid.com',
  },
  {
    id: 'rule-tenant-standing',
    code: 'RULE-TENANT-STANDING',
    name: 'Tenant Governance Standing & KYC Hold',
    domain: 'tenant_standing',
    statutoryCitation: 'KhelGrid Tenant Governance Charter Sec. 4.2',
    description:
      'Automatically places posts from Suspended, Restricted, or Unverified tenants into a Hard Regulatory Hold until organisational standing is restored.',
    enabled: true,
    enforcement: 'block',
    riskWeight: 55,
    keywords: [],
    appliesToCategories: 'all',
    updatedAt: '2026-11-20T09:00:00.000Z',
    updatedBy: 'superadmin@khelgrid.com',
  },
]

const memoryStore = new Map<string, string>()

function loadStore<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // fallback to memory store
  }
  const mem = memoryStore.get(key)
  if (mem) {
    try {
      return JSON.parse(mem) as T
    } catch {
      return structuredClone(fallback)
    }
  }
  return structuredClone(fallback)
}

function saveStore<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value)
  memoryStore.set(key, serialized)
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(key, serialized)
    }
  } catch {
    // ignore storage quota errors
  }
  notifyRegulatoryStateChanged()
}

function computeChecksum(seed: string): string {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `REG-POST-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
}

function hasExposedAadhaarOrPrivatePhone(text: string): string | null {
  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text)) {
    return 'Detected 12-digit Aadhaar-formatted personal identifier in public post text.'
  }
  if (/\b(?:personal\s+whatsapp|dm\s+aadhaar|send\s+aadhaar|upload\s+aadhaar)\b/i.test(text)) {
    return 'Post solicits personal Aadhaar / sensitive KYC documents over unverified channels.'
  }
  return null
}

/**
 * Pure deterministic rule evaluation engine for any tenant post.
 * Used for both live intake interception, queue re-evaluation, and sandbox testing.
 */
export function evaluateTenantPostAgainstRules(
  input: TenantPostDraftInput,
  rules: readonly RegulatoryPolicyRule[] = DEFAULT_REGULATORY_POLICY_RULES,
): PostEvaluationSummary {
  const combined = `${input.title} ${input.body}`.toLowerCase()
  const tenantStanding: TenantRegulatoryStatus = input.tenantStanding ?? 'active'
  const involvesMinors =
    Boolean(input.involvesMinors) ||
    /\b(u-?12|u-?14|u-?16|u-?17|u-?18|under[\s-]?(?:12|14|16|17|18)|junior\s+minors?|school\s+kids?)\b/i.test(
      combined,
    )
  const guardianConsentAttested = Boolean(input.guardianConsentAttested)
  const tenantFederationVerified = Boolean(input.tenantFederationVerified)

  const checks: RuleEvaluationCheckResult[] = []
  let totalScore = 0
  let hasHardBlockFail = false
  let hasManualFlagOrWarn = false

  for (const rule of rules) {
    if (!rule.enabled) continue
    if (
      rule.appliesToCategories !== 'all' &&
      !rule.appliesToCategories.includes(input.category)
    ) {
      continue
    }

    let outcome: RuleCheckOutcome = 'pass'
    let evidence = 'No policy violations detected.'
    let remediationHint: string | undefined

    if (rule.domain === 'dpdp_minor_safeguards') {
      const piiMatch = hasExposedAadhaarOrPrivatePhone(input.body + ' ' + input.title)
      if (piiMatch) {
        outcome = 'fail'
        evidence = piiMatch
        remediationHint =
          'Remove 12-digit Aadhaar numbers or personal KYC document requests; collect KYC solely via KhelGrid Verification Vault.'
      } else if (involvesMinors && !guardianConsentAttested) {
        outcome = 'fail'
        evidence =
          'Post targets U-18 / minor athletes without verifiable parent/guardian DPDP Sec. 9 consent attestation.'
        remediationHint =
          'Attach verifiable guardian consent workflow & SafeSport supervisor confirmation before republishing.'
      } else if (involvesMinors) {
        outcome = 'pass'
        evidence = 'Minor category detected; verifiable guardian consent attestation confirmed.'
      }
    } else if (rule.domain === 'zero_commission_fraud') {
      const matched = rule.keywords.filter(kw => kw.trim() && combined.includes(kw.toLowerCase()))
      if (matched.length > 0) {
        outcome = 'fail'
        evidence = `Matched anti-fraud fee/extortion terms: ${matched.map(m => `"${m}"`).join(', ')}.`
        remediationHint =
          'Remove personal UPI/cash selection fee demands and publish transparent official organiser fee schedule only.'
      }
    } else if (rule.domain === 'it_rules_ipr') {
      const matched = rule.keywords.filter(kw => kw.trim() && combined.includes(kw.toLowerCase()))
      if (matched.length > 0 && !tenantFederationVerified) {
        outcome = 'fail'
        evidence = `Unverified federation/IPR claim (${matched.join(', ')}) by non-federation-verified tenant.`
        remediationHint =
          'Upload official federation affiliation letter in Verification Vault or remove official endorsement claims.'
      } else if (matched.length > 0 && tenantFederationVerified) {
        outcome = 'pass'
        evidence = 'Federation reference permitted — tenant holds verified federation credentials.'
      }
    } else if (rule.domain === 'safesport_posh_nada') {
      const matched = rule.keywords.filter(kw => kw.trim() && combined.includes(kw.toLowerCase()))
      if (matched.length > 0) {
        outcome = 'fail'
        evidence = `Flagged prohibited performance/NADA term(s): ${matched.join(', ')}.`
        remediationHint =
          'Remove prohibited supplement, hormone, or unsafe medical claims to comply with National Anti-Doping Act 2022.'
      }
    } else if (rule.domain === 'asci_creator_disclosure') {
      const hasDisclosure =
        Boolean(input.hasSponsoredDisclosure) ||
        rule.keywords.some(kw => kw.trim() && combined.includes(kw.toLowerCase()))
      if (!hasDisclosure) {
        outcome = 'fail'
        evidence = 'Creator campaign post lacks mandatory #Ad / #Sponsored ASCI disclosure label.'
        remediationHint =
          'Include clear #Ad or #Sponsored commercial partnership disclosure at the top of the campaign brief.'
      } else {
        outcome = 'pass'
        evidence = 'ASCI #Ad / #Sponsored disclosure verified.'
      }
    } else if (rule.domain === 'tenant_standing') {
      if (tenantStanding === 'suspended') {
        outcome = 'fail'
        evidence = 'Tenant organisation is currently SUSPENDED by KhelGrid Governance.'
        remediationHint = 'Posting is blocked until Tenant Governance lifts the active suspension.'
      } else if (tenantStanding === 'restricted') {
        outcome = 'fail'
        evidence = 'Tenant organisation is in RESTRICTED (read-only) compliance mode.'
        remediationHint = 'Resolve active Tenant Compliance Advisories to restore publishing privileges.'
      } else if (tenantStanding === 'pending_verification') {
        outcome = 'warn'
        evidence = 'Tenant KYC verification is still pending — requires manual first-post clearance.'
        remediationHint = 'Complete Verification Vault submission for faster auto-clearance.'
      } else {
        outcome = 'pass'
        evidence = 'Tenant standing is Active and in good compliance standing.'
      }
    }

    const scoreContribution =
      outcome === 'fail'
        ? rule.riskWeight
        : outcome === 'warn'
          ? Math.round(rule.riskWeight * 0.45)
          : 0

    totalScore += scoreContribution

    if (outcome === 'fail') {
      if (rule.enforcement === 'block') hasHardBlockFail = true
      else if (rule.enforcement === 'flag') hasManualFlagOrWarn = true
    } else if (outcome === 'warn' && rule.enforcement !== 'advisory') {
      hasManualFlagOrWarn = true
    }

    checks.push({
      ruleId: rule.id,
      ruleCode: rule.code,
      ruleName: rule.name,
      statutoryCitation: rule.statutoryCitation,
      enforcement: rule.enforcement,
      outcome,
      scoreContribution,
      evidence,
      remediationHint,
    })
  }

  const riskScore = Math.min(100, totalScore)
  const failedCount = checks.filter(c => c.outcome === 'fail').length
  const warnCount = checks.filter(c => c.outcome === 'warn').length
  const passedCount = checks.filter(c => c.outcome === 'pass').length

  const disposition: PostGateDisposition = hasHardBlockFail
    ? 'hard_hold'
    : hasManualFlagOrWarn || failedCount > 0 || warnCount > 0
      ? 'manual_review'
      : 'auto_clear_eligible'

  const firstIssue = checks.find(c => c.outcome === 'fail' || c.outcome === 'warn')
  const summaryReason =
    disposition === 'hard_hold'
      ? `Held from publishing (${failedCount} blocking statutory rule${failedCount === 1 ? '' : 's'}): ${firstIssue?.ruleName ?? 'Compliance violation'}`
      : disposition === 'manual_review'
        ? `Queued for officer review (${failedCount + warnCount} advisory/flag check${failedCount + warnCount === 1 ? '' : 's'}): ${firstIssue?.ruleName ?? 'Manual verification required'}`
        : `Passed all ${passedCount} active statutory pre-publication checks.`

  return {
    riskScore,
    disposition,
    checks,
    failedCount,
    warnCount,
    passedCount,
    summaryReason,
  }
}

function buildSeededQueue(rules: readonly RegulatoryPolicyRule[]): TenantPostEvaluationItem[] {
  const now = Date.now()
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString()

  const drafts: Array<
    TenantPostDraftInput & {
      id: string
      referenceCode: string
      submittedAt: string
      workflowStatus: PostGateWorkflowStatus
      decisionBy?: string
      decisionAt?: string
      decisionNote?: string
    }
  > = [
    {
      id: 'post-reg-101',
      referenceCode: 'REG-POST-2601',
      title: 'Delhi State U-16 Boys Football Open Trial — Register With Aadhaar Copy',
      body: 'Open selection trial for Under-16 players at Dwarka Sector 14 ground. Send Aadhaar 4829 1940 7731 format photo on personal WhatsApp to reserve slot.',
      category: 'trial_opportunity',
      tenantName: 'North Delhi Youth Football Academy',
      tenantSlug: 'north-delhi-youth-football',
      tenantPersona: 'academy',
      tenantStanding: 'active',
      tenantFederationVerified: false,
      submitterName: 'Sunil Dutt',
      submitterEmail: 'trials@ndyfa.in',
      sport: 'Football',
      city: 'Delhi NCR',
      involvesMinors: true,
      guardianConsentAttested: false,
      hasSponsoredDisclosure: false,
      sourceRoute: '/submit-listing?type=opportunity',
      submittedAt: hoursAgo(2),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-102',
      referenceCode: 'REG-POST-2602',
      title: 'Mumbai Super Cup U-19 Cricket Showcase — Guaranteed Selection Entry',
      body: 'Fast-track franchise scouting showcase in Navi Mumbai. Pay ₹5,500 via personal UPI for guaranteed selection spot in final squad.',
      category: 'tournament_notice',
      tenantName: 'Apex Sports Talent Management',
      tenantSlug: 'apex-sports-talent',
      tenantPersona: 'tournament',
      tenantStanding: 'restricted',
      tenantFederationVerified: false,
      submitterName: 'Rakesh Nair',
      submitterEmail: 'events@apexsportstalent.in',
      sport: 'Cricket',
      city: 'Mumbai',
      involvesMinors: true,
      guardianConsentAttested: true,
      hasSponsoredDisclosure: false,
      sourceRoute: '/tournament-ops',
      submittedAt: hoursAgo(4),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-103',
      referenceCode: 'REG-POST-2603',
      title: 'Weekend Midnight 5v5 Futsal League — Floodlit Arena Slots',
      body: 'Join our Saturday 5v5 futsal tournament in Velachery. Standard turf rules apply, water and first-aid kit available on site.',
      category: 'venue_listing',
      tenantName: 'Chennai Super Strikers Futsal & Turf',
      tenantSlug: 'chennai-super-strikers',
      tenantPersona: 'turf',
      tenantStanding: 'suspended',
      tenantFederationVerified: false,
      submitterName: 'Karthik Subramanian',
      submitterEmail: 'ops@chennaisuperstrikers.in',
      sport: 'Football',
      city: 'Chennai',
      involvesMinors: false,
      guardianConsentAttested: false,
      hasSponsoredDisclosure: false,
      sourceRoute: '/turf-calendar',
      submittedAt: hoursAgo(5),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-104',
      referenceCode: 'REG-POST-2604',
      title: 'Official SAI & BCCI Certified Fast-Bowling Biomechanics Clinic',
      body: '3-day pace bowling workshop led by former Ranji trainers in Pune. Claiming official SAI and BCCI certified grading certificates for all participants.',
      category: 'camp_clinic',
      tenantName: 'Deccan Pace Lab Coaching',
      tenantSlug: 'deccan-pace-lab',
      tenantPersona: 'coach',
      tenantStanding: 'active',
      tenantFederationVerified: false,
      submitterName: 'Coach Pradeep Kulkarni',
      submitterEmail: 'pradeep@deccanpacelab.in',
      sport: 'Cricket',
      city: 'Pune',
      involvesMinors: false,
      guardianConsentAttested: false,
      hasSponsoredDisclosure: false,
      sourceRoute: '/coach-dashboard',
      submittedAt: hoursAgo(6),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-105',
      referenceCode: 'REG-POST-2605',
      title: 'Monsoon Running Shoe Drop — Creator Reels Challenge (Bengaluru)',
      body: 'Calling Bengaluru running creators to post 30-second Cubbon Park interval reels showcasing new carbon-plate trainers for paid product incentives.',
      category: 'creator_campaign',
      tenantName: 'StrideIndia Athletics Collective',
      tenantSlug: 'strideindia-athletics',
      tenantPersona: 'creator',
      tenantStanding: 'active',
      tenantFederationVerified: false,
      submitterName: 'Ananya Rao',
      submitterEmail: 'creators@strideindia.in',
      sport: 'Athletics',
      city: 'Bengaluru',
      involvesMinors: false,
      guardianConsentAttested: false,
      hasSponsoredDisclosure: false,
      sourceRoute: '/campaigns/create',
      submittedAt: hoursAgo(8),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-106',
      referenceCode: 'REG-POST-2606',
      title: 'Elite Track Sprint Conditioning — Rapid Growth Hormone & Supplement Stack',
      body: 'High-intensity 400m sprint camp in Hyderabad featuring fast-track untested supplement protocol and rapid weight-cut pill guidance.',
      category: 'academy_program',
      tenantName: 'Velocity Sprint Conditioning Hub',
      tenantSlug: 'velocity-sprint-hub',
      tenantPersona: 'academy',
      tenantStanding: 'active',
      tenantFederationVerified: false,
      submitterName: 'Vikram Reddy',
      submitterEmail: 'camp@velocitysprint.in',
      sport: 'Athletics',
      city: 'Hyderabad',
      involvesMinors: false,
      guardianConsentAttested: false,
      hasSponsoredDisclosure: false,
      sourceRoute: '/academy-hub',
      submittedAt: hoursAgo(9),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-107',
      referenceCode: 'REG-POST-2607',
      title: 'Indiranagar 6-Court Wooden Badminton Arena — Morning Coaching Batches',
      body: 'BWF-spec maple courts open 5:30 AM to 10:30 PM with certified physio support, drinking water, and transparent court tariff posted at reception.',
      category: 'venue_listing',
      tenantName: 'Bangalore Shuttle Arena Pvt Ltd',
      tenantSlug: 'bangalore-shuttle-arena',
      tenantPersona: 'turf',
      tenantStanding: 'active',
      tenantFederationVerified: true,
      submitterName: 'Deepa Krishnan',
      submitterEmail: 'bookings@bangaloreshuttle.in',
      sport: 'Badminton',
      city: 'Bengaluru',
      involvesMinors: false,
      guardianConsentAttested: false,
      hasSponsoredDisclosure: false,
      sourceRoute: '/submit-listing?type=venue',
      submittedAt: hoursAgo(11),
      workflowStatus: 'pending_evaluation',
    },
    {
      id: 'post-reg-108',
      referenceCode: 'REG-POST-2608',
      title: 'Jaipur Grassroots U-16 Kabaddi Summer Camp (Guardian Consent Verified)',
      body: 'District-level summer kabaddi fundamentals camp with POSH ICC coordinator on duty, verified guardian consent forms, and free drinking water & medical standby.',
      category: 'academy_program',
      tenantName: 'Pink City Kabaddi Foundation',
      tenantSlug: 'pink-city-kabaddi',
      tenantPersona: 'academy',
      tenantStanding: 'active',
      tenantFederationVerified: true,
      submitterName: 'Mahendra Singh',
      submitterEmail: 'academy@pinkcitykabaddi.org',
      sport: 'Kabaddi',
      city: 'Jaipur',
      involvesMinors: true,
      guardianConsentAttested: true,
      hasSponsoredDisclosure: false,
      sourceRoute: '/academy-hub',
      submittedAt: hoursAgo(18),
      workflowStatus: 'cleared_published',
      decisionBy: 'compliance.lead@khelgrid.com',
      decisionAt: hoursAgo(15),
      decisionNote: 'All DPDP Sec. 9 & SafeSport disclosures verified. Cleared for public directory.',
    },
  ]

  return drafts.map(draft => ({
    id: draft.id,
    referenceCode: draft.referenceCode,
    title: draft.title,
    body: draft.body,
    category: draft.category,
    tenantName: draft.tenantName,
    tenantSlug: draft.tenantSlug,
    tenantId: draft.tenantId,
    tenantPersona: draft.tenantPersona,
    tenantStanding: draft.tenantStanding ?? 'active',
    tenantFederationVerified: Boolean(draft.tenantFederationVerified),
    submitterName: draft.submitterName,
    submitterEmail: draft.submitterEmail,
    sport: draft.sport,
    city: draft.city,
    involvesMinors: Boolean(draft.involvesMinors),
    guardianConsentAttested: Boolean(draft.guardianConsentAttested),
    hasSponsoredDisclosure: Boolean(draft.hasSponsoredDisclosure),
    sourceRoute: draft.sourceRoute ?? '/submit-listing',
    submittedAt: draft.submittedAt,
    evaluatedAt: draft.submittedAt,
    workflowStatus: draft.workflowStatus,
    evaluation: evaluateTenantPostAgainstRules(draft, rules),
    decisionBy: draft.decisionBy,
    decisionAt: draft.decisionAt,
    decisionNote: draft.decisionNote,
  }))
}

function appendPostRegulationAudit(params: {
  action: string
  actor: string
  targetEntity: string
  summary: string
  severity: 'info' | 'warning' | 'critical'
  sourceModule?: 'platform_governance' | 'moderation_desk' | 'fraud_disputes'
}): PostRegulationAuditRecord {
  const existing = loadStore<PostRegulationAuditRecord[]>(POST_REGULATION_AUDIT_KEY, [])
  const now = new Date().toISOString()
  const seqNum = 5001 + existing.length
  const rec: PostRegulationAuditRecord = {
    id: `post-reg-aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sequenceCode: `PREG-AUD-${seqNum}`,
    timestamp: now,
    sourceModule: params.sourceModule ?? 'moderation_desk',
    action: params.action,
    actor: params.actor,
    targetEntity: params.targetEntity,
    summary: params.summary,
    severity: params.severity,
    immutableChecksum: computeChecksum(`${seqNum}|${params.action}|${params.actor}|${params.targetEntity}|${now}`),
  }
  saveStore(POST_REGULATION_AUDIT_KEY, [rec, ...existing])
  return rec
}

export function getRegulatoryPolicyRules(): RegulatoryPolicyRule[] {
  return loadStore<RegulatoryPolicyRule[]>(
    POST_REGULATION_RULES_KEY,
    DEFAULT_REGULATORY_POLICY_RULES,
  )
}

export function getTenantPostRegulationQueue(): TenantPostEvaluationItem[] {
  const rules = getRegulatoryPolicyRules()
  const seeded = buildSeededQueue(rules)
  return loadStore<TenantPostEvaluationItem[]>(POST_REGULATION_QUEUE_KEY, seeded)
}

export function getPostRegulationAuditEvents(): PostRegulationAuditRecord[] {
  return loadStore<PostRegulationAuditRecord[]>(POST_REGULATION_AUDIT_KEY, [])
}

export function computePostRegulationMetrics(
  items: readonly TenantPostEvaluationItem[],
  rules: readonly RegulatoryPolicyRule[],
): PostRegulationMetrics {
  const pending = items.filter(i => i.workflowStatus === 'pending_evaluation')
  return {
    awaitingEvaluation: pending.length,
    hardHolds: pending.filter(i => i.evaluation.disposition === 'hard_hold').length,
    manualReview: pending.filter(i => i.evaluation.disposition === 'manual_review').length,
    autoClearEligible: pending.filter(i => i.evaluation.disposition === 'auto_clear_eligible').length,
    clearedPublished: items.filter(i => i.workflowStatus === 'cleared_published').length,
    returnedForFix: items.filter(i => i.workflowStatus === 'returned_for_fix').length,
    blockedQuarantined: items.filter(i => i.workflowStatus === 'blocked_quarantined').length,
    activeRulesCount: rules.filter(r => r.enabled).length,
    totalRulesCount: rules.length,
  }
}

export function getPostRegulationSnapshot(): {
  items: TenantPostEvaluationItem[]
  rules: RegulatoryPolicyRule[]
  metrics: PostRegulationMetrics
} {
  const rules = getRegulatoryPolicyRules()
  const items = getTenantPostRegulationQueue()
  return {
    items,
    rules,
    metrics: computePostRegulationMetrics(items, rules),
  }
}

function resolveTenantStandingFromGovernance(
  input: TenantPostDraftInput,
): TenantRegulatoryStatus {
  if (input.tenantStanding) return input.tenantStanding
  const tenants = readStoredAdminTenants()
  if (!tenants) return 'active'
  const slug = input.tenantSlug?.trim().toLowerCase()
  const name = input.tenantName.trim().toLowerCase()
  const matched = tenants.find(
    t =>
      (input.tenantId && t.id === input.tenantId) ||
      (slug && t.slug.toLowerCase() === slug) ||
      t.name.toLowerCase() === name,
  )
  return matched?.status ?? 'active'
}

/**
 * Mandatory pre-publication gate entrypoint invoked whenever any tenant submits
 * a post/listing/campaign anywhere on the platform.
 */
export function enqueueTenantPostForRegulation(
  input: TenantPostDraftInput,
): TenantPostEvaluationItem {
  const rules = getRegulatoryPolicyRules()
  const standing = resolveTenantStandingFromGovernance(input)
  const now = input.submittedAt || new Date().toISOString()
  const queue = getTenantPostRegulationQueue()

  const enrichedInput: TenantPostDraftInput = {
    ...input,
    tenantStanding: standing,
  }
  const evaluation = evaluateTenantPostAgainstRules(enrichedInput, rules)

  const refCode =
    input.referenceCode ||
    `REG-POST-${String(2609 + queue.length).padStart(4, '0')}`

  const record: TenantPostEvaluationItem = {
    id: input.id || `post-reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    referenceCode: refCode,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    tenantName: input.tenantName.trim() || 'Independent Tenant',
    tenantSlug: input.tenantSlug,
    tenantId: input.tenantId,
    tenantPersona: input.tenantPersona,
    tenantStanding: standing,
    tenantFederationVerified: Boolean(input.tenantFederationVerified),
    submitterName: input.submitterName.trim() || 'Tenant Operator',
    submitterEmail: input.submitterEmail.trim() || 'tenant@khelgrid.com',
    sport: input.sport.trim() || 'Multi-Sport',
    city: input.city.trim() || 'Pan-India',
    involvesMinors: Boolean(input.involvesMinors),
    guardianConsentAttested: Boolean(input.guardianConsentAttested),
    hasSponsoredDisclosure: Boolean(input.hasSponsoredDisclosure),
    sourceRoute: input.sourceRoute ?? '/submit-listing',
    submittedAt: now,
    evaluatedAt: now,
    workflowStatus: 'pending_evaluation',
    evaluation,
  }

  saveStore(POST_REGULATION_QUEUE_KEY, [record, ...queue])
  appendPostRegulationAudit({
    action: 'TENANT_POST_INGESTED',
    actor: record.submitterEmail,
    targetEntity: record.referenceCode,
    summary: `Tenant post "${record.title}" by ${record.tenantName} entered Pre-Publication Regulation Gate (${evaluation.disposition}, risk ${evaluation.riskScore}/100).`,
    severity: evaluation.disposition === 'hard_hold' ? 'warning' : 'info',
    sourceModule: 'moderation_desk',
  })

  return record
}

export function approveAndReleaseTenantPost(
  postId: string,
  operatorEmail: string,
  note?: string,
): TenantPostEvaluationItem | null {
  const queue = getTenantPostRegulationQueue()
  const now = new Date().toISOString()
  let updatedItem: TenantPostEvaluationItem | null = null

  const next = queue.map(item => {
    if (item.id !== postId) return item
    updatedItem = {
      ...item,
      workflowStatus: 'cleared_published',
      decisionBy: operatorEmail,
      decisionAt: now,
      decisionNote:
        note?.trim() ||
        'Cleared pre-publication regulatory evaluation and released to KhelGrid public catalogue.',
    }
    return updatedItem
  })

  if (!updatedItem) return null
  const approved: TenantPostEvaluationItem = updatedItem
  saveStore(POST_REGULATION_QUEUE_KEY, next)
  resolvePartnerComplianceAdvisory(approved.referenceCode, operatorEmail)

  appendPostRegulationAudit({
    action: 'POST_GATE_CLEARED',
    actor: operatorEmail,
    targetEntity: approved.referenceCode,
    summary: `Approved & released tenant post "${approved.title}" (${approved.tenantName}) after regulatory check (risk ${approved.evaluation.riskScore}/100).`,
    severity: approved.evaluation.disposition === 'hard_hold' ? 'warning' : 'info',
    sourceModule: 'moderation_desk',
  })

  return approved
}

export function returnTenantPostForFix(
  postId: string,
  operatorEmail: string,
  remediationNote: string,
  missingItems?: string[],
): TenantPostEvaluationItem | null {
  const queue = getTenantPostRegulationQueue()
  const now = new Date().toISOString()
  let updatedItem: TenantPostEvaluationItem | null = null

  const next = queue.map(item => {
    if (item.id !== postId) return item
    const derivedMissing =
      missingItems && missingItems.length > 0
        ? missingItems
        : item.evaluation.checks
            .filter(c => c.outcome !== 'pass')
            .map(c => c.remediationHint || c.evidence)
    updatedItem = {
      ...item,
      workflowStatus: 'returned_for_fix',
      decisionBy: operatorEmail,
      decisionAt: now,
      decisionNote: remediationNote.trim(),
      remediationItems: derivedMissing,
    }
    return updatedItem
  })

  if (!updatedItem) return null
  const returned: TenantPostEvaluationItem = updatedItem
  saveStore(POST_REGULATION_QUEUE_KEY, next)

  publishPartnerComplianceAdvisory({
    referenceCode: returned.referenceCode,
    sourceDesk: 'moderation_desk',
    targetPersona: returned.tenantPersona,
    tenantId: returned.tenantId,
    tenantSlug: returned.tenantSlug,
    entityName: returned.tenantName,
    severity: 'action_required',
    headline: `Pre-Publication Compliance Fix Required · ${returned.referenceCode}`,
    message: remediationNote.trim(),
    missingItems: returned.remediationItems,
    issuedBy: operatorEmail,
    actionUrl: returned.sourceRoute,
  })

  appendPostRegulationAudit({
    action: 'POST_GATE_RETURNED',
    actor: operatorEmail,
    targetEntity: returned.referenceCode,
    summary: `Returned tenant post "${returned.title}" (${returned.tenantName}) for compliance remediation and dispatched Partner Advisory Banner.`,
    severity: 'warning',
    sourceModule: 'moderation_desk',
  })

  return returned
}

export function blockAndQuarantineTenantPost(
  postId: string,
  operatorEmail: string,
  reason: string,
  notifyTenantBanner = true,
): TenantPostEvaluationItem | null {
  const queue = getTenantPostRegulationQueue()
  const now = new Date().toISOString()
  let updatedItem: TenantPostEvaluationItem | null = null

  const next = queue.map(item => {
    if (item.id !== postId) return item
    updatedItem = {
      ...item,
      workflowStatus: 'blocked_quarantined',
      decisionBy: operatorEmail,
      decisionAt: now,
      decisionNote: reason.trim(),
    }
    return updatedItem
  })

  if (!updatedItem) return null
  const blocked: TenantPostEvaluationItem = updatedItem
  saveStore(POST_REGULATION_QUEUE_KEY, next)

  if (notifyTenantBanner) {
    publishPartnerComplianceAdvisory({
      referenceCode: blocked.referenceCode,
      sourceDesk: 'fraud_disputes',
      targetPersona: blocked.tenantPersona,
      tenantId: blocked.tenantId,
      tenantSlug: blocked.tenantSlug,
      entityName: blocked.tenantName,
      severity: 'action_required',
      headline: `Post Blocked by Pre-Publication Regulation Gate · ${blocked.referenceCode}`,
      message: reason.trim(),
      issuedBy: operatorEmail,
      actionUrl: '/workspace',
    })
  }

  appendPostRegulationAudit({
    action: 'POST_GATE_BLOCKED',
    actor: operatorEmail,
    targetEntity: blocked.referenceCode,
    summary: `Blocked & quarantined tenant post "${blocked.title}" (${blocked.tenantName}): ${reason.trim()}`,
    severity: 'critical',
    sourceModule: 'fraud_disputes',
  })

  return blocked
}

export function updateRegulatoryPolicyRule(
  ruleId: string,
  patch: Partial<Pick<RegulatoryPolicyRule, 'enabled' | 'enforcement' | 'riskWeight' | 'keywords'>>,
  operatorEmail: string,
): RegulatoryPolicyRule | null {
  const rules = getRegulatoryPolicyRules()
  const now = new Date().toISOString()
  let updatedRule: RegulatoryPolicyRule | null = null

  const next = rules.map(rule => {
    if (rule.id !== ruleId) return rule
    updatedRule = {
      ...rule,
      ...patch,
      riskWeight:
        typeof patch.riskWeight === 'number'
          ? Math.max(5, Math.min(100, Math.round(patch.riskWeight)))
          : rule.riskWeight,
      updatedAt: now,
      updatedBy: operatorEmail,
    }
    return updatedRule
  })

  if (!updatedRule) return null
  const saved: RegulatoryPolicyRule = updatedRule
  saveStore(POST_REGULATION_RULES_KEY, next)

  appendPostRegulationAudit({
    action: 'REGULATORY_RULE_UPDATED',
    actor: operatorEmail,
    targetEntity: saved.code,
    summary: `Updated policy rule "${saved.name}" (enabled=${saved.enabled}, enforcement=${saved.enforcement}, weight=${saved.riskWeight}).`,
    severity: saved.enabled ? 'info' : 'warning',
    sourceModule: 'platform_governance',
  })

  return saved
}

export function reEvaluatePendingTenantPosts(operatorEmail: string): {
  reEvaluatedCount: number
  hardHoldsCount: number
} {
  const rules = getRegulatoryPolicyRules()
  const queue = getTenantPostRegulationQueue()
  const now = new Date().toISOString()
  let reEvaluatedCount = 0
  let hardHoldsCount = 0

  const next = queue.map(item => {
    if (item.workflowStatus !== 'pending_evaluation') return item
    reEvaluatedCount += 1
    const evaluation = evaluateTenantPostAgainstRules(item, rules)
    if (evaluation.disposition === 'hard_hold') hardHoldsCount += 1
    return {
      ...item,
      evaluatedAt: now,
      evaluation,
    }
  })

  saveStore(POST_REGULATION_QUEUE_KEY, next)
  appendPostRegulationAudit({
    action: 'POST_GATE_BULK_REEVALUATED',
    actor: operatorEmail,
    targetEntity: 'POST_REGULATION_GATE',
    summary: `Re-evaluated ${reEvaluatedCount} awaiting tenant posts against ${rules.filter(r => r.enabled).length} active statutory policy rules (${hardHoldsCount} hard holds).`,
    severity: 'info',
    sourceModule: 'platform_governance',
  })

  return { reEvaluatedCount, hardHoldsCount }
}

function csvCell(value: string | number | undefined): string {
  const raw = String(value ?? '')
  return `"${raw.replace(/"/g, '""')}"`
}

export function exportPostRegulationCsv(items: readonly TenantPostEvaluationItem[]): string {
  const header = [
    'Reference Code',
    'Title',
    'Category',
    'Tenant Name',
    'Tenant Standing',
    'Sport',
    'City',
    'Workflow Status',
    'Disposition',
    'Risk Score',
    'Failed Rules',
    'Summary Reason',
    'Submitted At',
  ].join(',')

  const rows = items.map(item =>
    [
      csvCell(item.referenceCode),
      csvCell(item.title),
      csvCell(TENANT_POST_CATEGORY_LABELS[item.category]),
      csvCell(item.tenantName),
      csvCell(item.tenantStanding),
      csvCell(item.sport),
      csvCell(item.city),
      csvCell(item.workflowStatus),
      csvCell(item.evaluation.disposition),
      csvCell(item.evaluation.riskScore),
      csvCell(item.evaluation.failedCount),
      csvCell(item.evaluation.summaryReason),
      csvCell(item.submittedAt),
    ].join(','),
  )

  return [header, ...rows].join('\n')
}

export function resetPostRegulationForTesting(): void {
  memoryStore.clear()
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(POST_REGULATION_QUEUE_KEY)
      window.localStorage.removeItem(POST_REGULATION_RULES_KEY)
      window.localStorage.removeItem(POST_REGULATION_AUDIT_KEY)
    }
  } catch {
    // ignore
  }
}
