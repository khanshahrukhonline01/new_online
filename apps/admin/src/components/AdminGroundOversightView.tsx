import { SiteIcon } from '../../../../src/shared/components/SiteIcon'

export type GroundDeskTab = 'gate' | 'turf' | 'academy' | 'fraud'

export interface AdminGroundOversightViewProps {
  initialDesk?: GroundDeskTab
}

const DESK_METADATA: Record<
  GroundDeskTab,
  { title: string; plannedPhase: string; summary: string }
> = {
  gate: {
    title: 'Universal Gate Check-In Oversight',
    plannedPhase: 'Phase 5 — Server-Backed Verification & Ground Operations',
    summary:
      'Browser-local check-in logs have been disabled. Gate admission oversight will be enabled once server-backed PostgreSQL tables, RLS policies, and immutable audit logs are implemented and verified.',
  },
  turf: {
    title: 'Turf & Venue Slot Oversight',
    plannedPhase: 'Phase 5 — Server-Backed Verification & Ground Operations',
    summary:
      'Client-side localStorage booking views have been disabled. Venue and slot oversight requires server-enforced organisation isolation and audited database RPCs.',
  },
  academy: {
    title: 'Academy & Coach Verification Oversight',
    plannedPhase: 'Phase 4–5 — Organisation & Verification Governance',
    summary:
      'Client-side academy and coach verification toggles have been disabled to prevent unaudited browser-local state mutations. Use the Listing & Evidence Desk for database-backed listing verification.',
  },
  fraud: {
    title: 'Trust, Safety & Dispute Claims',
    plannedPhase: 'Phase 7 — Platform Security, Audit & Incident Control',
    summary:
      'Dispute and incident case management is not yet connected to a server-backed database schema. No simulated alerts or fabricated scores are displayed.',
  },
}

/**
 * Honest fail-closed placeholder for operational desks that previously relied on
 * unauthenticated browser localStorage state. Zero localStorage reads or writes occur here.
 */
export function AdminGroundOversightView({ initialDesk = 'academy' }: AdminGroundOversightViewProps) {
  const meta = DESK_METADATA[initialDesk] || DESK_METADATA.academy

  return (
    <section className="admin-unavailable-desk" aria-labelledby="admin-unavailable-title">
      <div className="admin-unavailable-card">
        <div className="admin-unavailable-icon">
          <SiteIcon name="shield-check" size={28} />
        </div>
        <p className="admin-gate-eyebrow">MODULE STATUS · UNAVAILABLE</p>
        <h2 id="admin-unavailable-title">{meta.title}</h2>
        <p className="admin-unavailable-desc">{meta.summary}</p>
        <div className="admin-unavailable-meta">
          <span>
            <strong>Target milestone:</strong> {meta.plannedPhase}
          </span>
          <span>
            <strong>Data policy:</strong> Client-side localStorage mutations are prohibited for administrative governance.
          </span>
        </div>
      </div>
    </section>
  )
}
