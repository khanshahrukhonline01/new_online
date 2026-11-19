import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import {
  type SportEvent,
  type EventRegistrationInquiry,
  saveEventRegistrationInquiry,
} from './eventsData'
import {
  registerTournamentTeam,
  type TournamentTeamRegistration,
} from './tournamentRegistrationManager'

export interface EventRegistrationModalProps {
  event: SportEvent | null
  isOpen: boolean
  onClose: () => void
  onSuccessToast?: (msg: string) => void
}

export function EventRegistrationModal({
  event,
  isOpen,
  onClose,
  onSuccessToast,
}: EventRegistrationModalProps) {
  const [athleteName, setAthleteName] = useState('')
  const [athleteAge, setAthleteAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [federationId, setFederationId] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [notes, setNotes] = useState('')
  const [submittedInquiry, setSubmittedInquiry] = useState<EventRegistrationInquiry | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Team & Squad Roster Entry State
  const [entryMode, setEntryMode] = useState<'individual' | 'team'>('individual')
  const [teamName, setTeamName] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [roster, setRoster] = useState<Array<{ id: string; name: string; jerseyNo: string; age: string; position: string; khelIdOrSportsCv: string }>>([
    { id: 'p1', name: '', jerseyNo: '10', age: '16', position: 'Captain / Forward', khelIdOrSportsCv: '' },
    { id: 'p2', name: '', jerseyNo: '7', age: '16', position: 'Player', khelIdOrSportsCv: '' },
    { id: 'p3', name: '', jerseyNo: '1', age: '17', position: 'Goalkeeper / Defender', khelIdOrSportsCv: '' },
  ])
  const [submittedTeamPass, setSubmittedTeamPass] = useState<TournamentTeamRegistration | null>(null)

  if (!isOpen || !event) return null

  const handleAddPlayer = () => {
    setRoster(r => [
      ...r,
      { id: `p-${r.length + 1}`, name: '', jerseyNo: String(r.length + 1), age: '16', position: 'Player', khelIdOrSportsCv: '' },
    ])
  }

  const handleUpdatePlayer = (id: string, field: string, val: string) => {
    setRoster(r => r.map(p => (p.id === id ? { ...p, [field]: val } : p)))
  }

  const handleRemovePlayer = (id: string) => {
    if (roster.length <= 1) return
    setRoster(r => r.filter(p => p.id !== id))
  }

  const handleTeamSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim()) {
      setErrorMsg('Please enter team name, captain name, and WhatsApp contact phone.')
      return
    }

    const cleanPhone = captainPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for WhatsApp & match updates.')
      return
    }

    const validPlayers = roster.filter(p => p.name.trim().length > 0)
    if (validPlayers.length === 0) {
      setErrorMsg('Please enter at least 1 player on the squad roster.')
      return
    }

    const pass = registerTournamentTeam({
      tournamentId: event.id,
      tournamentTitle: event.title,
      sport: event.sport,
      city: event.city,
      teamName: teamName.trim(),
      captainName: captainName.trim(),
      captainPhone: cleanPhone,
      roster: validPlayers.map((p, idx) => ({
        id: `p-${idx + 1}`,
        name: p.name.trim(),
        jerseyNo: p.jerseyNo || idx + 1,
        age: p.age || 16,
        position: p.position || 'Player',
        khelIdOrSportsCv: p.khelIdOrSportsCv.trim() || undefined,
      })),
      entryFee: event.entryFee,
      reportingVenue: event.venue,
      reportingDate: event.startDate,
    })

    setSubmittedTeamPass(pass)
    onSuccessToast?.(`Team Match Pass issued for ${teamName.trim()}! Token: #${pass.passNumber}`)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!athleteName.trim() || !phone.trim() || !athleteAge.trim()) {
      setErrorMsg('Please enter athlete name, age, and valid contact phone number.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for WhatsApp & SMS updates.')
      return
    }

    const record = saveEventRegistrationInquiry({
      eventId: event.id,
      eventTitle: event.title,
      athleteName: athleteName.trim(),
      athleteAge: athleteAge.trim(),
      gender,
      sport: event.sport,
      city: event.city,
      phone: phone.trim(),
      email: email.trim(),
      federationId: federationId.trim() || undefined,
      affiliationClubOrSchool: affiliation.trim() || undefined,
      notes: notes.trim() || undefined,
    })

    setSubmittedInquiry(record)
    onSuccessToast?.(`Inquiry submitted for ${event.title}! Tracking ID: ${record.id}`)
  }

  const handleReset = () => {
    setSubmittedInquiry(null)
    setSubmittedTeamPass(null)
    setAthleteName('')
    setAthleteAge('')
    setPhone('')
    setEmail('')
    setFederationId('')
    setAffiliation('')
    setNotes('')
    setTeamName('')
    setCaptainName('')
    setCaptainPhone('')
    onClose()
  }

  const whatsappMessage = encodeURIComponent(
    `Namaste! I want to enquire regarding entry/participation in "${event.title}" (${event.edition}).\n\n` +
      `Athlete: ${athleteName || 'Athlete'}\n` +
      `Age: ${athleteAge || 'N/A'}\n` +
      `Federation ID: ${federationId || 'Pending'}\n` +
      `Affiliation: ${affiliation || 'School / Club'}\n` +
      `Tracking Reference: ${submittedInquiry?.id || 'New Inquiry'}\n\n` +
      `Please assist with entry criteria & submission documents.`
  )

  const whatsappUrl = `https://wa.me/919876543210?text=${whatsappMessage}`

  return (
    <div
      className="event-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      onClick={e => {
        if (e.target === e.currentTarget) handleReset()
      }}
    >
      <div className="event-modal-content">
        <header className="event-modal-header">
          <div>
            <div className="event-modal-badge-row">
              <span className="event-sanction-tag">
                <SiteIcon name="shield-check" size={13} />
                <span>{event.sanctioningBody}</span>
              </span>
              <span className="event-modal-sport-tag">{event.sport}</span>
            </div>
            <h2 id="event-modal-title" className="event-modal-title">
              {submittedInquiry ? 'Entry Registration Inquiry Lodged' : 'Register & Inquire for Championship'}
            </h2>
            <p className="event-modal-subtitle">{event.title} · {event.city}</p>
          </div>
          <button
            type="button"
            className="event-modal-close"
            onClick={handleReset}
            aria-label="Close dialog"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </header>

        {submittedTeamPass ? (
          <div className="event-modal-success">
            <div className="success-icon-badge">
              <SiteIcon name="badge-check" size={32} />
            </div>
            <h3>Tournament Team Pass Issued!</h3>
            <p className="success-reference">
              Pass Token: <strong>#{submittedTeamPass.passNumber}</strong>
            </p>
            <p className="success-lead">
              Your squad roster has been registered on KhelGrid and cleared for match-day referee check-in.
            </p>

            <div
              style={{
                width: '130px',
                height: '130px',
                margin: '1rem auto',
                background: '#ffffff',
                padding: '6px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              dangerouslySetInnerHTML={{
                __html: generateQrSvgString(submittedTeamPass.qrCodePayload, { size: 118, color: '#059669', bgColor: '#ffffff' }),
              }}
            />

            <div className="success-details-card">
              <div><strong>Team Name:</strong> {submittedTeamPass.teamName}</div>
              <div><strong>Captain:</strong> {submittedTeamPass.captainName}</div>
              <div><strong>Reporting Venue:</strong> {submittedTeamPass.reportingVenue}</div>
              <div><strong>Roster Size:</strong> {submittedTeamPass.roster.length} Players</div>
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                <strong>Squad Roster:</strong>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.825rem' }}>
                  {submittedTeamPass.roster.map(p => (
                    <li key={p.id}>
                      #{p.jerseyNo} {p.name} ({p.position}) · Age {p.age}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="success-actions">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🏆 *Official Team Match Pass — ${submittedTeamPass.tournamentTitle}*\n\nTeam: *${submittedTeamPass.teamName}*\nCaptain: ${submittedTeamPass.captainName}\nPass Token: *#${submittedTeamPass.passNumber}*\nVenue: ${submittedTeamPass.reportingVenue}\n\nVerify match entry: https://khelgrid.com/verify-pass?id=${submittedTeamPass.passNumber}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
              >
                <span>Share Pass to Team WhatsApp</span>
                <SiteIcon name="arrow-up-right" size={15} />
              </a>
              <a
                href="/my-passes"
                className="official-portal-btn"
                style={{ background: '#2563eb', color: '#ffffff', border: 'none' }}
              >
                <span>View in My Passes</span>
                <SiteIcon name="shield-check" size={14} />
              </a>
              <a
                href={`/verify-pass?id=${encodeURIComponent(submittedTeamPass.passNumber)}`}
                className="official-portal-btn"
              >
                <span>Open Referee Check-In Gate</span>
                <SiteIcon name="shield-check" size={14} />
              </a>
              <button
                type="button"
                className="event-done-btn"
                onClick={handleReset}
              >
                Done
              </button>
            </div>
          </div>
        ) : submittedInquiry ? (
          <div className="event-modal-success">
            <div className="success-icon-badge">
              <SiteIcon name="badge-check" size={32} />
            </div>
            <h3>Registration Inquiry Confirmed!</h3>
            <p className="success-reference">
              Official Reference ID: <strong>{submittedInquiry.id}</strong>
            </p>
            <p className="success-lead">
              Your inquiry has been stored securely in your KhelGrid session and routed to the tournament organizing desk.
            </p>

            <div className="success-details-card">
              <div><strong>Athlete:</strong> {submittedInquiry.athleteName} ({submittedInquiry.athleteAge} yrs)</div>
              <div><strong>Tournament:</strong> {submittedInquiry.eventTitle}</div>
              <div><strong>Venue:</strong> {event.venue}</div>
              <div><strong>Tournament Dates:</strong> {event.startDate} to {event.endDate}</div>
              {submittedInquiry.federationId && <div><strong>Federation ID:</strong> {submittedInquiry.federationId}</div>}
            </div>

            <div className="success-actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
              >
                <span>Connect with Desk on WhatsApp</span>
                <SiteIcon name="arrow-up-right" size={15} />
              </a>
              <a
                href={event.officialNoticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="official-portal-btn"
              >
                <span>Visit Official Federation Portal</span>
                <SiteIcon name="external-link" size={14} />
              </a>
              <button
                type="button"
                className="event-done-btn"
                onClick={handleReset}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { setEntryMode('individual'); setErrorMsg(null) }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: entryMode === 'individual' ? '#059669' : '#f1f5f9',
                  color: entryMode === 'individual' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Individual Athlete Entry
              </button>
              <button
                type="button"
                onClick={() => { setEntryMode('team'); setErrorMsg(null) }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: entryMode === 'team' ? '#059669' : '#f1f5f9',
                  color: entryMode === 'team' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Squad / Team Roster Entry
              </button>
            </div>

            {errorMsg && (
              <div className="event-form-error" role="alert" style={{ marginBottom: '1rem' }}>
                <SiteIcon name="alert-triangle" size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {entryMode === 'team' ? (
              <form className="event-modal-form" onSubmit={handleTeamSubmit}>
                <div className="form-row-2">
                  <div className="form-field">
                    <label htmlFor="evt-team-name">
                      Team / Club Name <span className="req">*</span>
                    </label>
                    <input
                      id="evt-team-name"
                      type="text"
                      required
                      placeholder="e.g. Bangalore Strikers FC"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="evt-captain-name">
                      Captain Full Name <span className="req">*</span>
                    </label>
                    <input
                      id="evt-captain-name"
                      type="text"
                      required
                      placeholder="e.g. Sameer Khan"
                      value={captainName}
                      onChange={e => setCaptainName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label htmlFor="evt-captain-phone">
                      Captain WhatsApp Phone <span className="req">*</span>
                    </label>
                    <input
                      id="evt-captain-phone"
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={captainPhone}
                      onChange={e => setCaptainPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Tournament Entry Fee</label>
                    <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '6px', fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                      {event.entryFee} · Direct Ground Settlement
                    </div>
                  </div>
                </div>

                {/* Squad Roster */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                      Squad Players Roster ({roster.length} Players)
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddPlayer}
                      style={{
                        background: '#f0fdf4',
                        color: '#059669',
                        border: '1px solid #86efac',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Add Player
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {roster.map((player, idx) => (
                      <div
                        key={player.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1.4fr 60px 1.2fr 28px',
                          gap: '0.4rem',
                          alignItems: 'center',
                          background: '#f8fafc',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <input
                          type="text"
                          placeholder="#"
                          value={player.jerseyNo}
                          onChange={e => handleUpdatePlayer(player.id, 'jerseyNo', e.target.value)}
                          style={{ padding: '0.35rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          title="Jersey number"
                        />
                        <input
                          type="text"
                          placeholder={`Player ${idx + 1} Name`}
                          value={player.name}
                          onChange={e => handleUpdatePlayer(player.id, 'name', e.target.value)}
                          style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                        <input
                          type="number"
                          placeholder="Age"
                          value={player.age}
                          onChange={e => handleUpdatePlayer(player.id, 'age', e.target.value)}
                          style={{ padding: '0.35rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                        <input
                          type="text"
                          placeholder="Position / Khel ID"
                          value={player.position}
                          onChange={e => handleUpdatePlayer(player.id, 'position', e.target.value)}
                          style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                        {roster.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(player.id)}
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800, padding: '0' }}
                            title="Remove player"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dpdp-privacy-notice" style={{ marginTop: '1rem' }}>
                  <SiteIcon name="shield-check" size={14} />
                  <span>
                    <strong>Tournament Roster Verification:</strong> Team pass generates an on-ground QR code for match-day referee and scorekeeper check-in.
                  </span>
                </div>

                <div className="event-modal-buttons">
                  <button type="button" className="event-btn-cancel" onClick={handleReset}>
                    Cancel
                  </button>
                  <button type="submit" className="event-btn-submit">
                    <span>Issue Team Match Pass</span>
                    <SiteIcon name="arrow-up-right" size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <form className="event-modal-form" onSubmit={handleSubmit}>
                <div className="event-summary-box">
                  <div className="summary-item">
                    <span className="summary-label">Dates</span>
                    <span className="summary-val">{event.startDate} to {event.endDate}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Registration Deadline</span>
                    <span className="summary-val deadline-urgent">{event.registrationDeadline}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Age Groups</span>
                    <span className="summary-val">{event.ageCategories.join(', ')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Prize Purse / Benefit</span>
                    <span className="summary-val prize-val">{event.prizePool}</span>
                  </div>
                </div>

            {errorMsg && (
              <div className="event-form-error" role="alert">
                <SiteIcon name="alert-triangle" size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="evt-athlete-name">
                  Athlete Full Name <span className="req">*</span>
                </label>
                <input
                  id="evt-athlete-name"
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={athleteName}
                  onChange={e => setAthleteName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="evt-athlete-age">
                  Age (Years) <span className="req">*</span>
                </label>
                <input
                  id="evt-athlete-age"
                  type="number"
                  min="8"
                  max="35"
                  required
                  placeholder="e.g. 16"
                  value={athleteAge}
                  onChange={e => setAthleteAge(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="evt-gender">Gender</label>
                <select
                  id="evt-gender"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                >
                  <option value="Male">Male / Boys</option>
                  <option value="Female">Female / Girls</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="evt-phone">
                  WhatsApp Contact Phone <span className="req">*</span>
                </label>
                <input
                  id="evt-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="evt-email">Email Address</label>
                <input
                  id="evt-email"
                  type="email"
                  placeholder="e.g. aryan@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="evt-federation-id">
                  Federation Athlete UID <span className="opt">(Optional)</span>
                </label>
                <input
                  id="evt-federation-id"
                  type="text"
                  placeholder="e.g. AFI-10294 / BAI-88192"
                  value={federationId}
                  onChange={e => setFederationId(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="evt-affiliation">
                School / Academy / Club Affiliation
              </label>
              <input
                id="evt-affiliation"
                type="text"
                placeholder="e.g. Delhi Public School R.K. Puram / National Sports Academy"
                value={affiliation}
                onChange={e => setAffiliation(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="evt-notes">
                Participation Category / Notes <span className="opt">(Optional)</span>
              </label>
              <textarea
                id="evt-notes"
                rows={2}
                placeholder="e.g. Wish to enter Boys U-17 Singles & Doubles events; need official hostel accommodation guidance."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="dpdp-privacy-notice">
              <SiteIcon name="shield-check" size={14} />
              <span>
                <strong>DPDP Act 2023 & POCSO Safe Sports:</strong> Athlete contacts are encrypted and never disclosed to commercial brokers. Minor registrations require parent/coach approval.
              </span>
            </div>

            <div className="event-modal-buttons">
              <button type="button" className="event-btn-cancel" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="event-btn-submit">
                <span>Submit Entry Inquiry</span>
                <SiteIcon name="arrow-up-right" size={16} />
              </button>
            </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
