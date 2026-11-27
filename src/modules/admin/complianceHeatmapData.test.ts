import { describe, it, expect } from 'vitest'
import {
  buildComplianceHeatmapMatrix,
  buildComplianceSignals,
  buildInvestigableEntityRows,
  buildRegion30DayTrend,
  buildRegionTrendForWindow,
  classifyComplianceRiskTier,
  EMPTY_DRILLDOWN_FILTER,
  filterEntityRowsByDrilldown,
  filterModerationRecordsByDrilldown,
  filterSignalsByDateRange,
  formatTrendDeltaLabel,
  normalizeComplianceRegion,
  normalizePartnerCategory,
  resolveComplianceDateWindow,
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

  it('computes 30-day regional compliance risk trends accurately for increasing, decreasing, and stable trajectories', () => {
    const refEnd = new Date('2026-11-25T23:59:59Z')
    const signals = buildComplianceSignals({
      incidents: [
        {
          id: 'inc-mh-1',
          incidentNumber: 'TS-2026-083',
          title: 'Older open complaint',
          category: 'abuse_harassment',
          severity: 'high_p1',
          status: 'appeal_pending',
          reportedEntityType: 'coach',
          reportedEntityName: 'Coach R',
          city: 'Pune',
          state: 'Maharashtra',
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-11-20T10:00:00Z',
        },
        {
          id: 'inc-mh-2',
          incidentNumber: 'TS-2026-081',
          title: 'Recent P0 turf safety hazard',
          category: 'safety_hazard',
          severity: 'critical_p0',
          status: 'sanction_issued',
          reportedEntityType: 'venue',
          reportedEntityName: 'PlayArena Turf',
          city: 'Mumbai',
          state: 'Maharashtra',
          createdAt: '2026-11-15T10:00:00Z',
          updatedAt: '2026-11-18T10:00:00Z',
        },
        {
          id: 'inc-tg-1',
          incidentNumber: 'TS-2026-085',
          title: 'Booking dispute resolved and closed',
          category: 'booking_dispute',
          severity: 'medium_p2',
          status: 'case_closed',
          reportedEntityType: 'venue',
          reportedEntityName: 'SkyLine Arena',
          city: 'Hyderabad',
          state: 'Telangana',
          createdAt: '2026-11-01T10:00:00Z',
          updatedAt: '2026-11-10T10:00:00Z',
        },
      ],
      verifications: [],
      tenants: [
        {
          id: 'org-tn-1',
          name: 'Chennai Turf',
          tenantType: 'venue',
          status: 'suspended',
          city: 'Chennai',
          state: 'Tamil Nadu',
          updatedAt: '2026-09-15T10:00:00Z',
        },
      ],
    })

    // Increasing trend (Maharashtra: 28 -> 70)
    const mhTrend = buildRegion30DayTrend(
      signals.filter(s => s.region === 'Maharashtra'),
      refEnd,
    )
    expect(mhTrend.points.length).toBe(30)
    expect(mhTrend.startScore).toBe(28)
    expect(mhTrend.currentScore).toBe(70)
    expect(mhTrend.direction).toBe('increasing')
    expect(mhTrend.delta).toBe(42)
    expect(formatTrendDeltaLabel(mhTrend)).toBe('↑ +42')

    // Decreasing/improving trend (Telangana: 0 -> 14 peak -> 6 closed)
    const tgTrend = buildRegion30DayTrend(
      signals.filter(s => s.region === 'Telangana'),
      refEnd,
    )
    expect(tgTrend.peakScore).toBe(14)
    expect(tgTrend.currentScore).toBe(6)
    expect(tgTrend.direction).toBe('decreasing')
    expect(tgTrend.delta).toBe(-8)
    expect(tgTrend.deltaPct).toBe(-57)
    expect(formatTrendDeltaLabel(tgTrend)).toBe('↓ -8')

    // Stable trend (Tamil Nadu suspended well before 30-day window: 34 -> 34)
    const tnTrend = buildRegion30DayTrend(
      signals.filter(s => s.region === 'Tamil Nadu'),
      refEnd,
    )
    expect(tnTrend.startScore).toBe(34)
    expect(tnTrend.currentScore).toBe(34)
    expect(tnTrend.direction).toBe('stable')
    expect(formatTrendDeltaLabel(tnTrend)).toBe('→ 0')

    // Matrix attaches trend30d onto every row and preserves final day === totalRisk
    const matrix = buildComplianceHeatmapMatrix(signals, 'partner_category', 'all')
    for (const row of matrix.rows) {
      expect(row.trend30d).toBeDefined()
      expect(row.trend30d?.points.length).toBe(30)
      expect(row.trend30d?.currentScore).toBe(row.totalRisk)
    }
  })

  it('resolves 7d, 90d, all-time, and custom date windows and filters signals & sparkline trends accordingly', () => {
    const signals = buildComplianceSignals({
      incidents: [
        {
          id: 'inc-old',
          incidentNumber: 'TS-2026-010',
          title: 'Older August incident',
          category: 'booking_dispute',
          severity: 'medium_p2',
          status: 'case_closed',
          reportedEntityType: 'venue',
          reportedEntityName: 'Old Turf',
          city: 'Hyderabad',
          state: 'Telangana',
          createdAt: '2026-08-10T10:00:00Z',
          updatedAt: '2026-08-15T10:00:00Z',
        },
        {
          id: 'inc-mid',
          incidentNumber: 'TS-2026-081',
          title: 'Mid-November P0 turf safety hazard',
          category: 'safety_hazard',
          severity: 'critical_p0',
          status: 'sanction_issued',
          reportedEntityType: 'venue',
          reportedEntityName: 'PlayArena Turf',
          city: 'Mumbai',
          state: 'Maharashtra',
          createdAt: '2026-11-12T10:00:00Z',
          updatedAt: '2026-11-14T10:00:00Z',
        },
        {
          id: 'inc-recent',
          incidentNumber: 'TS-2026-099',
          title: 'Very recent P1 complaint',
          category: 'abuse_harassment',
          severity: 'high_p1',
          status: 'under_investigation',
          reportedEntityType: 'coach',
          reportedEntityName: 'Coach K',
          city: 'New Delhi',
          state: 'Delhi',
          createdAt: '2026-11-23T10:00:00Z',
          updatedAt: '2026-11-25T10:00:00Z',
        },
      ],
      verifications: [],
      tenants: [],
    })

    // 7d window anchored on latest signal (2026-11-25) excludes older August & Nov 14 signals
    const win7d = resolveComplianceDateWindow(signals, { preset: '7d', startDate: null, endDate: null })
    expect(win7d.dayCount).toBe(7)
    expect(win7d.shortLabel).toBe('7d')
    const filtered7d = filterSignalsByDateRange(signals, { preset: '7d', startDate: null, endDate: null }, win7d)
    expect(filtered7d.map(s => s.referenceCode)).toEqual(['TS-2026-099'])

    // Custom date range (2026-11-01 to 2026-11-15) isolates only the Mid-November signal
    const customRange = { preset: 'custom' as const, startDate: '2026-11-01', endDate: '2026-11-15' }
    const winCustom = resolveComplianceDateWindow(signals, customRange)
    expect(winCustom.dayCount).toBe(15)
    expect(winCustom.shortLabel).toBe('15d')
    const filteredCustom = filterSignalsByDateRange(signals, customRange, winCustom)
    expect(filteredCustom.map(s => s.referenceCode)).toEqual(['TS-2026-081'])

    const customMatrix = buildComplianceHeatmapMatrix(signals, 'partner_category', 'all', customRange)
    expect(customMatrix.dateWindow.shortLabel).toBe('15d')
    expect(customMatrix.totalSignals).toBe(1)
    expect(customMatrix.rows[0]?.key).toBe('Maharashtra')
    expect(customMatrix.rows[0]?.trend30d?.points.length).toBe(15)

    // 90d window samples cleanly within 60 points for crisp SVG sparklines
    const win90d = resolveComplianceDateWindow(signals, { preset: '90d', startDate: null, endDate: null })
    expect(win90d.dayCount).toBe(90)
    const trend90d = buildRegionTrendForWindow(
      signals.filter(s => s.region === 'Maharashtra'),
      win90d.startMs,
      win90d.endMs,
    )
    expect(trend90d.points.length).toBeLessThanOrEqual(60)
    expect(trend90d.points.length).toBeGreaterThanOrEqual(2)

    // All-time window returns all signals
    const allFiltered = filterSignalsByDateRange(signals, { preset: 'all', startDate: null, endDate: null })
    expect(allFiltered.length).toBe(3)
  })
})

