import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  submitVerificationRequest,
  lookupVerificationStatus,
  type VerificationRecord,
} from './verificationData'
import './AthleteVerificationPage.css'

export interface AthleteVerificationPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

export function AthleteVerificationPage({ onNavigate }: AthleteVerificationPageProps) {
  // Wizard step: 1 (Identity), 2 (Federation), 3 (Merit & Declaration)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Step 1: Identity & Age
  const [athleteName, setAthleteName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Male')
  const [city, setCity] = useState('')
  const [state, setState] = useState('Delhi NCR')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [documentType, setDocumentType] = useState<'Aadhaar Card' | 'Indian Passport' | 'Municipal Birth Certificate'>('Aadhaar Card')
  const [maskedDocNumber, setMaskedDocNumber] = useState('')

  // Step 2: Federation
  const [sport, setSport] = useState('Athletics')
  const [federationAuthority, setFederationAuthority] = useState('AFI (Athletics Federation of India)')
  const [federationId, setFederationId] = useState('')
  const [academyOrClub, setAcademyOrClub] = useState('')

  // Step 3: Merit & Achievement
  const [competitionLevel, setCompetitionLevel] = useState('National Junior Championship')
  const [certificateNo, setCertificateNo] = useState('')
  const [yearOfAchievement, setYearOfAchievement] = useState('2026')
  const [resultPosition, setResultPosition] = useState('Gold Medal / 1st Place')
  const [declarationChecked, setDeclarationChecked] = useState(false)

  // Feedback states
  const [submittedRecord, setSubmittedRecord] = useState<VerificationRecord | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Status Lookup Desk
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookedUpRecord, setLookedUpRecord] = useState<VerificationRecord | null>(() => lookupVerificationStatus('KG-VERIF-78291'))
  const [lookupError, setLookupError] = useState<string | null>(null)

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const handleStep1Next = () => {
    setFormError(null)
    if (!athleteName.trim() || !dob.trim() || !phone.trim() || !city.trim() || !maskedDocNumber.trim()) {
      setFormError('Please fill in all required identity fields before continuing to Step 2.')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setFormError('Please provide a valid 10-digit mobile number for SMS/WhatsApp verification.')
      return
    }
    setCurrentStep(2)
  }

  const handleStep2Next = () => {
    setFormError(null)
    if (!sport.trim() || !federationAuthority.trim() || !federationId.trim() || !academyOrClub.trim()) {
      setFormError('Please provide your sport, federation authority, valid athlete UID, and academy affiliation.')
      return
    }
    setCurrentStep(3)
  }

  const handleFinalSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!certificateNo.trim()) {
      setFormError('Please enter your competition certificate number.')
      return
    }

    if (!declarationChecked) {
      setFormError('Please agree to the KhelGrid Anti-Fraud & Document Authenticity declaration.')
      return
    }

    const record = submitVerificationRequest({
      athleteName: athleteName.trim(),
      dob,
      gender,
      city: city.trim(),
      state,
      phone: phone.trim(),
      email: email.trim(),
      documentType,
      maskedDocNumber: maskedDocNumber.trim(),
      sport,
      federationAuthority,
      federationId: federationId.trim(),
      academyOrClub: academyOrClub.trim(),
      competitionLevel,
      certificateNo: certificateNo.trim(),
      yearOfAchievement,
      resultPosition,
    })

    setSubmittedRecord(record)
    setLookedUpRecord(record)
    setLookupQuery(record.referenceId)
  }

  const handlePerformLookup = (e: FormEvent) => {
    e.preventDefault()
    setLookupError(null)
    if (!lookupQuery.trim()) {
      setLookupError('Please enter a verification reference code (e.g. KG-VERIF-78291).')
      return
    }

    const res = lookupVerificationStatus(lookupQuery.trim())
    if (!res) {
      setLookupError(`No verification docket found for reference "${lookupQuery.trim()}". Please verify the code.`)
      setLookedUpRecord(null)
    } else {
      setLookedUpRecord(res)
    }
  }

  const handleQuickDemoCode = (code: string) => {
    setLookupQuery(code)
    setLookupError(null)
    const res = lookupVerificationStatus(code)
    setLookedUpRecord(res)
  }

  const handleResetForm = () => {
    setSubmittedRecord(null)
    setCurrentStep(1)
    setAthleteName('')
    setDob('')
    setPhone('')
    setEmail('')
    setCity('')
    setMaskedDocNumber('')
    setFederationId('')
    setAcademyOrClub('')
    setCertificateNo('')
    setDeclarationChecked(false)
  }

  return (
    <main id="main-content" className="verification-page-container">
      {/* Hero Header */}
      <header className="verification-hero">
        <div className="verif-hero-badge">
          <SiteIcon name="shield-check" size={14} />
          <span>NATIONAL ATHLETE AUTHENTICITY STANDARD</span>
        </div>
        <h1 className="verif-hero-title">
          Athlete Verification Badge Desk.
        </h1>
        <p className="verif-hero-desc">
          Earn your verified KhelGrid badge to stand out to Sports Authority of India (SAI) selectors, NIS Patiala certified coaches, and professional academy scouts. Authenticate age compliance, federation UIDs, and state medal certificates with zero paperwork fraud.
        </p>

        {/* Metrics Grid */}
        <div className="verif-metrics-row">
          <div className="verif-metric-card">
            <span className="verif-metric-num">1,240+</span>
            <span className="verif-metric-label">Verified Badges Issued</span>
          </div>
          <div className="verif-metric-card">
            <span className="verif-metric-num">0-Fraud</span>
            <span className="verif-metric-label">Strict Age &amp; TW3 Standard</span>
          </div>
          <div className="verif-metric-card">
            <span className="verif-metric-num">9 NSFs</span>
            <span className="verif-metric-label">Federation Registry Sync</span>
          </div>
          <div className="verif-metric-card">
            <span className="verif-metric-num">48 Hours</span>
            <span className="verif-metric-label">Average Review Turnaround</span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Layout */}
      <div className="verif-layout-grid">
        {/* Column 1: Verification Intake Form */}
        <section className="verif-intake-card" aria-label="Verification application">
          <div className="verif-card-header">
            <div>
              <h2 className="verif-section-title">
                {submittedRecord ? 'Verification Application Received' : 'Submit 3-Step Verification Dossier'}
              </h2>
              <p className="verif-section-sub">
                {submittedRecord
                  ? 'Your credentials are undergoing registry cross-referencing.'
                  : `Step ${currentStep} of 3: ${currentStep === 1 ? 'Identity & Age Authenticity' : currentStep === 2 ? 'Federation Accreditation' : 'Merit & Authenticity Declaration'}`}
              </p>
            </div>
            {!submittedRecord && (
              <div className="verif-step-indicators" aria-hidden="true">
                <span className={`step-dot ${currentStep >= 1 ? 'is-active' : ''}`}>1</span>
                <span className="step-line" />
                <span className={`step-dot ${currentStep >= 2 ? 'is-active' : ''}`}>2</span>
                <span className="step-line" />
                <span className={`step-dot ${currentStep === 3 ? 'is-active' : ''}`}>3</span>
              </div>
            )}
          </div>

          {formError && (
            <div className="verif-error-banner" role="alert">
              <SiteIcon name="alert-triangle" size={15} />
              <span>{formError}</span>
            </div>
          )}

          {submittedRecord ? (
            <div className="verif-submission-success">
              <div className="verif-success-icon">
                <SiteIcon name="badge-check" size={36} />
              </div>
              <h3>Verification Docket Lodged!</h3>
              <p className="verif-ref-box">
                Your Official Reference: <strong>{submittedRecord.referenceId}</strong>
              </p>
              <p className="verif-success-desc">
                Your documents for <strong>{submittedRecord.athleteName}</strong> ({submittedRecord.sport}) have been encrypted under DPDP Act 2023 protocols.
              </p>

              <div className="verif-timeline-mini">
                <div className="timeline-item is-done">
                  <span className="dot" />
                  <span>Dossier Submitted &amp; Encrypted</span>
                </div>
                <div className="timeline-item is-current">
                  <span className="dot" />
                  <span>{submittedRecord.federationAuthority} Registry Matching</span>
                </div>
                <div className="timeline-item">
                  <span className="dot" />
                  <span>Verified Badge Issuance</span>
                </div>
              </div>

              <div className="verif-success-actions">
                <button
                  type="button"
                  className="verif-btn-new"
                  onClick={handleResetForm}
                >
                  Submit Another Verification
                </button>
                <a
                  href="/scout-portal"
                  onClick={e => handleLinkClick(e, '/scout-portal')}
                  className="verif-btn-scout"
                >
                  <span>Explore Scout Portal Workbench</span>
                  <SiteIcon name="arrow-up-right" size={15} />
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFinalSubmit} className="verif-form">
              {/* STEP 1: Identity & Age */}
              {currentStep === 1 && (
                <div className="verif-step-content">
                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-athlete-name">
                        Athlete Full Legal Name <span className="req">*</span>
                      </label>
                      <input
                        id="vf-athlete-name"
                        type="text"
                        required
                        placeholder="As written on Aadhaar / School Certificate"
                        value={athleteName}
                        onChange={e => setAthleteName(e.target.value)}
                      />
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-dob">
                        Date of Birth <span className="req">*</span>
                      </label>
                      <input
                        id="vf-dob"
                        type="date"
                        required
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-gender">Gender <span className="req">*</span></label>
                      <select
                        id="vf-gender"
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="Male">Male / Boys</option>
                        <option value="Female">Female / Girls</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-doc-type">Identity Proof Document <span className="req">*</span></label>
                      <select
                        id="vf-doc-type"
                        value={documentType}
                        onChange={e => setDocumentType(e.target.value as 'Aadhaar Card' | 'Indian Passport' | 'Municipal Birth Certificate')}
                      >
                        <option value="Aadhaar Card">Aadhaar Card (UIDAI Masked)</option>
                        <option value="Indian Passport">Indian Passport</option>
                        <option value="Municipal Birth Certificate">Municipal Birth Certificate (Form 5)</option>
                      </select>
                    </div>
                  </div>

                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-doc-num">
                        Masked Document Number / ID <span className="req">*</span>
                      </label>
                      <input
                        id="vf-doc-num"
                        type="text"
                        required
                        placeholder="e.g. XXXX-XXXX-4819 or Passport Number"
                        value={maskedDocNumber}
                        onChange={e => setMaskedDocNumber(e.target.value)}
                      />
                      <span className="field-hint">Never enter full 12 digits. Only enter last 4 digits for Aadhaar.</span>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-city">
                        Home City / District <span className="req">*</span>
                      </label>
                      <input
                        id="vf-city"
                        type="text"
                        required
                        placeholder="e.g. Meerut / Bengaluru / Pune"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-state">State / UT <span className="req">*</span></label>
                      <select
                        id="vf-state"
                        value={state}
                        onChange={e => setState(e.target.value)}
                      >
                        <option value="Delhi NCR">Delhi NCR</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Odisha">Odisha</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Assam">Assam</option>
                        <option value="Other">Other State / UT</option>
                      </select>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-phone">
                        Contact Mobile (+91) <span className="req">*</span>
                      </label>
                      <input
                        id="vf-phone"
                        type="tel"
                        required
                        placeholder="e.g. 9811002233"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="verif-btn-row">
                    <button
                      type="button"
                      className="verif-btn-next"
                      onClick={handleStep1Next}
                    >
                      <span>Continue to Step 2: Federation Accreditation</span>
                      <SiteIcon name="arrow-up-right" size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Federation Accreditation */}
              {currentStep === 2 && (
                <div className="verif-step-content">
                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-sport">Sport Discipline <span className="req">*</span></label>
                      <select
                        id="vf-sport"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      >
                        <option value="Athletics">Athletics (Track &amp; Field)</option>
                        <option value="Cricket">Cricket</option>
                        <option value="Football">Football</option>
                        <option value="Badminton">Badminton</option>
                        <option value="Kabaddi">Kabaddi</option>
                        <option value="Boxing">Boxing</option>
                        <option value="Wrestling">Wrestling</option>
                        <option value="Table Tennis">Table Tennis</option>
                        <option value="Swimming">Swimming</option>
                      </select>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-authority">Sanctioning Federation <span className="req">*</span></label>
                      <select
                        id="vf-authority"
                        value={federationAuthority}
                        onChange={e => setFederationAuthority(e.target.value)}
                      >
                        <option value="AFI (Athletics Federation of India)">AFI (Athletics Federation of India)</option>
                        <option value="BAI (Badminton Association of India)">BAI (Badminton Association of India)</option>
                        <option value="AIFF (All India Football Federation)">AIFF (All India Football Federation - CRS)</option>
                        <option value="BCCI (Board of Control for Cricket in India)">BCCI State Cricket Association</option>
                        <option value="SAI (Khelo India Athlete ID)">SAI (Khelo India Athlete UID)</option>
                        <option value="SGFI (School Games Federation of India)">SGFI (School Games Federation of India)</option>
                        <option value="AKFI (Amateur Kabaddi Federation of India)">AKFI (Amateur Kabaddi Federation of India)</option>
                        <option value="BFI (Boxing Federation of India)">BFI (Boxing Federation of India)</option>
                        <option value="WFI (Wrestling Federation of India)">WFI (Wrestling Federation of India)</option>
                      </select>
                    </div>
                  </div>

                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-fed-id">
                        Federation Athlete UID / License No. <span className="req">*</span>
                      </label>
                      <input
                        id="vf-fed-id"
                        type="text"
                        required
                        placeholder="e.g. AFI-DL-2024-9182 / BAI-88192"
                        value={federationId}
                        onChange={e => setFederationId(e.target.value)}
                      />
                      <span className="field-hint">Found on your official federation competition card or digital profile.</span>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-academy">
                        Accredited Academy / Club Name <span className="req">*</span>
                      </label>
                      <input
                        id="vf-academy"
                        type="text"
                        required
                        placeholder="e.g. Usha School of Athletics / Bengaluru FC Youth"
                        value={academyOrClub}
                        onChange={e => setAcademyOrClub(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="verif-btn-row">
                    <button
                      type="button"
                      className="verif-btn-back"
                      onClick={() => setCurrentStep(1)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="verif-btn-next"
                      onClick={handleStep2Next}
                    >
                      <span>Continue to Step 3: Merit Proof</span>
                      <SiteIcon name="arrow-up-right" size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Merit & Anti-Fraud Declaration */}
              {currentStep === 3 && (
                <div className="verif-step-content">
                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-comp-level">Highest Competition Level <span className="req">*</span></label>
                      <select
                        id="vf-comp-level"
                        value={competitionLevel}
                        onChange={e => setCompetitionLevel(e.target.value)}
                      >
                        <option value="National Games / Khelo India Games">National Games / Khelo India Youth Games</option>
                        <option value="Senior National Championship">Senior National Championship</option>
                        <option value="National Junior Championship">National Junior Championship</option>
                        <option value="SGFI National School Games">SGFI National School Games</option>
                        <option value="State Ranking / State Championship">State Ranking / State Championship</option>
                        <option value="District Championship">District Championship</option>
                      </select>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-cert-no">
                        Certificate Serial Number <span className="req">*</span>
                      </label>
                      <input
                        id="vf-cert-no"
                        type="text"
                        required
                        placeholder="e.g. AFI/NJAC/2026/G-104"
                        value={certificateNo}
                        onChange={e => setCertificateNo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="verif-form-row">
                    <div className="verif-field">
                      <label htmlFor="vf-year">Year of Achievement</label>
                      <select
                        id="vf-year"
                        value={yearOfAchievement}
                        onChange={e => setYearOfAchievement(e.target.value)}
                      >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                      </select>
                    </div>

                    <div className="verif-field">
                      <label htmlFor="vf-result">Position / Merit</label>
                      <select
                        id="vf-result"
                        value={resultPosition}
                        onChange={e => setResultPosition(e.target.value)}
                      >
                        <option value="Gold Medal / 1st Place">Gold Medal / 1st Place</option>
                        <option value="Silver Medal / 2nd Place">Silver Medal / 2nd Place</option>
                        <option value="Bronze Medal / 3rd Place">Bronze Medal / 3rd Place</option>
                        <option value="Finalist / Top 8 Finish">Finalist / Top 8 Finish</option>
                        <option value="State Team Representation">State Team Representation</option>
                      </select>
                    </div>
                  </div>

                  {/* Declaration Checkbox */}
                  <div className="verif-declaration-box">
                    <label className="declaration-label">
                      <input
                        type="checkbox"
                        checked={declarationChecked}
                        onChange={e => setDeclarationChecked(e.target.checked)}
                      />
                      <span>
                        <strong>KhelGrid Anti-Fraud &amp; Zero-Tolerance Declaration:</strong> I solemnly declare that all age, identity, and sports performance certificates submitted are authentic. I understand that submitting forged certificates or manipulated dates of birth triggers immediate blacklisting and notification to respective national federations.
                      </span>
                    </label>
                  </div>

                  <div className="verif-dpdp-note">
                    <SiteIcon name="shield-check" size={14} />
                    <span>
                      Protected by <strong>DPDP Act 2023</strong> &amp; <strong>POCSO child safety safeguards</strong>. All documents are stored in zero-exposure cryptographic vaults.
                    </span>
                  </div>

                  <div className="verif-btn-row">
                    <button
                      type="button"
                      className="verif-btn-back"
                      onClick={() => setCurrentStep(2)}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="verif-btn-submit"
                    >
                      <span>Submit Verification Dossier</span>
                      <SiteIcon name="badge-check" size={16} />
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </section>

        {/* Column 2: Status Lookup Desk */}
        <section className="verif-lookup-card" aria-label="Verification status lookup">
          <div className="lookup-header">
            <div className="lookup-badge">
              <SiteIcon name="search" size={13} />
              <span>LIVE DESK</span>
            </div>
            <h2 className="lookup-title">Verify Badge / Check Status.</h2>
            <p className="lookup-sub">
              Enter any KhelGrid athlete verification docket number to view authentic federation validation results.
            </p>
          </div>

          <form onSubmit={handlePerformLookup} className="lookup-form">
            <div className="lookup-input-wrap">
              <input
                type="text"
                placeholder="Enter Reference (e.g. KG-VERIF-78291)"
                value={lookupQuery}
                onChange={e => setLookupQuery(e.target.value)}
                aria-label="Docket Reference ID"
              />
              <button type="submit" className="lookup-submit-btn">
                <span>Check</span>
                <SiteIcon name="arrow-up-right" size={14} />
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-Seeds */}
          <div className="demo-seeds-row">
            <span className="demo-label">Demo Dockets:</span>
            <button
              type="button"
              className="demo-seed-pill is-verified"
              onClick={() => handleQuickDemoCode('KG-VERIF-78291')}
            >
              KG-VERIF-78291 (Gold Badge)
            </button>
            <button
              type="button"
              className="demo-seed-pill is-review"
              onClick={() => handleQuickDemoCode('KG-VERIF-64103')}
            >
              KG-VERIF-64103 (In Review)
            </button>
            <button
              type="button"
              className="demo-seed-pill is-action"
              onClick={() => handleQuickDemoCode('KG-VERIF-51928')}
            >
              KG-VERIF-51928 (Action Req)
            </button>
          </div>

          {lookupError && (
            <div className="lookup-error-msg" role="alert">
              <SiteIcon name="alert-triangle" size={14} />
              <span>{lookupError}</span>
            </div>
          )}

          {lookedUpRecord && (
            <div className="lookup-result-card">
              <div className="result-status-banner" data-status={lookedUpRecord.status}>
                <SiteIcon
                  name={lookedUpRecord.status === 'verified' ? 'badge-check' : 'shield-check'}
                  size={18}
                />
                <span className="status-title-text">{lookedUpRecord.statusTitle}</span>
              </div>

              <div className="result-details-body">
                <div className="result-line">
                  <span className="rl-label">Docket Ref:</span>
                  <strong className="rl-val">{lookedUpRecord.referenceId}</strong>
                </div>
                <div className="result-line">
                  <span className="rl-label">Athlete:</span>
                  <span className="rl-val">{lookedUpRecord.athleteName}</span>
                </div>
                <div className="result-line">
                  <span className="rl-label">Sport:</span>
                  <span className="rl-val">{lookedUpRecord.sport}</span>
                </div>
                <div className="result-line">
                  <span className="rl-label">Federation:</span>
                  <span className="rl-val">{lookedUpRecord.federationAuthority}</span>
                </div>
                <div className="result-line">
                  <span className="rl-label">UID / License:</span>
                  <code className="rl-code">{lookedUpRecord.federationId}</code>
                </div>
                <div className="result-line">
                  <span className="rl-label">Competition:</span>
                  <span className="rl-val">{lookedUpRecord.competitionLevel}</span>
                </div>
                <div className="result-line">
                  <span className="rl-label">Certificate No:</span>
                  <span className="rl-val">{lookedUpRecord.certificateNo}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="result-notes-box">
                <span className="notes-header">Verification Checkpoints:</span>
                <ul className="notes-list">
                  {lookedUpRecord.verificationNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>

              <div className="result-footer-row">
                <span className="result-timestamp">
                  Lodged: {new Date(lookedUpRecord.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <a
                  href="/verification-policy"
                  onClick={e => handleLinkClick(e, '/verification-policy')}
                  className="result-policy-link"
                >
                  Verification Policy <SiteIcon name="arrow-up-right" size={13} />
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default AthleteVerificationPage
