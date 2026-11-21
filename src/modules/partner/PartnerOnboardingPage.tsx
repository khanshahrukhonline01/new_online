import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { registerCustomAcademy } from '../academies/academySaaSClient'
import { registerCustomCoach } from '../coaches/coachSaaSClient'
import { saveTurfVenueSettings } from '../venues/turfSlotManager'
import { provisionInitialTenantOwner } from '../../integrations/supabase/tenant-client'
import './PartnerOnboardingPage.css'

export interface PartnerOnboardingPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  initialMode?: 'signup' | 'login'
  initialRole?: 'academy' | 'coach' | 'venue' | 'tournament'
}

type PartnerRole = 'academy' | 'coach' | 'venue' | 'tournament'

export default function PartnerOnboardingPage({
  onNavigate,
  initialMode = 'signup',
  initialRole = 'academy',
}: PartnerOnboardingPageProps) {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode)
  const [selectedRole, setSelectedRole] = useState<PartnerRole>(initialRole)

  // Registration Form State
  const [entityName, setEntityName] = useState('')
  const [sport, setSport] = useState('Cricket')
  const [city, setCity] = useState('Delhi NCR')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [upiVpa, setUpiVpa] = useState('')

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('')

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!entityName.trim() || !phone.trim()) return

    let targetRoute = '/academy-hub'

    if (selectedRole === 'academy') {
      const newAcademy = registerCustomAcademy({
        name: entityName.trim(),
        sport,
        city,
        state: 'India',
        directorName: 'Academy Director',
        directorWhatsApp: phone.trim(),
        upiVpa: upiVpa.trim(),
      })
      provisionInitialTenantOwner({
        slug: newAcademy.slug,
        name: entityName.trim(),
        tenantType: 'academy',
        city,
        sport,
        contactPhone: phone.trim(),
        contactEmail: email.trim() || undefined,
      }).catch(err => console.warn('[PartnerOnboarding] Remote tenant provision error:', err))
      targetRoute = `/academy-hub?academy=${newAcademy.slug}`
    } else if (selectedRole === 'coach') {
      const newCoach = registerCustomCoach({
        name: entityName.trim(),
        sport,
        city,
        phone: phone.trim(),
        email: email.trim() || `${entityName.toLowerCase().replace(/[^a-z0-9]/g, '')}@coach.khelgrid.com`,
        certification: 'Unverified / Pending Credential Verification',
        monthlyFee: 3000,
        upiVpa: upiVpa.trim(),
      })
      targetRoute = `/coach-dashboard?coach=${newCoach.slug}`
    } else if (selectedRole === 'venue') {
      const venueSlug = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-sports-turf'
      saveTurfVenueSettings({
        venueSlug,
        venueName: entityName.trim(),
        managerName: 'Facility Manager',
        managerWhatsApp: phone.trim(),
        upiVpa: upiVpa.trim(),
        allowPayAtVenue: true,
        autoWhatsAppConfirmEnabled: true,
      })
      targetRoute = `/turf-calendar?venue=${venueSlug}`
    } else {
      // tournament
      targetRoute = '/tournament-ops'
    }

    if (onNavigate) {
      // Synthetic navigation event
      const fakeEvent = { preventDefault: () => {} } as MouseEvent<HTMLAnchorElement>
      onNavigate(fakeEvent, targetRoute)
    } else if (typeof window !== 'undefined') {
      window.location.href = targetRoute
    }
  }

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!loginIdentifier.trim()) return

    let targetRoute = '/academy-hub'
    if (selectedRole === 'coach') targetRoute = '/coach-dashboard'
    else if (selectedRole === 'venue') targetRoute = '/turf-calendar'
    else if (selectedRole === 'tournament') targetRoute = '/tournament-ops'

    if (onNavigate) {
      const fakeEvent = { preventDefault: () => {} } as MouseEvent<HTMLAnchorElement>
      onNavigate(fakeEvent, targetRoute)
    } else if (typeof window !== 'undefined') {
      window.location.href = targetRoute
    }
  }

  const handleFastTrackDemo = (role: PartnerRole, route: string) => {
    setSelectedRole(role)
    if (onNavigate) {
      const fakeEvent = { preventDefault: () => {} } as MouseEvent<HTMLAnchorElement>
      onNavigate(fakeEvent, route)
    } else if (typeof window !== 'undefined') {
      window.location.href = route
    }
  }

  return (
    <div className="partner-onboarding-root content-page">
      {/* Top Header */}
      <header className="partner-onboarding-header">
        <p className="eyebrow" style={{ color: '#059669', fontWeight: 800 }}>
          KHELGRID · PARTNER ONBOARDING &amp; SIGN IN
        </p>
        <h1>India&apos;s National Sports Operations Infrastructure</h1>
        <p>
          Empowering sports academies, certified coaches, turf venues, and tournament directors with 0% commission B2B management tools.
        </p>
      </header>

      {/* Mode Switcher: Sign Up vs Sign In */}
      <div className="partner-tabs-container" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`partner-auth-tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => setMode('signup')}
        >
          New Partner Onboarding (Free)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`partner-auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => setMode('login')}
        >
          Sign In to Workspace
        </button>
      </div>

      <div className="partner-form-card">
        {/* Step 1: Role Selector */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Your Sports Organisation Category:
          </span>
        </div>

        <div className="partner-role-grid" role="radiogroup">
          <div
            className={`partner-role-option ${selectedRole === 'academy' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('academy')}
            role="radio"
            aria-checked={selectedRole === 'academy'}
            tabIndex={0}
          >
            <div className="role-icon-wrap">
              <SiteIcon name="building" size={20} />
            </div>
            <span className="role-title">Sports Academy</span>
            <span className="role-desc">Admissions, student batches, attendance &amp; direct UPI fees</span>
          </div>

          <div
            className={`partner-role-option ${selectedRole === 'coach' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('coach')}
            role="radio"
            aria-checked={selectedRole === 'coach'}
            tabIndex={0}
          >
            <div className="role-icon-wrap" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <SiteIcon name="award" size={20} />
            </div>
            <span className="role-title">Coach &amp; Trainer</span>
            <span className="role-desc">Private trainees, combine percentiles &amp; NIS endorsements</span>
          </div>

          <div
            className={`partner-role-option ${selectedRole === 'venue' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('venue')}
            role="radio"
            aria-checked={selectedRole === 'venue'}
            tabIndex={0}
          >
            <div className="role-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <SiteIcon name="calendar" size={20} />
            </div>
            <span className="role-title">Turf &amp; Venue</span>
            <span className="role-desc">Hourly courts, floodlight peak pricing &amp; gate check-in</span>
          </div>

          <div
            className={`partner-role-option ${selectedRole === 'tournament' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('tournament')}
            role="radio"
            aria-checked={selectedRole === 'tournament'}
            tabIndex={0}
          >
            <div className="role-icon-wrap" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              <SiteIcon name="sparkles" size={20} />
            </div>
            <span className="role-title">Tournament Ops</span>
            <span className="role-desc">Brackets, anti-age-fraud scans &amp; pitch-side live scoring</span>
          </div>
        </div>

        {/* Step 2: Form Content */}
        {mode === 'signup' ? (
          <form onSubmit={handleRegisterSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="partner-form-row">
              <div className="partner-form-field">
                <label>
                  {selectedRole === 'academy'
                    ? 'Academy / Coaching Centre Name'
                    : selectedRole === 'coach'
                    ? 'Full Coach Name'
                    : selectedRole === 'venue'
                    ? 'Sports Complex / Turf Arena Name'
                    : 'Tournament / Sports Organisation Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    selectedRole === 'academy'
                      ? 'e.g. Bhaichung Bhutia Football Schools'
                      : selectedRole === 'coach'
                      ? 'e.g. Coach Zaheer Farooq'
                      : selectedRole === 'venue'
                      ? 'e.g. Sree Kanteerava AstroTurf Arena'
                      : 'e.g. National Youth Cup 2026'
                  }
                  value={entityName}
                  onChange={e => setEntityName(e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label>Primary Sport</label>
                <select value={sport} onChange={e => setSport(e.target.value)}>
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Athletics">Athletics / Track &amp; Field</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Multi-Sport">Multi-Sport Facility</option>
                </select>
              </div>
            </div>

            <div className="partner-form-row">
              <div className="partner-form-field">
                <label>Operating City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi NCR, Bengaluru, Mumbai"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label>Contact Phone (WhatsApp Alerts)</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="partner-form-row">
              <div className="partner-form-field">
                <label>Official Email (Optional)</label>
                <input
                  type="email"
                  placeholder="admin@organisation.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label>Direct UPI ID (0% Platform Deductions)</label>
                <input
                  type="text"
                  placeholder="e.g. academy@okaxis or coach@okhdfcbank"
                  value={upiVpa}
                  onChange={e => setUpiVpa(e.target.value)}
                />
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: '8px', border: '1px solid #6ee7b7', fontSize: '0.84rem', color: '#065f46', marginTop: '0.5rem' }}>
              🛡️ <strong>Zero Platform Commission Guarantee:</strong> All student fees and court booking deposits flow directly into your own UPI VPA bank account with zero platform commission deductions.
            </div>

            <button
              type="submit"
              className="coach-primary-btn"
              style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}
            >
              <SiteIcon name="sparkles" size={16} />
              <span>Launch Your Verified SaaS Workspace (30 Seconds)</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="partner-form-field">
              <label>Registered Phone Number or Email</label>
              <input
                type="text"
                required
                placeholder="Enter 10-digit mobile or official email"
                value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="coach-primary-btn"
              style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '1rem', justifyContent: 'center' }}
            >
              <SiteIcon name="arrow-up-right" size={16} />
              <span>Sign In to {selectedRole.toUpperCase()} Workspace</span>
            </button>
          </form>
        )}

        {/* Demo Fast-Track Access */}
        <div className="partner-demo-box">
          <h4>Fast-Track Demo Workspace Access (Immediate Preview):</h4>
          <div className="partner-demo-buttons">
            <button
              type="button"
              className="partner-demo-pill"
              onClick={() => handleFastTrackDemo('academy', '/academy-hub?academy=delhi-cricket-academy')}
            >
              Demo Academy: Delhi Cricket Academy
            </button>
            <button
              type="button"
              className="partner-demo-pill"
              onClick={() => handleFastTrackDemo('coach', '/coach-dashboard?coach=zaheer-farooq-coach')}
            >
              Demo Coach: Coach Zaheer Farooq
            </button>
            <button
              type="button"
              className="partner-demo-pill"
              onClick={() => handleFastTrackDemo('venue', '/turf-calendar?venue=sree-kanteerava-stadium')}
            >
              Demo Turf: Sree Kanteerava Arena
            </button>
            <button
              type="button"
              className="partner-demo-pill"
              onClick={() => handleFastTrackDemo('tournament', '/tournament-ops')}
            >
              Demo Tournament Ops Suite
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
