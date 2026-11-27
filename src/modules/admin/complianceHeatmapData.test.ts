import { describe, it, expect } from 'vitest'
import {
  buildComplianceHeatmapMatrix,
  buildComplianceSignals,
  buildInvestigableEntityRows,
  classifyComplianceRiskTier,
  EMPTY_DRILLDOWN_FILTER,
  filterEntityRowsByDrilldown,
  filterModerationRecordsByDrilldown,
  normalizeComplianceRegion,
  normalizePartnerCategory,
} from './complianceHeatmapData'

describe('Admin Compliance Heatmap Data Engine', () => {
  it('normalizes metro cities and states into canonical operational regions', () => {
    expect(normalizeComplianceRegion('New Delhi', 'Delhi')).toBe('Delhi NCR')
    expect(normalizeComplianceRegion('Gurugram', 'Haryana')).toBe('Delhi NCR')
    expect(normalizeComplianceRegion('Mumbai', 'Maharashtra')).toBe('Maharashtra')
    expect(normalizeComplianceRegion('Pune', 'Maharashtra')).toBe('Maharashtra')
    expect(normalizeComplianceRegion('Bengaluru', 'Karnataka')).toBe('Karnataka')
    expect(normalizeComplianceRegion('Chennai', 'Tamil Nadu')).toBe('Tamil Nadu')
  })

  it('normalizes partner entity types into the 5 canonical categories', () => {
    expect(normalizePartnerCategory('academy')).toBe('academies')
    expect(normalizePartnerCategory('club')).toBe('academies')
    expect(normalizePartnerCategory('university')).toBe('academies')
    expect(normalizePartnerCategory('venue')).toBe('venues')
    expect(normalizePartnerCategory('coach')).toBe('coaches')
    expect(normalizePartnerCategory('organiser')).toBe('organisers')
    expect(normalizePartnerCategory('tournament')).toBe('organisers')
    expect(normalizePartnerCategory('athlete')).toBe('athletes')
  })

  it('classifies numeric risk scores into semantic risk tiers', () => {
    expect(classifyComplianceRiskTier(0)).toBe('clear')
    expect(classifyComplianceRiskTier(12)).toBe('low')
    expect(classifyComplianceRiskTier(30)).toBe('elevated')
    expect(classifyComplianceRiskTier(55)).toBe('high')
    expect(classifyComplianceRiskTier(78)).toBe('critical')
  })

  it('aggregates signals across Trust & Safety, Verification, and Tenants and sorts highest-risk regions first', () => {
    const signals = buildComplianceSignals({
      incidents: [
        {
          id: 'inc-1',
          incidentNumber: 'TS-2026-081',
          title: 'Exposed steel pegs on turf',
          category: 'safety_hazard',
          severity: 'critical_p0',
          status: 'sanction_issued',
          reportedEntityType: 'venue',
          reportedEntityName: 'PlayArena Turf',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
        {
          id: 'inc-2',
          incidentNumber: 'TS-2026-083',
          title: 'Abuse complaint',
          category: 'abuse_harassment',
          severity: 'high_p1',
          status: 'appeal_pending',
          reportedEntityType: 'coach',
          reportedEntityName: 'Coach R',
          city: 'Pune',
          state: 'Maharashtra',
        },
        {
          id: 'inc-3',
          incidentNumber: 'TS-2026-085',
          title: 'Minor closed booking dispute',
          category: 'booking_dispute',
          severity: 'medium_p2',
          status: 'case_closed',
          reportedEntityType: 'venue',
          reportedEntityName: 'Hyd Arena',
          city: 'Hyderabad',
          state: 'Telangana',
        },
      ],
      verifications: [
        {
          id: 'ver-1',
          referenceCode: 'VER-2026-10',
          entityType: 'venue',
          entityName: 'PlayArena Turf',
          city: 'Mumbai',
          state: 'Maharashtra',
          status: 'revoked',
        },
        {
          id: 'ver-ok',
          referenceCode: 'VER-2026-11',
          entityType: 'academy',
          entityName: 'Verified Academy',
          city: 'Bengaluru',
          state: 'Karnataka',
          status: 'verified',
        },
      ],
      tenants: [
        {
          id: 'org-chn-09',
          name: 'Chennai Super Strikers',
          tenantType: 'venue',
          status: 'suspended',
          city: 'Chennai',
          state: 'Tamil Nadu',
        },
        {
          id: 'org-ok',
          name: 'Healthy Academy',
          tenantType: 'academy',
          status: 'active',
          city: 'Bengaluru',
          state: 'Karnataka',
        },
      ],
    })

    // Verified dossier and active tenant produce zero risk signals
    expect(signals.length).toBe(5)

    const matrix = buildComplianceHeatmapMatrix(signals, 'partner_category', 'all')
    expect(matrix.rows[0]?.key).toBe('Maharashtra')
    expect(matrix.topRegion?.key).toBe('Maharashtra')
    expect(matrix.topColumn?.key).toBe('venues')

    const mhVenueCell = matrix.cells.find(
      c => c.rowKey === 'Maharashtra' && c.colKey === 'venues',
    )
    expect(mhVenueCell?.signalCount).toBe(2) // critical_p0 (42) + revoked seal (32) = 74
    expect(mhVenueCell?.riskScore).toBe(74)
    expect(mhVenueCell?.tier).toBe('critical')

    // Filtering to trust_safety excludes verification & tenant signals
    const tsOnly = buildComplianceHeatmapMatrix(signals, 'incident_type', 'trust_safety')
    expect(tsOnly.totalSignals).toBe(3)
    expect(tsOnly.columns.some(c => c.key === 'safety_hazard')).toBe(true)

    // Filtering to high_risk_only excludes closed medium_p2 case
    const highRiskOnly = buildComplianceHeatmapMatrix(signals, 'partner_category', 'high_risk_only')
    expect(highRiskOnly.totalSignals).toBe(4)
    expect(
      highRiskOnly.cells.find(c => c.rowKey === 'Telangana' && c.colKey === 'venues')?.riskScore,
    ).toBe(0)
  })

  it('consolidates entities and filters adjacent rosters and queues accurately by region, category, and incident type', () => {
    const rows = buildInvestigableEntityRows({
      incidents: [
        {
          id: 'inc-mh',
          incidentNumber: 'TS-2026-081',
          title: 'Exposed steel pegs on turf',
          category: 'safety_hazard',
          severity: 'critical_p0',
          status: 'sanction_issued',
          reportedEntityType: 'venue',
          reportedEntityName: 'PlayArena Turf',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
        {
          id: 'inc-dl',
          incidentNumber: 'TS-2026-087',
          title: 'Match conduct brawl',
          category: 'match_conduct',
          severity: 'critical_p0',
          status: 'intake_pending',
          reportedEntityType: 'organiser',
          reportedEntityName: 'NCR Super Cup',
          city: 'Gurugram',
          state: 'Haryana',
        },
      ],
      verifications: [
        {
          id: 'ver-mh',
          referenceCode: 'KG-VEN-01',
          entityType: 'venue',
          entityName: 'PlayArena Turf',
          city: 'Mumbai',
          state: 'Maharashtra',
          status: 'revoked',
        },
      ],
      tenants: [
        {
          id: 'ten-ka',
          name: 'Bengaluru FC Academy',
          tenantType: 'academy',
          status: 'active',
          city: 'Bengaluru',
          state: 'Karnataka',
          sport: 'Football',
        },
      ],
    })

    // PlayArena Turf is merged across incident + verification (42 + 32 = 74) and ranks #1
    expect(rows.length).toBe(3)
    expect(rows[0].entityName).toBe('PlayArena Turf')
    expect(rows[0].riskScore).toBe(74)
    expect(rows[0].signalCount).toBe(2)

    // Empty filter returns all rows
    expect(filterEntityRowsByDrilldown(rows, EMPTY_DRILLDOWN_FILTER).length).toBe(3)

    // Region-only drilldown
    const mhOnly = filterEntityRowsByDrilldown(rows, {
      region: 'Maharashtra',
      partnerCategory: null,
      incidentType: null,
    })
    expect(mhOnly.map(r => r.entityName)).toEqual(['PlayArena Turf'])

    // Partner category-only drilldown
    const organisersOnly = filterEntityRowsByDrilldown(rows, {
      region: null,
      partnerCategory: 'organisers',
      incidentType: null,
    })
    expect(organisersOnly.map(r => r.entityName)).toEqual(['NCR Super Cup'])

    // Incident-type drilldown
    const safetyOnly = filterEntityRowsByDrilldown(rows, {
      region: null,
      partnerCategory: null,
      incidentType: 'safety_hazard',
    })
    expect(safetyOnly.map(r => r.entityName)).toEqual(['PlayArena Turf'])

    // Moderation queue/activity filtering normalizes Gurugram -> Delhi NCR and club -> academies
    const queue = [
      { id: 'q1', city: 'Mumbai', listing_type: 'venue' },
      { id: 'q2', city: 'Gurugram', listing_type: 'club' },
      { id: 'q3', city: 'Bengaluru', listing_type: 'coach' },
    ]
    const filteredQueue = filterModerationRecordsByDrilldown(queue, {
      region: 'Delhi NCR',
      partnerCategory: 'academies',
      incidentType: null,
    })
    expect(filteredQueue.map(q => q.id)).toEqual(['q2'])
  })
})

