import { describe, it, expect } from 'vitest'
import {
  buildComplianceHeatmapMatrix,
  buildComplianceSignals,
  buildInvestigableEntityRows,
  EMPTY_DRILLDOWN_FILTER,
  filterEntityRowsByDrilldown,
  type HeatmapDrilldownFilter,
} from './complianceHeatmapData'
import {
  buildComplianceCsvExport,
  buildComplianceCsvFilename,
  escapeCsvCell,
} from './complianceCsvExport'

function createSampleFixture() {
  const input = {
    incidents: [
      {
        id: 'inc-mh-1',
        incidentNumber: 'TS-2026-081',
        title: 'Exposed steel pegs, "urgent" hazard',
        category: 'safety_hazard',
        severity: 'critical_p0',
        status: 'sanction_issued',
        reportedEntityType: 'venue',
        reportedEntityName: 'PlayArena Turf, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        createdAt: '2026-11-12T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'inc-tg-1',
        incidentNumber: 'TS-2026-085',
        title: 'Closed minor booking dispute',
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
      {
        id: 'inc-dl-1',
        incidentNumber: 'TS-2026-087',
        title: 'Match conduct brawl',
        category: 'match_conduct',
        severity: 'high_p1',
        status: 'intake_pending',
        reportedEntityType: 'organiser',
        reportedEntityName: '=CMD("evil") Cup',
        city: 'Gurugram',
        state: 'Haryana',
        createdAt: '2026-11-18T10:00:00Z',
        updatedAt: '2026-11-22T10:00:00Z',
      },
    ],
    verifications: [
      {
        id: 'ver-mh-1',
        referenceCode: 'VER-2026-10',
        entityType: 'venue',
        entityName: 'PlayArena Turf, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'revoked',
        submittedAt: '2026-11-10T09:00:00Z',
        lastAuditedAt: '2026-11-15T09:00:00Z',
      },
    ],
    tenants: [
      {
        id: 'ten-ka-1',
        name: 'Bengaluru FC Academy',
        tenantType: 'academy',
        status: 'active',
        city: 'Bengaluru',
        state: 'Karnataka',
        sport: 'Football',
        updatedAt: '2026-11-19T12:00:00Z',
      },
    ],
  }

  const signals = buildComplianceSignals(input)
  const entities = buildInvestigableEntityRows(input)
  return { signals, entities }
}

describe('Compliance Heatmap & Drilldown CSV Exporter', () => {
  it('escapes RFC-4180 quotes/commas and neutralizes spreadsheet formula injection while keeping negative numbers', () => {
    expect(escapeCsvCell('PlayArena, "Mumbai"')).toBe('"PlayArena, ""Mumbai"""')
    expect(escapeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(escapeCsvCell('+1+1')).toBe("'+1+1")
    expect(escapeCsvCell('@evil')).toBe("'@evil")
    expect(escapeCsvCell('-cmd()')).toBe("'-cmd()")
    // Legitimate negative deltas & percentages remain unprefixed numeric strings
    expect(escapeCsvCell(-8)).toBe('-8')
    expect(escapeCsvCell('-57%')).toBe('-57%')
    expect(escapeCsvCell(true)).toBe('Yes')
    expect(escapeCsvCell(false)).toBe('No')
  })

  it('builds descriptive deterministic filenames reflecting preset, drilldown, and signal scope', () => {
    const refDate = new Date('2026-11-25T15:00:00Z')
    expect(
      buildComplianceCsvFilename({
        kind: 'combined',
        scope: 'all',
        drilldown: EMPTY_DRILLDOWN_FILTER,
        exportedAt: refDate,
      }),
    ).toBe('khelgrid-compliance-report-all-2026-11-25.csv')

    expect(
      buildComplianceCsvFilename({
        kind: 'combined',
        scope: 'high_risk_only',
        drilldown: { region: 'Maharashtra', partnerCategory: 'venues', incidentType: null },
        exportedAt: refDate,
      }),
    ).toBe('khelgrid-compliance-report-maharashtra-venues-high-risk-2026-11-25.csv')

    expect(
      buildComplianceCsvFilename({
        kind: 'heatmap_matrix',
        scope: 'trust_safety',
        drilldown: { region: 'Delhi NCR', partnerCategory: null, incidentType: 'abuse_conduct' },
        exportedAt: refDate,
      }),
    ).toBe('khelgrid-compliance-heatmap-delhi-ncr-abuse-conduct-trust-safety-2026-11-25.csv')

    expect(
      buildComplianceCsvFilename({
        kind: 'drilldown_entities',
        scope: 'all',
        drilldown: { region: 'Karnataka', partnerCategory: 'academies', incidentType: null },
        exportedAt: refDate,
      }),
    ).toBe('khelgrid-compliance-entities-karnataka-academies-2026-11-25.csv')
  })

  it('exports combined report with UTF-8 BOM, metadata, heatmap 30d trends, entities, and formula-safe signals', () => {
    const { signals, entities } = createSampleFixture()
    const matrix = buildComplianceHeatmapMatrix(signals, 'partner_category', 'all')
    const exportedAt = new Date('2026-11-25T12:00:00Z')

    const result = buildComplianceCsvExport({
      kind: 'combined',
      matrix,
      allSignals: signals,
      drilldown: EMPTY_DRILLDOWN_FILTER,
      entities,
      exportedAt,
    })

    expect(result.filename).toBe('khelgrid-compliance-report-all-2026-11-25.csv')
    expect(result.csv.startsWith('\uFEFF')).toBe(true)
    expect(result.regionCount).toBe(matrix.rows.length)
    expect(result.entityCount).toBe(4)
    expect(result.signalCount).toBe(4)

    // Contains all 4 structured sections
    expect(result.csv).toContain('KHELGRID COMPLIANCE HEATMAP & DRILLDOWN EXPORT')
    expect(result.csv).toContain('FILTERED COMPLIANCE HEATMAP & 30-DAY TRENDS')
    expect(result.csv).toContain('DRILLDOWN REGULATED ENTITIES ROSTER')
    expect(result.csv).toContain('UNDERLYING REGULATORY SIGNALS & INCIDENTS')

    // Neutralizes formula payload in entity name
    expect(result.csv).toContain('"\'=CMD(""evil"") Cup"')
    // Properly quotes comma + double-quotes in title
    expect(result.csv).toContain('"Exposed steel pegs, ""urgent"" hazard"')
    // Includes 30d trend direction values
    expect(result.csv).toContain('Risk Increasing')
    expect(result.csv).toContain('Risk Improving')
  })

  it('strictly scopes heatmap rows, columns, entities, and signals when drilldown and scope filters are active', () => {
    const { signals, entities } = createSampleFixture()
    const matrix = buildComplianceHeatmapMatrix(signals, 'partner_category', 'high_risk_only')
    const drilldown: HeatmapDrilldownFilter = {
      region: 'Maharashtra',
      partnerCategory: 'venues',
      incidentType: null,
    }
    const filteredEntities = filterEntityRowsByDrilldown(entities, drilldown)

    const result = buildComplianceCsvExport({
      kind: 'combined',
      matrix,
      allSignals: signals,
      drilldown,
      entities: filteredEntities,
      exportedAt: new Date('2026-11-25T12:00:00Z'),
    })

    expect(result.filename).toBe(
      'khelgrid-compliance-report-maharashtra-venues-high-risk-2026-11-25.csv',
    )
    expect(result.regionCount).toBe(1)
    expect(result.entityCount).toBe(1)
    expect(result.signalCount).toBe(2)

    expect(result.csv).toContain('Maharashtra')
    expect(result.csv).toContain('Venues & Turfs (Risk)')
    expect(result.csv).toContain('"PlayArena Turf, Mumbai"')
    // Excluded regions and non-matching entities/signals must not leak into exported CSV
    expect(result.csv).not.toContain('Telangana')
    expect(result.csv).not.toContain('SkyLine Arena')
    expect(result.csv).not.toContain('Bengaluru FC Academy')
    expect(result.csv).not.toContain('TS-2026-085')
  })

  it('exports pure flat tabular CSVs for heatmap_matrix and drilldown_entities presets', () => {
    const { signals, entities } = createSampleFixture()
    const matrix = buildComplianceHeatmapMatrix(signals, 'incident_type', 'all')
    const drilldown: HeatmapDrilldownFilter = {
      region: 'Maharashtra',
      partnerCategory: null,
      incidentType: null,
    }

    const matrixRes = buildComplianceCsvExport({
      kind: 'heatmap_matrix',
      matrix,
      allSignals: signals,
      drilldown,
      entities: filterEntityRowsByDrilldown(entities, drilldown),
      exportedAt: new Date('2026-11-25T12:00:00Z'),
    })

    const matrixLines = matrixRes.csv.replace(/^\uFEFF/, '').trim().split('\r\n')
    expect(matrixLines.length).toBe(2) // 1 header row + 1 filtered region row (Maharashtra)
    expect(matrixLines[0]).toContain('Region,Safety Hazards (Risk),Safety Hazards (Signals)')
    expect(matrixLines[1].startsWith('Maharashtra,')).toBe(true)

    const entitiesRes = buildComplianceCsvExport({
      kind: 'drilldown_entities',
      matrix,
      allSignals: signals,
      drilldown,
      entities: filterEntityRowsByDrilldown(entities, drilldown),
      exportedAt: new Date('2026-11-25T12:00:00Z'),
    })

    const entityLines = entitiesRes.csv.replace(/^\uFEFF/, '').trim().split('\r\n')
    expect(entityLines.length).toBe(2) // 1 header row + 1 entity row
    expect(entityLines[0]).toContain('Reference Code,Entity Name,Partner Category')
    expect(entityLines[1]).toContain('"PlayArena Turf, Mumbai"')
  })
})
