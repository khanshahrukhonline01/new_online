import { useState, useMemo } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import { getGateAdmissionLogs } from '../../../../src/modules/verification/passVerifierService'
import { getAllTurfBookings } from '../../../../src/modules/venues/turfSlotManager'
import {
  getRegisteredAcademies,
  getAllAcademyTrialPasses,
  confirmAndVerifyAcademy,
  revokeAcademyVerification,
} from '../../../../src/modules/academies/academySaaSClient'
import {
  getRegisteredCoaches,
  confirmAndVerifyCoach,
  revokeCoachVerification,
} from '../../../../src/modules/coaches/coachSaaSClient'

export interface AdminGroundOversightViewProps {
  initialDesk?: 'gate' | 'turf' | 'academy' | 'coach'
}

export function AdminGroundOversightView({ initialDesk = 'gate' }: AdminGroundOversightViewProps) {
  const [activeSubDesk, setActiveSubDesk] = useState<'gate' | 'turf' | 'academy' | 'coach'>(initialDesk)
  const [gateFilter, setGateFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load real-time data from platform stores
  const gateLogs = useMemo(() => getGateAdmissionLogs(), [])
  const turfBookings = useMemo(() => getAllTurfBookings(), [])
  const academies = useMemo(() => getRegisteredAcademies(), [refreshTrigger])
  const academyPasses = useMemo(() => getAllAcademyTrialPasses(), [])
  const coaches = useMemo(() => getRegisteredCoaches(), [refreshTrigger])

  // Filtered gate logs
  const filteredGateLogs = useMemo(() => {
    return gateLogs.filter(log => {
      if (gateFilter !== 'all' && log.passType !== gateFilter) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          log.token.toLowerCase().includes(q) ||
          log.holderName.toLowerCase().includes(q) ||
          log.facility.toLowerCase().includes(q) ||
          log.admittedBy.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [gateLogs, gateFilter, searchTerm])

  return (
    <div className="admin-ground-oversight-container">
      {/* Sub-Desk Navigation Pills */}
      <div className="admin-ground-nav-bar">
        <div className="admin-ground-tab-group">
          <button
            type="button"
            className={`admin-ground-tab-btn ${activeSubDesk === 'gate' ? 'is-active' : ''}`}
            onClick={() => setActiveSubDesk('gate')}
          >
            <SiteIcon name="shield-check" size={16} />
            <span>Gate Check-In Audit Logs ({gateLogs.length})</span>
          </button>
          <button
            type="button"
            className={`admin-ground-tab-btn ${activeSubDesk === 'turf' ? 'is-active' : ''}`}
            onClick={() => setActiveSubDesk('turf')}
          >
            <SiteIcon name="calendar" size={16} />
            <span>Turf Bookings &amp; Slot Holds ({turfBookings.length})</span>
          </button>
          <button
            type="button"
            className={`admin-ground-tab-btn ${activeSubDesk === 'academy' ? 'is-active' : ''}`}
            onClick={() => setActiveSubDesk('academy')}
          >
            <SiteIcon name="building" size={16} />
            <span>Academy SaaS &amp; Trial Passes ({academies.length})</span>
          </button>
          <button
            type="button"
            className={`admin-ground-tab-btn ${activeSubDesk === 'coach' ? 'is-active' : ''}`}
            onClick={() => setActiveSubDesk('coach')}
          >
            <SiteIcon name="award" size={16} />
            <span>Coach SaaS &amp; NIS Reviews ({coaches.length})</span>
          </button>
        </div>

        <div className="admin-ground-actions">
          <a
            href="/gate-checkin"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-ground-btn outline"
          >
            <SiteIcon name="external-link" size={14} />
            <span>Launch Gate Scanner App</span>
          </a>
        </div>
      </div>

      {/* SUB-DESK 1: GATE ADMISSION AUDIT LOGS */}
      {activeSubDesk === 'gate' && (
        <section className="admin-ground-section">
          <header className="admin-ground-header">
            <div>
              <h3>Universal Gate Check-In &amp; Pass Verification Stream</h3>
              <p>Real-time audit log of all athletes, squads, and turf booking captains admitted on ground.</p>
            </div>
            <div className="admin-ground-filter-row">
              <input
                type="text"
                placeholder="Search token, athlete, facility, or gatekeeper…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="admin-ground-search-input"
              />
              <select
                value={gateFilter}
                onChange={e => setGateFilter(e.target.value)}
                className="admin-ground-select"
              >
                <option value="all">All Pass Types</option>
                <option value="academy_trial">Academy Trial Passes (#PASS)</option>
                <option value="turf_booking">Turf Vouchers (#TRF)</option>
                <option value="tournament_team">Tournament Match Passes (#KG-TOUR)</option>
                <option value="athlete_verification">Athlete Credentials (#KG-VERIF)</option>
              </select>
            </div>
          </header>

          <div className="admin-ground-table-card">
            <table className="admin-ground-table">
              <thead>
                <tr>
                  <th>Pass Token</th>
                  <th>Pass Type</th>
                  <th>Holder Name</th>
                  <th>Sport</th>
                  <th>Facility / Ground</th>
                  <th>Admitted Time</th>
                  <th>Gatekeeper / Marshal</th>
                </tr>
              </thead>
              <tbody>
                {filteredGateLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-ground-empty-td">
                      <SiteIcon name="shield-check" size={28} />
                      <p>No on-ground admissions recorded yet. Passes verified at /gate-checkin appear here instantly.</p>
                    </td>
                  </tr>
                ) : (
                  filteredGateLogs.map(item => (
                    <tr key={item.id}>
                      <td>
                        <code className="admin-ground-token-badge">{item.token}</code>
                      </td>
                      <td>
                        <span className={`admin-ground-type-tag ${item.passType}`}>
                          {item.passType.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <strong>{item.holderName}</strong>
                      </td>
                      <td>{item.sport}</td>
                      <td>{item.facility}</td>
                      <td>
                        <time>{new Date(item.admittedAt).toLocaleTimeString()} ({new Date(item.admittedAt).toLocaleDateString()})</time>
                      </td>
                      <td>
                        <span className="admin-ground-gatekeeper-pill">
                          <SiteIcon name="user" size={12} /> {item.admittedBy}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-DESK 2: TURF BOOKINGS & CART LOCKS */}
      {activeSubDesk === 'turf' && (
        <section className="admin-ground-section">
          <header className="admin-ground-header">
            <div>
              <h3>Turf Court Slot Inventory &amp; Payment Ledger</h3>
              <p>Authoritative tracking of all reservations, advance deposits, and 10-minute cart slot locks.</p>
            </div>
          </header>

          <div className="admin-ground-table-card">
            <table className="admin-ground-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Venue &amp; Court</th>
                  <th>Customer (Masked)</th>
                  <th>Sport</th>
                  <th>Slot Date &amp; Time</th>
                  <th>Tariff / Deposit</th>
                  <th>Payment Status</th>
                  <th>Gate Admission</th>
                </tr>
              </thead>
              <tbody>
                {turfBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-ground-empty-td">
                      <SiteIcon name="calendar" size={28} />
                      <p>No turf reservations recorded in local store.</p>
                    </td>
                  </tr>
                ) : (
                  turfBookings.map(b => (
                    <tr key={b.bookingId}>
                      <td>
                        <code className="admin-ground-token-badge">{b.bookingId}</code>
                      </td>
                      <td>
                        <strong>{b.venueName}</strong>
                        <small style={{ display: 'block', color: '#64748b' }}>{b.courtName}</small>
                      </td>
                      <td>{b.customerName}</td>
                      <td>{b.sport}</td>
                      <td>{b.slotDate} · {b.slotTime}</td>
                      <td>
                        <strong>₹{b.totalAmount}</strong>
                        <small style={{ display: 'block', color: '#059669' }}>Paid: ₹{b.paidAmount}</small>
                      </td>
                      <td>
                        <span className={`admin-ground-type-tag ${b.paymentStatus}`}>
                          {b.paymentStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {b.checkedInAt ? (
                          <span className="admin-ground-checked-in-pill">
                            ✓ Admitted {new Date(b.checkedInAt).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Pending arrival</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-DESK 3: ACADEMY SAAS OVERSIGHT */}
      {activeSubDesk === 'academy' && (
        <section className="admin-ground-section">
          <header className="admin-ground-header">
            <div>
              <h3>Academy Admissions &amp; Trial Pass Issuance Hub</h3>
              <p>Grassroots SaaS director adoption, batch schedules, and student enrolment statistics.</p>
            </div>
          </header>

          <div className="admin-ground-cards-grid">
            {academies.map(a => {
              const passesForAcademy = academyPasses.filter(p => p.academySlug === a.slug)
              const isVerified = a.verificationStatus === 'verified'
              return (
                <div key={a.slug} className="admin-ground-academy-card">
                  <div className="admin-ground-academy-header">
                    <div>
                      <h4>{a.name}</h4>
                      <span className="admin-ground-academy-city">{a.city} · {a.sport}</span>
                    </div>
                    {isVerified ? (
                      <span className="admin-ground-status-badge verified" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', borderRadius: '999px', fontWeight: 700 }}>
                        <SiteIcon name="shield-check" size={12} /> Verified Tag Active
                      </span>
                    ) : (
                      <span className="admin-ground-status-badge pending" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', borderRadius: '999px', fontWeight: 700 }}>
                        <SiteIcon name="alert-triangle" size={12} /> Pending Confirmation
                      </span>
                    )}
                  </div>

                  <div className="admin-ground-academy-metrics">
                    <div className="admin-ground-metric-pill">
                      <span>Director:</span>
                      <strong>{a.directorName}</strong>
                    </div>
                    <div className="admin-ground-metric-pill">
                      <span>Trial Passes:</span>
                      <strong>{passesForAcademy.length}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {!isVerified ? (
                      <button
                        type="button"
                        className="admin-ground-btn primary full"
                        style={{ background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => {
                          confirmAndVerifyAcademy(a.slug)
                          setRefreshTrigger(k => k + 1)
                        }}
                      >
                        <SiteIcon name="shield-check" size={14} />
                        <span>Confirm &amp; Grant Verified Tag</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-ground-btn outline"
                        style={{ color: '#dc2626', borderColor: '#fca5a5', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem' }}
                        onClick={() => {
                          revokeAcademyVerification(a.slug)
                          setRefreshTrigger(k => k + 1)
                        }}
                      >
                        <span>Revoke Verified Tag</span>
                      </button>
                    )}
                    <a
                      href={`/academies/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-ground-btn outline full"
                    >
                      <span>Inspect Academy Public Listing</span>
                      <SiteIcon name="external-link" size={13} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* SUB-DESK 4: COACH SAAS & CREDENTIALS OVERSIGHT */}
      {activeSubDesk === 'coach' && (
        <section className="admin-ground-section">
          <header className="admin-ground-header">
            <div>
              <h3>Coaching Operations &amp; Verification Desk</h3>
              <p>Review registered NIS Patiala, BCCI, and federation certified coaches across India. Grant verified credentials tags.</p>
            </div>
            <div className="admin-ground-filter-row">
              <span className="admin-ground-count-badge">{coaches.length} Coaches</span>
            </div>
          </header>

          <div className="admin-ground-academy-grid">
            {coaches.map(c => {
              const isVerified = c.verificationStatus === 'verified'

              return (
                <div key={c.slug} className="admin-ground-academy-card" style={{ borderLeft: isVerified ? '4px solid #059669' : '4px solid #f59e0b' }}>
                  <div className="admin-ground-academy-card-top">
                    <div>
                      <span className="admin-ground-sport-tag">{c.sport}</span>
                      <h4>{c.name}</h4>
                      <p>{c.city}, {c.state} · {c.certification}</p>
                    </div>
                    {isVerified ? (
                      <span className="admin-ground-status-badge verified" style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', borderRadius: '999px', fontWeight: 700 }}>
                        <SiteIcon name="shield-check" size={12} /> Verified Tag Active
                      </span>
                    ) : (
                      <span className="admin-ground-status-badge pending" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', borderRadius: '999px', fontWeight: 700 }}>
                        <SiteIcon name="alert-triangle" size={12} /> Pending Confirmation
                      </span>
                    )}
                  </div>

                  <div className="admin-ground-academy-metrics">
                    <div className="admin-ground-metric-pill">
                      <span>Experience:</span>
                      <strong>{c.experienceYears} Years</strong>
                    </div>
                    <div className="admin-ground-metric-pill">
                      <span>Monthly Fee:</span>
                      <strong>₹{c.monthlyFee}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {!isVerified ? (
                      <button
                        type="button"
                        className="admin-ground-btn primary full"
                        style={{ background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => {
                          confirmAndVerifyCoach(c.slug)
                          setRefreshTrigger(k => k + 1)
                        }}
                      >
                        <SiteIcon name="shield-check" size={14} />
                        <span>Confirm &amp; Grant Verified Tag</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-ground-btn outline"
                        style={{ color: '#dc2626', borderColor: '#fca5a5', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem' }}
                        onClick={() => {
                          revokeCoachVerification(c.slug)
                          setRefreshTrigger(k => k + 1)
                        }}
                      >
                        <span>Revoke Verified Tag</span>
                      </button>
                    )}
                    <a
                      href={`/coach-dashboard?coach=${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-ground-btn outline full"
                    >
                      <span>Inspect Coach Workspace Hub</span>
                      <SiteIcon name="external-link" size={13} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
