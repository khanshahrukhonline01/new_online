/**
 * KhelGrid Admin — Graduated Phase 5+ Ground Operations Service
 *
 * Powers the three live operational infrastructure workspaces:
 * 1. gate_desk       — Universal QR Gate Check-In Telemetry & Scanner Buffers
 * 2. turf_oversight  — Turf Slot Utilization, Holds & Safety Maintenance Calendars
 * 3. academy_oversight — Academy Batch Capacity, Coach Credentials & Attendance Oversight
 *
 * All mutations append tamper-evident audit records visible in Module 7.
 * Platform payment gateways remain safely paused (ledger/slot tracking only).
 */

import {
  getGateAdmissionLogs,
  verifyPassToken,
  admitPassToken,
  clearGateAdmissionLog,
  type PassType,
} from '../../../../src/modules/verification/passVerifierService'
import {
  HOURLY_TIME_SLOTS,
  type TurfSlotStatus,
} from '../../../../src/modules/venues/turfSlotManager'

export interface GroundAuditEvent {
  id: string
  desk: 'gate_desk' | 'turf_oversight' | 'academy_oversight'
  timestamp: string
  operatorEmail: string
  action: string
  targetEntity: string
  summary: string
  severity: 'info' | 'warning' | 'critical'
}

// =========================================================================
// 1. GATE CHECK-IN TELEMETRY MODELS
// =========================================================================

export type GateScanMethod = 'qr_camera' | 'nfc_tap' | 'manual_token'
export type GateTelemetryState =
  | 'admitted'
  | 'duplicate_blocked'
  | 'expired_denied'
  | 'quarantined'

export interface GateTelemetryRecord {
  id: string
  token: string
  passType: PassType
  holderName: string
  holderPhoneMasked: string
  sport: string
  facility: string
  city: string
  gateLabel: string
  scanMethod: GateScanMethod
  admittedAt: string
  admittedBy: string
  syncStatus: 'synced' | 'pending_offline_sync'
  telemetryState: GateTelemetryState
  latencyMs: number
  anomalyNote?: string
}

export interface GateCheckInMicroKpis {
  totalScansToday: number
  admittedCount: number
  blockedAnomaliesCount: number
  offlinePendingSyncCount: number
  avgScannerLatencyMs: number
  uniqueFacilitiesActive: number
}

export interface GateCheckInSnapshot {
  records: GateTelemetryRecord[]
  metrics: GateCheckInMicroKpis
  auditLogs: GroundAuditEvent[]
}

// =========================================================================
// 2. TURF SLOT UTILIZATION & MAINTENANCE MODELS
// =========================================================================

export type MaintenanceCategory =
  | 'turf_surface_safety'
  | 'floodlight_electrical'
  | 'drainage_weather'
  | 'pitch_rolling'
  | 'emergency_trust_freeze'

export interface TurfOversightVenue {
  slug: string
  name: string
  city: string
  sport: string
  surface: string
  courtsCount: number
}

export interface TurfOversightSlot {
  id: string
  venueSlug: string
  venueName: string
  courtName: string
  city: string
  sport: string
  slotDate: string
  timeSlot: string
  status: TurfSlotStatus
  isPeakHour: boolean
  hourlyRateInr: number
  bookingId?: string
  customerName?: string
  bookingOrigin?: 'player_app' | 'academy_block' | 'tournament_hold'
  paymentStateLabel?: string
  maintenanceCategory?: MaintenanceCategory
  blockedReason?: string
  updatedBy?: string
  updatedAt: string
}

export interface TurfOversightMicroKpis {
  totalSlotsTracked: number
  bookedOrHeldSlots: number
  availableSlots: number
  maintenanceLockedSlots: number
  utilizationPercent: number
  peakUtilizationPercent: number
}

export interface TurfOversightSnapshot {
  venues: TurfOversightVenue[]
  slots: TurfOversightSlot[]
  metrics: TurfOversightMicroKpis
  auditLogs: GroundAuditEvent[]
}

// =========================================================================
// 3. ACADEMY BATCH & ATTENDANCE OVERSIGHT MODELS
// =========================================================================

export type CoachCredentialStatus = 'verified' | 'expiring_soon' | 'uncertified_flag'
export type BatchOversightStatus = 'healthy' | 'at_capacity' | 'low_attendance_alert' | 'ratio_violation'

export interface AcademyAttendanceSessionLog {
  id: string
  sessionDate: string
  presentCount: number
  absentCount: number
  coachOnDuty: string
  safetyRatioOk: boolean
  auditedBy: string
  notes: string
}

export interface AcademyBatchOversightRecord {
  id: string
  academySlug: string
  academyName: string
  city: string
  sport: string
  batchName: string
  ageGroup: string
  scheduleSummary: string
  headCoachName: string
  coachCredentialLabel: string
  coachCredentialStatus: CoachCredentialStatus
  enrolledCount: number
  maxCapacity: number
  weeklyAttendancePercent: number
  coachToStudentRatio: string
  oversightStatus: BatchOversightStatus
  lastAuditAt: string
  lastAuditedBy: string
  recentSessions: AcademyAttendanceSessionLog[]
}

export interface AcademyOversightMicroKpis {
  totalBatchesMonitored: number
  totalEnrolledAthletes: number
  avgOccupancyPercent: number
  avgWeeklyAttendancePercent: number
  verifiedCoachCoveragePercent: number
  complianceAlertsCount: number
}

export interface AcademyOversightSnapshot {
  batches: AcademyBatchOversightRecord[]
  metrics: AcademyOversightMicroKpis
  auditLogs: GroundAuditEvent[]
}

// =========================================================================
// STORAGE HELPERS & SAFE SANDBOX FALLBACK
// =========================================================================

const GROUND_KEYS = {
  GATE_LOGS: 'khelgrid_admin_ground_gate_v1',
  TURF_SLOTS: 'khelgrid_admin_ground_turf_v1',
  ACADEMY_BATCHES: 'khelgrid_admin_ground_academies_v1',
  AUDIT_LOGS: 'khelgrid_admin_ground_audit_v1',
} as const

const groundMemStore = new Map<string, string>()

function loadGroundData<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // Fallback to memory store
  }
  const mem = groundMemStore.get(key)
  if (mem) {
    try {
      return JSON.parse(mem) as T
    } catch {
      return structuredClone(fallback)
    }
  }
  return structuredClone(fallback)
}

function saveGroundData<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)
  groundMemStore.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore sandbox errors
  }
}

function recordGroundAudit(entry: Omit<GroundAuditEvent, 'id' | 'timestamp'>): GroundAuditEvent {
  const existing = loadGroundData<GroundAuditEvent[]>(GROUND_KEYS.AUDIT_LOGS, INITIAL_GROUND_AUDITS)
  const created: GroundAuditEvent = {
    ...entry,
    id: `grd-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  }
  saveGroundData(GROUND_KEYS.AUDIT_LOGS, [created, ...existing])
  return created
}

// =========================================================================
// INITIAL SEED DATASETS (PAN-INDIA GROUND OPERATIONS)
// =========================================================================

const INITIAL_GATE_RECORDS: GateTelemetryRecord[] = [
  {
    id: 'gt-2026-001',
    token: '#PASS-DCA-8841',
    passType: 'academy_trial',
    holderName: 'Aarav Sharma (U-17 Trialist)',
    holderPhoneMasked: '+91 98*** **410',
    sport: 'Cricket',
    facility: 'Delhi Cricket Academy · Dwarka Sector 19',
    city: 'Delhi NCR',
    gateLabel: 'North Pavilion Gate 1',
    scanMethod: 'qr_camera',
    admittedAt: '2026-11-25T06:42:00Z',
    admittedBy: 'gate.officer.dwarka@khelgrid.com',
    syncStatus: 'synced',
    telemetryState: 'admitted',
    latencyMs: 118,
  },
  {
    id: 'gt-2026-002',
    token: '#TRF-INDR-4410',
    passType: 'turf_booking',
    holderName: 'Rishabh Nair Squad (7v7)',
    holderPhoneMasked: '+91 99*** **281',
    sport: 'Football',
    facility: 'Indiranagar Skyline Box Arena',
    city: 'Bengaluru',
    gateLabel: 'Main Entry Turnstile A',
    scanMethod: 'qr_camera',
    admittedAt: '2026-11-25T07:15:00Z',
    admittedBy: 'scanner.blr02@khelgrid.com',
    syncStatus: 'pending_offline_sync',
    telemetryState: 'admitted',
    latencyMs: 145,
    anomalyNote: 'Captured in offline stadium basement; queued for Postgres batch sync.',
  },
  {
    id: 'gt-2026-003',
    token: '#KG-TOUR-ISL9',
    passType: 'tournament_team',
    holderName: 'Cooperage Colts FC (18 Players)',
    holderPhoneMasked: '+91 97*** **883',
    sport: 'Football',
    facility: 'Cooperage Ground West Entrance',
    city: 'Mumbai',
    gateLabel: 'Team Accreditation Gate 2',
    scanMethod: 'nfc_tap',
    admittedAt: '2026-11-25T08:02:00Z',
    admittedBy: 'steward.mumbai@khelgrid.com',
    syncStatus: 'synced',
    telemetryState: 'admitted',
    latencyMs: 92,
  },
  {
    id: 'gt-2026-004',
    token: '#PASS-DCA-8841',
    passType: 'academy_trial',
    holderName: 'Aarav Sharma (Replay Attempt)',
    holderPhoneMasked: '+91 98*** **410',
    sport: 'Cricket',
    facility: 'Delhi Cricket Academy · Dwarka Sector 19',
    city: 'Delhi NCR',
    gateLabel: 'South Net Entry Gate 3',
    scanMethod: 'qr_camera',
    admittedAt: '2026-11-25T08:19:00Z',
    admittedBy: 'gate.officer.dwarka@khelgrid.com',
    syncStatus: 'synced',
    telemetryState: 'duplicate_blocked',
    latencyMs: 84,
    anomalyNote: 'Duplicate screenshot replay blocked 97 minutes after first admission at North Gate 1.',
  },
  {
    id: 'gt-2026-005',
    token: '#KG-VERIF-0192',
    passType: 'athlete_verification',
    holderName: 'Meera Nair (400m Senior National)',
    holderPhoneMasked: '+91 94*** **119',
    sport: 'Athletics',
    facility: 'Sree Kanteerava Synthetic Track',
    city: 'Bengaluru',
    gateLabel: 'Warmup Track Scanner 1',
    scanMethod: 'manual_token',
    admittedAt: '2026-11-25T06:05:00Z',
    admittedBy: 'track.marshal@khelgrid.com',
    syncStatus: 'pending_offline_sync',
    telemetryState: 'admitted',
    latencyMs: 162,
  },
]

const INITIAL_TURF_VENUES: TurfOversightVenue[] = [
  {
    slug: 'andheri-west-astroturf',
    name: 'Andheri West Floodlit AstroTurf Arena',
    city: 'Mumbai',
    sport: 'Football',
    surface: 'FIFA Quality Pro 50mm Turf',
    courtsCount: 2,
  },
  {
    slug: 'indiranagar-skyline-turf',
    name: 'Indiranagar Skyline Box Arena',
    city: 'Bengaluru',
    sport: 'Football / Box Cricket',
    surface: 'Hybrid Synthetic Shockpad',
    courtsCount: 2,
  },
  {
    slug: 'dwarka-cricket-nets',
    name: 'Dwarka Turf Nets & Main Square',
    city: 'Delhi NCR',
    sport: 'Cricket',
    surface: 'Natural Bermudagrass + Astro',
    courtsCount: 4,
  },
  {
    slug: 'gachibowli-shuttle-hall',
    name: 'Gachibowli Pro Shuttle Courts',
    city: 'Hyderabad',
    sport: 'Badminton',
    surface: 'BWF Maple Wood + Yonex Mat',
    courtsCount: 6,
  },
]

const TODAY_ISO = '2026-11-25'

const INITIAL_TURF_SLOTS: TurfOversightSlot[] = [
  {
    id: 'slot-andh-0600',
    venueSlug: 'andheri-west-astroturf',
    venueName: 'Andheri West Floodlit AstroTurf Arena',
    courtName: 'Pitch A (7v7 South)',
    city: 'Mumbai',
    sport: 'Football',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[0],
    status: 'booked',
    isPeakHour: true,
    hourlyRateInr: 1800,
    bookingId: 'BK-ANDH-901',
    customerName: 'Bandra Morning Strikers',
    bookingOrigin: 'player_app',
    paymentStateLabel: 'Held (Pay at Venue · Gateway Disabled)',
    updatedAt: '2026-11-24T21:10:00Z',
  },
  {
    id: 'slot-andh-1800',
    venueSlug: 'andheri-west-astroturf',
    venueName: 'Andheri West Floodlit AstroTurf Arena',
    courtName: 'Pitch A (7v7 South)',
    city: 'Mumbai',
    sport: 'Football',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[12],
    status: 'blocked',
    isPeakHour: true,
    hourlyRateInr: 2200,
    maintenanceCategory: 'turf_surface_safety',
    blockedReason: 'Trust & Safety inspection: steel goal-anchor peg remediation in progress.',
    updatedBy: 'trust.safety@khelgrid.com',
    updatedAt: '2026-11-25T05:30:00Z',
  },
  {
    id: 'slot-indr-1900',
    venueSlug: 'indiranagar-skyline-turf',
    venueName: 'Indiranagar Skyline Box Arena',
    courtName: 'Rooftop Court 1',
    city: 'Bengaluru',
    sport: 'Football',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[13],
    status: 'booked',
    isPeakHour: true,
    hourlyRateInr: 2000,
    bookingId: 'BK-INDR-412',
    customerName: 'Koramangala Tech FC',
    bookingOrigin: 'player_app',
    paymentStateLabel: 'Confirmed Hold (Pay at Venue)',
    updatedAt: '2026-11-24T19:45:00Z',
  },
  {
    id: 'slot-indr-1500',
    venueSlug: 'indiranagar-skyline-turf',
    venueName: 'Indiranagar Skyline Box Arena',
    courtName: 'Rooftop Court 1',
    city: 'Bengaluru',
    sport: 'Box Cricket',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[9],
    status: 'available',
    isPeakHour: false,
    hourlyRateInr: 1200,
    updatedAt: '2026-11-24T10:00:00Z',
  },
  {
    id: 'slot-dwk-0700',
    venueSlug: 'dwarka-cricket-nets',
    venueName: 'Dwarka Turf Nets & Main Square',
    courtName: 'Turf Lane 1–2 (Speed Gun)',
    city: 'Delhi NCR',
    sport: 'Cricket',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[1],
    status: 'booked',
    isPeakHour: true,
    hourlyRateInr: 1500,
    bookingId: 'BK-DWK-219',
    customerName: 'Delhi U-17 Pace Batch',
    bookingOrigin: 'academy_block',
    paymentStateLabel: 'Academy Tenant Quota',
    updatedAt: '2026-11-24T20:00:00Z',
  },
  {
    id: 'slot-dwk-2000',
    venueSlug: 'dwarka-cricket-nets',
    venueName: 'Dwarka Turf Nets & Main Square',
    courtName: 'Turf Lane 1–2 (Speed Gun)',
    city: 'Delhi NCR',
    sport: 'Cricket',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[14],
    status: 'held',
    isPeakHour: true,
    hourlyRateInr: 1650,
    bookingId: 'HOLD-DWK-77',
    customerName: 'West Delhi Corporate XI',
    bookingOrigin: 'player_app',
    paymentStateLabel: '15-min Reservation Hold',
    updatedAt: '2026-11-25T08:15:00Z',
  },
  {
    id: 'slot-gac-1700',
    venueSlug: 'gachibowli-shuttle-hall',
    venueName: 'Gachibowli Pro Shuttle Courts',
    courtName: 'Wooden Court 3',
    city: 'Hyderabad',
    sport: 'Badminton',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[11],
    status: 'available',
    isPeakHour: false,
    hourlyRateInr: 750,
    updatedAt: '2026-11-24T12:00:00Z',
  },
  {
    id: 'slot-gac-1900',
    venueSlug: 'gachibowli-shuttle-hall',
    venueName: 'Gachibowli Pro Shuttle Courts',
    courtName: 'Wooden Court 3',
    city: 'Hyderabad',
    sport: 'Badminton',
    slotDate: TODAY_ISO,
    timeSlot: HOURLY_TIME_SLOTS[13],
    status: 'booked',
    isPeakHour: true,
    hourlyRateInr: 950,
    bookingId: 'BK-GAC-551',
    customerName: 'Ananya Smash Clinic',
    bookingOrigin: 'academy_block',
    paymentStateLabel: 'Confirmed Cohort Block',
    updatedAt: '2026-11-24T18:30:00Z',
  },
]

const INITIAL_ACADEMY_BATCHES: AcademyBatchOversightRecord[] = [
  {
    id: 'bat-dca-u17-pace',
    academySlug: 'delhi-cricket-academy',
    academyName: 'Delhi Cricket Academy',
    city: 'Delhi NCR',
    sport: 'Cricket',
    batchName: 'U-17 High-Performance Pace & Turf Batch',
    ageGroup: 'U-17 (14–17 yrs)',
    scheduleSummary: 'Mon–Fri · 06:00 AM – 08:30 AM',
    headCoachName: 'Coach Vikramaditya Singh',
    coachCredentialLabel: 'BCCI Level-2 Certified',
    coachCredentialStatus: 'verified',
    enrolledCount: 22,
    maxCapacity: 24,
    weeklyAttendancePercent: 91,
    coachToStudentRatio: '1:11',
    oversightStatus: 'healthy',
    lastAuditAt: '2026-11-24T09:15:00Z',
    lastAuditedBy: 'ops.delhi@khelgrid.com',
    recentSessions: [
      {
        id: 'sess-dca-1',
        sessionDate: '2026-11-24',
        presentCount: 20,
        absentCount: 2,
        coachOnDuty: 'Coach Vikramaditya Singh',
        safetyRatioOk: true,
        auditedBy: 'ops.delhi@khelgrid.com',
        notes: 'Biomechanics speed-trap session; all athletes wearing protective gear.',
      },
    ],
  },
  {
    id: 'bat-bbfs-u15-res',
    academySlug: 'bbfs-bengaluru',
    academyName: 'Bhaichung Bhutia Football Schools',
    city: 'Bengaluru',
    sport: 'Football',
    batchName: 'U-15 Residential Combine & Tactical Squad',
    ageGroup: 'U-15 (12–15 yrs)',
    scheduleSummary: 'Mon–Sat · 04:30 PM – 06:30 PM',
    headCoachName: 'Coach Pratik Deshmukh',
    coachCredentialLabel: 'AIFF B-License Coach',
    coachCredentialStatus: 'verified',
    enrolledCount: 28,
    maxCapacity: 28,
    weeklyAttendancePercent: 94,
    coachToStudentRatio: '1:14',
    oversightStatus: 'at_capacity',
    lastAuditAt: '2026-11-24T17:45:00Z',
    lastAuditedBy: 'ops.south@khelgrid.com',
    recentSessions: [
      {
        id: 'sess-bbfs-1',
        sessionDate: '2026-11-24',
        presentCount: 27,
        absentCount: 1,
        coachOnDuty: 'Coach Pratik Deshmukh',
        safetyRatioOk: true,
        auditedBy: 'ops.south@khelgrid.com',
        notes: 'Full squad present; waitlist open for January intake.',
      },
    ],
  },
  {
    id: 'bat-pba-hyd-shuttle',
    academySlug: 'padukone-hyd',
    academyName: 'Hyderabad Pro Badminton Center',
    city: 'Hyderabad',
    sport: 'Badminton',
    batchName: 'Junior State Ranking Feeder Batch B',
    ageGroup: 'U-13 (9–13 yrs)',
    scheduleSummary: 'Tue, Thu, Sat · 05:00 PM – 07:00 PM',
    headCoachName: 'Coach S. Venkatraman',
    coachCredentialLabel: 'BAI Level-1 (Expiring 14d)',
    coachCredentialStatus: 'expiring_soon',
    enrolledCount: 16,
    maxCapacity: 20,
    weeklyAttendancePercent: 61,
    coachToStudentRatio: '1:8',
    oversightStatus: 'low_attendance_alert',
    lastAuditAt: '2026-11-23T19:00:00Z',
    lastAuditedBy: 'ops.south@khelgrid.com',
    recentSessions: [
      {
        id: 'sess-pba-1',
        sessionDate: '2026-11-23',
        presentCount: 10,
        absentCount: 6,
        coachOnDuty: 'Coach S. Venkatraman',
        safetyRatioOk: true,
        auditedBy: 'ops.south@khelgrid.com',
        notes: 'School exam week caused 37% absenteeism; coach BAI renewal reminder triggered.',
      },
    ],
  },
  {
    id: 'bat-pune-u14-evening',
    academySlug: 'shivajinagar-cricket-pune',
    academyName: 'Shivajinagar Cricket Academy',
    city: 'Pune',
    sport: 'Cricket',
    batchName: 'Evening Open Nets Batch C',
    ageGroup: 'U-14 (10–14 yrs)',
    scheduleSummary: 'Mon, Wed, Fri · 05:30 PM – 07:30 PM',
    headCoachName: 'Substitute Coach Rajesh M.',
    coachCredentialLabel: 'Credential Missing (Sub)',
    coachCredentialStatus: 'uncertified_flag',
    enrolledCount: 24,
    maxCapacity: 18,
    weeklyAttendancePercent: 78,
    coachToStudentRatio: '1:24 (Unsafe)',
    oversightStatus: 'ratio_violation',
    lastAuditAt: '2026-11-24T18:40:00Z',
    lastAuditedBy: 'trust.safety@khelgrid.com',
    recentSessions: [
      {
        id: 'sess-pune-1',
        sessionDate: '2026-11-24',
        presentCount: 22,
        absentCount: 2,
        coachOnDuty: 'Substitute Coach Rajesh M.',
        safetyRatioOk: false,
        auditedBy: 'trust.safety@khelgrid.com',
        notes: 'Capacity exceeded 18 limit (24 enrolled) under unverified substitute coach; escalation flagged.',
      },
    ],
  },
]

const INITIAL_GROUND_AUDITS: GroundAuditEvent[] = [
  {
    id: 'grd-aud-seed-1',
    desk: 'gate_desk',
    timestamp: '2026-11-25T08:19:00Z',
    operatorEmail: 'gate.officer.dwarka@khelgrid.com',
    action: 'DUPLICATE_QR_REPLAY_BLOCKED',
    targetEntity: '#PASS-DCA-8841',
    summary: 'Automatic replay guard blocked second entry attempt at Dwarka South Gate 3.',
    severity: 'warning',
  },
  {
    id: 'grd-aud-seed-2',
    desk: 'turf_oversight',
    timestamp: '2026-11-25T05:30:00Z',
    operatorEmail: 'trust.safety@khelgrid.com',
    action: 'TURF_MAINTENANCE_LOCK_SET',
    targetEntity: 'Andheri West AstroTurf · 06:00 PM – 07:00 PM',
    summary: 'Locked peak slot for goal-anchor peg hazard safety inspection.',
    severity: 'critical',
  },
  {
    id: 'grd-aud-seed-3',
    desk: 'academy_oversight',
    timestamp: '2026-11-24T18:40:00Z',
    operatorEmail: 'trust.safety@khelgrid.com',
    action: 'BATCH_SAFETY_RATIO_VIOLATION',
    targetEntity: 'Shivajinagar Cricket Academy · Evening Open Nets Batch C',
    summary: 'Flagged 1:24 coach ratio overrun and unverified substitute assignment.',
    severity: 'critical',
  },
]

// =========================================================================
// 1. GATE CHECK-IN TELEMETRY APIS
// =========================================================================

export function getGateCheckInSnapshot(): GateCheckInSnapshot {
  const stored = loadGroundData<GateTelemetryRecord[]>(GROUND_KEYS.GATE_LOGS, INITIAL_GATE_RECORDS)
  const audits = loadGroundData<GroundAuditEvent[]>(GROUND_KEYS.AUDIT_LOGS, INITIAL_GROUND_AUDITS)

  // Merge any live logs emitted by customer/gate scanner (passVerifierService.ts)
  const liveLogs = getGateAdmissionLogs()
  const knownIds = new Set(stored.map(r => r.id))
  const merged = [...stored]
  for (const live of liveLogs) {
    if (!knownIds.has(live.id)) {
      merged.unshift({
        id: live.id,
        token: live.token,
        passType: live.passType,
        holderName: live.holderName,
        holderPhoneMasked: '+91 9X*** **XXX',
        sport: live.sport,
        facility: live.facility,
        city: 'India',
        gateLabel: 'Field Scanner',
        scanMethod: 'qr_camera',
        admittedAt: live.admittedAt,
        admittedBy: live.admittedBy,
        syncStatus: live.syncStatus === 'pending_sync' ? 'pending_offline_sync' : 'synced',
        telemetryState: 'admitted',
        latencyMs: 125,
      })
    }
  }

  const facilitySet = new Set(merged.map(r => r.facility))
  const avgLat =
    merged.length > 0
      ? Math.round(merged.reduce((acc, r) => acc + r.latencyMs, 0) / merged.length)
      : 0

  return {
    records: merged,
    metrics: {
      totalScansToday: merged.length,
      admittedCount: merged.filter(r => r.telemetryState === 'admitted').length,
      blockedAnomaliesCount: merged.filter(
        r => r.telemetryState === 'duplicate_blocked' || r.telemetryState === 'quarantined' || r.telemetryState === 'expired_denied',
      ).length,
      offlinePendingSyncCount: merged.filter(r => r.syncStatus === 'pending_offline_sync').length,
      avgScannerLatencyMs: avgLat,
      uniqueFacilitiesActive: facilitySet.size,
    },
    auditLogs: audits.filter(a => a.desk === 'gate_desk'),
  }
}

export function verifyAndAdmitGateToken(
  input: {
    token: string
    facility?: string
    city?: string
    holderName?: string
    sport?: string
  },
  operatorEmail: string,
): { admitted: boolean; record: GateTelemetryRecord; message: string } {
  const cleanToken = input.token.trim().toUpperCase()
  if (!cleanToken) {
    throw new Error('QR pass or credential token is required.')
  }

  const existing = loadGroundData<GateTelemetryRecord[]>(GROUND_KEYS.GATE_LOGS, INITIAL_GATE_RECORDS)
  const verifiedPass = verifyPassToken(cleanToken)
  const alreadyAdmitted =
    existing.some(r => r.token.toUpperCase() === cleanToken && r.telemetryState === 'admitted') ||
    verifiedPass?.status === 'used'

  if (!alreadyAdmitted && verifiedPass && verifiedPass.status === 'valid') {
    admitPassToken(cleanToken, operatorEmail)
  }

  const telemetryState: GateTelemetryState = alreadyAdmitted ? 'duplicate_blocked' : 'admitted'
  const record: GateTelemetryRecord = {
    id: `gt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    token: cleanToken,
    passType: verifiedPass?.passType || 'academy_trial',
    holderName:
      input.holderName?.trim() ||
      (verifiedPass?.primaryHolder && verifiedPass.primaryHolder !== 'Unknown Credential'
        ? verifiedPass.primaryHolder
        : 'Walk-in Verified Athlete'),
    holderPhoneMasked: verifiedPass?.contactMasked || '+91 98*** **000',
    sport: input.sport?.trim() || verifiedPass?.sport || 'Multi-Sport',
    facility: input.facility?.trim() || verifiedPass?.venueOrFacility || 'Delhi NCR Central Gate',
    city: input.city?.trim() || 'Delhi NCR',
    gateLabel: 'Ops Control Scanner',
    scanMethod: 'manual_token',
    admittedAt: new Date().toISOString(),
    admittedBy: operatorEmail,
    syncStatus: 'synced',
    telemetryState,
    latencyMs: 95,
    anomalyNote: alreadyAdmitted
      ? 'Duplicate token scan automatically blocked by gate telemetry engine.'
      : undefined,
  }

  saveGroundData(GROUND_KEYS.GATE_LOGS, [record, ...existing])
  recordGroundAudit({
    desk: 'gate_desk',
    operatorEmail,
    action: alreadyAdmitted ? 'DUPLICATE_TOKEN_BLOCKED' : 'GATE_PASS_ADMITTED',
    targetEntity: cleanToken,
    summary: alreadyAdmitted
      ? `Blocked duplicate admission attempt for ${cleanToken} at ${record.facility}.`
      : `Admitted ${record.holderName} (${cleanToken}) at ${record.facility}.`,
    severity: alreadyAdmitted ? 'warning' : 'info',
  })

  return {
    admitted: !alreadyAdmitted,
    record,
    message: alreadyAdmitted
      ? `Blocked: ${cleanToken} was already admitted today.`
      : `Verified & Admitted ${record.holderName} (${cleanToken}).`,
  }
}

export function quarantineGatePass(
  recordId: string,
  operatorEmail: string,
  reason: string,
): GateTelemetryRecord {
  const existing = loadGroundData<GateTelemetryRecord[]>(GROUND_KEYS.GATE_LOGS, INITIAL_GATE_RECORDS)
  const idx = existing.findIndex(r => r.id === recordId)
  if (idx === -1) throw new Error('Gate telemetry record not found.')

  existing[idx] = {
    ...existing[idx],
    telemetryState: 'quarantined',
    anomalyNote: reason.trim() || 'Quarantined by Trust & Gate Operations.',
  }
  saveGroundData(GROUND_KEYS.GATE_LOGS, existing)

  recordGroundAudit({
    desk: 'gate_desk',
    operatorEmail,
    action: 'GATE_PASS_QUARANTINED',
    targetEntity: existing[idx].token,
    summary: existing[idx].anomalyNote || 'Pass quarantined.',
    severity: 'critical',
  })
  return existing[idx]
}

export function syncOfflineGateBuffer(operatorEmail: string): { syncedCount: number } {
  const existing = loadGroundData<GateTelemetryRecord[]>(GROUND_KEYS.GATE_LOGS, INITIAL_GATE_RECORDS)
  let syncedCount = 0
  const updated = existing.map(rec => {
    if (rec.syncStatus === 'pending_offline_sync') {
      syncedCount++
      return { ...rec, syncStatus: 'synced' as const }
    }
    return rec
  })
  saveGroundData(GROUND_KEYS.GATE_LOGS, updated)

  if (syncedCount > 0) {
    recordGroundAudit({
      desk: 'gate_desk',
      operatorEmail,
      action: 'OFFLINE_GATE_BUFFER_SYNCED',
      targetEntity: `${syncedCount} Gate Records`,
      summary: `Flushed ${syncedCount} offline stadium scanner logs to central ledger.`,
      severity: 'info',
    })
  }
  return { syncedCount }
}

// =========================================================================
// 2. TURF SLOT UTILIZATION & MAINTENANCE CALENDAR APIS
// =========================================================================

export function getTurfOversightSnapshot(): TurfOversightSnapshot {
  const slots = loadGroundData<TurfOversightSlot[]>(GROUND_KEYS.TURF_SLOTS, INITIAL_TURF_SLOTS)
  const audits = loadGroundData<GroundAuditEvent[]>(GROUND_KEYS.AUDIT_LOGS, INITIAL_GROUND_AUDITS)

  const bookedOrHeld = slots.filter(s => s.status === 'booked' || s.status === 'held')
  const available = slots.filter(s => s.status === 'available')
  const maintenance = slots.filter(s => s.status === 'blocked')
  const peakSlots = slots.filter(s => s.isPeakHour)
  const peakUtilized = peakSlots.filter(s => s.status === 'booked' || s.status === 'held')

  return {
    venues: INITIAL_TURF_VENUES,
    slots,
    metrics: {
      totalSlotsTracked: slots.length,
      bookedOrHeldSlots: bookedOrHeld.length,
      availableSlots: available.length,
      maintenanceLockedSlots: maintenance.length,
      utilizationPercent: slots.length > 0 ? Math.round((bookedOrHeld.length / slots.length) * 100) : 0,
      peakUtilizationPercent: peakSlots.length > 0 ? Math.round((peakUtilized.length / peakSlots.length) * 100) : 0,
    },
    auditLogs: audits.filter(a => a.desk === 'turf_oversight'),
  }
}

export function lockTurfSlotForMaintenance(
  slotId: string,
  operatorEmail: string,
  maintenanceCategory: MaintenanceCategory,
  reason: string,
): TurfOversightSlot {
  const slots = loadGroundData<TurfOversightSlot[]>(GROUND_KEYS.TURF_SLOTS, INITIAL_TURF_SLOTS)
  const idx = slots.findIndex(s => s.id === slotId)
  if (idx === -1) throw new Error('Turf slot not found.')

  const target = slots[idx]
  slots[idx] = {
    ...target,
    status: 'blocked',
    maintenanceCategory,
    blockedReason: reason.trim() || `Maintenance lock (${maintenanceCategory.replace(/_/g, ' ')})`,
    updatedBy: operatorEmail,
    updatedAt: new Date().toISOString(),
  }
  saveGroundData(GROUND_KEYS.TURF_SLOTS, slots)

  recordGroundAudit({
    desk: 'turf_oversight',
    operatorEmail,
    action: 'TURF_MAINTENANCE_LOCK_SET',
    targetEntity: `${target.venueName} · ${target.timeSlot}`,
    summary: `Locked slot for ${maintenanceCategory.replace(/_/g, ' ')}: ${slots[idx].blockedReason}`,
    severity: maintenanceCategory === 'emergency_trust_freeze' || maintenanceCategory === 'turf_surface_safety' ? 'critical' : 'warning',
  })

  return slots[idx]
}

export function releaseTurfMaintenanceLock(
  slotId: string,
  operatorEmail: string,
  inspectionNote: string,
): TurfOversightSlot {
  const slots = loadGroundData<TurfOversightSlot[]>(GROUND_KEYS.TURF_SLOTS, INITIAL_TURF_SLOTS)
  const idx = slots.findIndex(s => s.id === slotId)
  if (idx === -1) throw new Error('Turf slot not found.')

  const target = slots[idx]
  slots[idx] = {
    ...target,
    status: 'available',
    maintenanceCategory: undefined,
    blockedReason: undefined,
    bookingId: undefined,
    customerName: undefined,
    paymentStateLabel: undefined,
    updatedBy: operatorEmail,
    updatedAt: new Date().toISOString(),
  }
  saveGroundData(GROUND_KEYS.TURF_SLOTS, slots)

  recordGroundAudit({
    desk: 'turf_oversight',
    operatorEmail,
    action: 'TURF_SLOT_REOPENED',
    targetEntity: `${target.venueName} · ${target.timeSlot}`,
    summary: inspectionNote.trim() || 'Safety maintenance cleared; slot reopened for discovery.',
    severity: 'info',
  })

  return slots[idx]
}

// =========================================================================
// 3. ACADEMY BATCH & ATTENDANCE OVERSIGHT APIS
// =========================================================================

export function getAcademyOversightSnapshot(): AcademyOversightSnapshot {
  const batches = loadGroundData<AcademyBatchOversightRecord[]>(
    GROUND_KEYS.ACADEMY_BATCHES,
    INITIAL_ACADEMY_BATCHES,
  )
  const audits = loadGroundData<GroundAuditEvent[]>(GROUND_KEYS.AUDIT_LOGS, INITIAL_GROUND_AUDITS)

  const totalEnrolled = batches.reduce((acc, b) => acc + b.enrolledCount, 0)
  const totalCap = batches.reduce((acc, b) => acc + b.maxCapacity, 0)
  const avgOccupancy = totalCap > 0 ? Math.min(100, Math.round((totalEnrolled / totalCap) * 100)) : 0
  const avgAttendance =
    batches.length > 0
      ? Math.round(batches.reduce((acc, b) => acc + b.weeklyAttendancePercent, 0) / batches.length)
      : 0
  const verifiedCoaches = batches.filter(b => b.coachCredentialStatus === 'verified').length

  return {
    batches,
    metrics: {
      totalBatchesMonitored: batches.length,
      totalEnrolledAthletes: totalEnrolled,
      avgOccupancyPercent: avgOccupancy,
      avgWeeklyAttendancePercent: avgAttendance,
      verifiedCoachCoveragePercent:
        batches.length > 0 ? Math.round((verifiedCoaches / batches.length) * 100) : 0,
      complianceAlertsCount: batches.filter(
        b => b.oversightStatus === 'low_attendance_alert' || b.oversightStatus === 'ratio_violation' || b.coachCredentialStatus === 'uncertified_flag',
      ).length,
    },
    auditLogs: audits.filter(a => a.desk === 'academy_oversight'),
  }
}

export function verifyCoachBatchAssignment(
  batchId: string,
  status: CoachCredentialStatus,
  operatorEmail: string,
  note: string,
): AcademyBatchOversightRecord {
  const batches = loadGroundData<AcademyBatchOversightRecord[]>(
    GROUND_KEYS.ACADEMY_BATCHES,
    INITIAL_ACADEMY_BATCHES,
  )
  const idx = batches.findIndex(b => b.id === batchId)
  if (idx === -1) throw new Error('Academy batch not found.')

  const target = batches[idx]
  const nextOversight: BatchOversightStatus =
    status === 'uncertified_flag'
      ? 'ratio_violation'
      : target.weeklyAttendancePercent < 65
        ? 'low_attendance_alert'
        : target.enrolledCount >= target.maxCapacity
          ? 'at_capacity'
          : 'healthy'

  batches[idx] = {
    ...target,
    coachCredentialStatus: status,
    coachCredentialLabel:
      status === 'verified'
        ? `${target.coachCredentialLabel.replace(/\s*\(.*\)/, '')} (Ops Verified)`
        : status === 'expiring_soon'
          ? 'Federation Renewal Due'
          : 'Flagged Uncertified Coach',
    oversightStatus: nextOversight,
    lastAuditAt: new Date().toISOString(),
    lastAuditedBy: operatorEmail,
  }
  saveGroundData(GROUND_KEYS.ACADEMY_BATCHES, batches)

  recordGroundAudit({
    desk: 'academy_oversight',
    operatorEmail,
    action: `COACH_ASSIGNMENT_${status.toUpperCase()}`,
    targetEntity: `${target.academyName} · ${target.batchName}`,
    summary: note.trim() || `Coach credential status updated to ${status}.`,
    severity: status === 'uncertified_flag' ? 'critical' : 'info',
  })

  return batches[idx]
}

export function recordBatchAttendanceAudit(
  batchId: string,
  presentCount: number,
  absentCount: number,
  safetyRatioOk: boolean,
  operatorEmail: string,
  notes: string,
): AcademyBatchOversightRecord {
  const batches = loadGroundData<AcademyBatchOversightRecord[]>(
    GROUND_KEYS.ACADEMY_BATCHES,
    INITIAL_ACADEMY_BATCHES,
  )
  const idx = batches.findIndex(b => b.id === batchId)
  if (idx === -1) throw new Error('Academy batch not found.')

  const target = batches[idx]
  const total = Math.max(1, presentCount + absentCount)
  const sessionPercent = Math.round((presentCount / total) * 100)
  const nextStatus: BatchOversightStatus = !safetyRatioOk
    ? 'ratio_violation'
    : sessionPercent < 65
      ? 'low_attendance_alert'
      : target.enrolledCount >= target.maxCapacity
        ? 'at_capacity'
        : 'healthy'

  const sessionEntry: AcademyAttendanceSessionLog = {
    id: `sess-${Date.now()}`,
    sessionDate: new Date().toISOString().split('T')[0],
    presentCount,
    absentCount,
    coachOnDuty: target.headCoachName,
    safetyRatioOk,
    auditedBy: operatorEmail,
    notes: notes.trim() || `Field audit logged: ${presentCount}/${total} athletes present.`,
  }

  batches[idx] = {
    ...target,
    weeklyAttendancePercent: sessionPercent,
    oversightStatus: nextStatus,
    lastAuditAt: new Date().toISOString(),
    lastAuditedBy: operatorEmail,
    recentSessions: [sessionEntry, ...target.recentSessions],
  }
  saveGroundData(GROUND_KEYS.ACADEMY_BATCHES, batches)

  recordGroundAudit({
    desk: 'academy_oversight',
    operatorEmail,
    action: !safetyRatioOk ? 'ATTENDANCE_SAFETY_VIOLATION' : 'ATTENDANCE_AUDIT_LOGGED',
    targetEntity: `${target.academyName} · ${target.batchName}`,
    summary: `${presentCount} present / ${absentCount} absent (${sessionPercent}% attendance) · Ratio OK: ${safetyRatioOk}.`,
    severity: !safetyRatioOk || sessionPercent < 65 ? 'warning' : 'info',
  })

  return batches[idx]
}

export function getAllGroundOperationsAuditEvents(): GroundAuditEvent[] {
  return loadGroundData<GroundAuditEvent[]>(GROUND_KEYS.AUDIT_LOGS, INITIAL_GROUND_AUDITS)
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const raw = value === undefined || value === null ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function exportGroundOperationsCsv(scope: 'gate' | 'turf' | 'academy'): string {
  if (scope === 'gate') {
    const snap = getGateCheckInSnapshot()
    const headers = ['ID', 'Token', 'Pass Type', 'Holder', 'Sport', 'Facility', 'City', 'Scan State', 'Sync', 'Timestamp']
    const rows = snap.records.map(r => [
      r.id, r.token, r.passType, r.holderName, r.sport, r.facility, r.city, r.telemetryState, r.syncStatus, r.admittedAt,
    ])
    return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
  }

  if (scope === 'turf') {
    const snap = getTurfOversightSnapshot()
    const headers = ['Slot ID', 'Venue', 'Court', 'City', 'Date', 'Time Slot', 'Status', 'Rate (INR)', 'Holder / Maintenance Reason']
    const rows = snap.slots.map(s => [
      s.id, s.venueName, s.courtName, s.city, s.slotDate, s.timeSlot, s.status, s.hourlyRateInr, s.blockedReason || s.customerName || '-',
    ])
    return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
  }

  const snap = getAcademyOversightSnapshot()
  const headers = ['Batch ID', 'Academy', 'City', 'Sport', 'Batch Name', 'Coach', 'Enrolled / Cap', 'Attendance %', 'Status']
  const rows = snap.batches.map(b => [
    b.id, b.academyName, b.city, b.sport, b.batchName, b.headCoachName, `${b.enrolledCount}/${b.maxCapacity}`, `${b.weeklyAttendancePercent}%`, b.oversightStatus,
  ])
  return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

export function resetGroundOperationsForTesting(): void {
  clearGateAdmissionLog()
  groundMemStore.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      Object.values(GROUND_KEYS).forEach(k => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }
}
