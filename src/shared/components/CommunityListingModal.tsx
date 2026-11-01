import { useState, useEffect, useRef, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { SmartSchedulePicker } from './SmartSchedulePicker'
import {
  submitCommunityListing,
  getStoredUser,
  quickSignInUser,
  signOutUser,
  type KhelGridUser,
  type CommunityListingCategory,
  type CommunityListingInput,
} from '../../integrations/supabase/public-client'
import './CommunityListingModal.css'

export interface CommunityListingModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  defaultCategory?: CommunityListingCategory
}

const COMMON_CITIES = [
  'Bengaluru',
  'Delhi',
  'Mumbai',
  'Kolkata',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Kochi',
  'Ahmedabad',
  'Chandigarh',
  'Jaipur',
  'Lucknow',
  'Bhubaneswar',
  'Guwahati',
  'Indore',
  'Dehradun',
]

const COMMON_SPORTS = [
  'Football',
  'Cricket',
  'Badminton',
  'Basketball',
  'Tennis',
  'Pickleball',
  'Table Tennis',
  'Swimming',
  'Athletics',
  'Box Cricket',
]

export default function CommunityListingModal({
  isOpen,
  onClose,
  onNavigate,
  defaultCategory = 'pickup_game',
}: CommunityListingModalProps) {
  const [category, setCategory] = useState<CommunityListingCategory>(defaultCategory)

  // Common fields
  const [city, setCity] = useState('')
  const [sport, setSport] = useState('')
  const [description, setDescription] = useState('')

  // Academy fields
  const [academyName, setAcademyName] = useState('')
  const [state, setState] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Venue fields
  const [venueName, setVenueName] = useState('')
  const [address, setAddress] = useState('')

  // Opportunity fields
  const [oppTitle, setOppTitle] = useState('')
  const [oppType, setOppType] = useState<'trial' | 'combine' | 'scholarship' | 'camp' | 'other'>('trial')
  const [oppVenue, setOppVenue] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [regFee, setRegFee] = useState('')
  const [ageCategory, setAgeCategory] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [oppSchedule, setOppSchedule] = useState('')
  const [oppStartsAt, setOppStartsAt] = useState('')

  // Pickup game fields
  const [pickupVenue, setPickupVenue] = useState('')
  const [timeLabel, setTimeLabel] = useState('')
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'>('Intermediate')
  const [hostName, setHostName] = useState('')
  const [pricePerPlayer, setPricePerPlayer] = useState('₹200/player')
  const [spotsOpen, setSpotsOpen] = useState(4)
  const [totalPlayers, setTotalPlayers] = useState(10)
  const [emoji, setEmoji] = useState('⚽')
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('')

  // Hybrid Auth & Contact State
  const [currentUser, setCurrentUser] = useState<KhelGridUser | null>(getStoredUser())
  const [showAuthBox, setShowAuthBox] = useState(false)
  const [authName, setAuthName] = useState('')
  const [authContact, setAuthContact] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState<{
    category: CommunityListingCategory
    name: string
    city: string
    directoryPath: string
    detailPath?: string
    mode: 'instant_live' | 'moderation_queue'
    requiresReview: boolean
    message: string
  } | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentUser(getStoredUser())
    const handleAuth = (e: Event) => {
      const user = (e as CustomEvent<{ user: KhelGridUser | null }>).detail?.user
      setCurrentUser(user ?? getStoredUser())
    }
    window.addEventListener('khelgrid:auth-changed', handleAuth)
    return () => window.removeEventListener('khelgrid:auth-changed', handleAuth)
  }, [])

  useEffect(() => {
    if (defaultCategory) setCategory(defaultCategory)
  }, [defaultCategory])

  useEffect(() => {
    if (!isOpen) {
      setError('')
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function resetForm() {
    setCity('')
    setSport('')
    setDescription('')
    setAcademyName('')
    setState('')
    setWebsiteUrl('')
    setVenueName('')
    setAddress('')
    setOppTitle('')
    setOppVenue('')
    setOrganizer('')
    setRegFee('')
    setAgeCategory('')
    setSourceUrl('')
    setPickupVenue('')
    setTimeLabel('')
    setHostName('')
    setPricePerPlayer('₹200/player')
    setSpotsOpen(4)
    setTotalPlayers(10)
    setContactName('')
    setContactPhone('')
    setShowAuthBox(false)
    setError('')
    setSuccessResult(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      let input: CommunityListingInput
      let directoryPath = '/'
      let createdName = ''

      if (category === 'academy') {
        input = {
          category: 'academy',
          name: academyName,
          city,
          sport: sport || undefined,
          state: state || undefined,
          description: description || undefined,
          website_url: websiteUrl || undefined,
          contact_name: currentUser?.name || contactName || undefined,
          contact_phone: currentUser?.phone || currentUser?.email || contactPhone || undefined,
          is_verified_user: Boolean(currentUser?.isVerified),
        }
        directoryPath = '/academies'
        createdName = academyName
      } else if (category === 'venue') {
        input = {
          category: 'venue',
          name: venueName,
          city,
          sport: sport || undefined,
          address: address || undefined,
          description: description || undefined,
          contact_name: currentUser?.name || contactName || undefined,
          contact_phone: currentUser?.phone || currentUser?.email || contactPhone || undefined,
          is_verified_user: Boolean(currentUser?.isVerified),
        }
        directoryPath = '/venues'
        createdName = venueName
      } else if (category === 'opportunity') {
        input = {
          category: 'opportunity',
          title: oppTitle,
          opportunity_type: oppType,
          sport: sport || undefined,
          city,
          venue_name: oppVenue || undefined,
          organizer_name: organizer || currentUser?.name || contactName || undefined,
          starts_at: oppStartsAt || undefined,
          registration_fee: regFee || undefined,
          age_category: ageCategory || undefined,
          source_url: sourceUrl || undefined,
          contact_name: currentUser?.name || contactName || undefined,
          contact_phone: currentUser?.phone || currentUser?.email || contactPhone || undefined,
          is_verified_user: Boolean(currentUser?.isVerified),
        }
        directoryPath = '/opportunities'
        createdName = oppTitle
      } else {
        input = {
          category: 'pickup_game',
          sport: sport || 'Football',
          emoji,
          venue_name: pickupVenue,
          city,
          time_label: timeLabel,
          skill_level: skillLevel,
          host_name: hostName || currentUser?.name || contactName || undefined,
          contact_name: currentUser?.name || contactName || undefined,
          contact_phone: currentUser?.phone || currentUser?.email || contactPhone || undefined,
          price_per_player: pricePerPlayer || 'Free',
          spots_open: spotsOpen,
          total_players: totalPlayers,
          whatsapp_group_url: whatsappGroupUrl.trim() || undefined,
          is_verified_user: Boolean(currentUser?.isVerified),
        }
        directoryPath = '/play'
        createdName = `${input.sport} at ${pickupVenue}`
      }

      const result = await submitCommunityListing(input)

      if (result.status === 'submitted') {
        setSuccessResult({
          category,
          name: createdName,
          city,
          directoryPath,
          detailPath: result.detailPath,
          mode: result.mode,
          requiresReview: result.requiresReview,
          message: result.message,
        })
      } else {
        setError(result.message)
      }
    } catch {
      setError('An unexpected error occurred while submitting your listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="community-intake-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-intake-title"
      onClick={handleOverlayClick}
    >
      <div className="community-intake-modal" ref={modalRef}>
        <button
          className="community-intake-close"
          onClick={onClose}
          type="button"
          aria-label="Close intake modal"
        >
          <SiteIcon name="close" size={20} />
        </button>

        {successResult ? (
          successResult.requiresReview ? (
            <div className="community-intake-success is-review">
              <div className="community-intake-success-icon review-badge-icon">
                <SiteIcon name="shield-check" size={48} />
              </div>
              <h2 id="community-intake-title">Submitted for Verification!</h2>
              <p className="community-intake-success-desc">
                <strong>{successResult.name}</strong> in <strong>{successResult.city}</strong> has been received by the KhelGrid sports desk.
                To protect Indian athletes and parents from fake trial notices and unauthorized cash combines, community circulars are verified against official gazettes within <strong>2–4 hours</strong> before public broadcasting.
              </p>

              <div className="community-intake-review-note">
                <span>💡 <strong>Want instant 1-click publishing for future trials?</strong> Sign in as a Verified Host to bypass moderation.</span>
                {!currentUser && (
                  <button
                    type="button"
                    className="community-auth-mini-btn"
                    onClick={() => {
                      setSuccessResult(null)
                      setShowAuthBox(true)
                    }}
                  >
                    ⚡ Register as Verified Host
                  </button>
                )}
              </div>

              <div className="community-intake-success-actions">
                {successResult.detailPath && (
                  <a
                    href={successResult.detailPath}
                    className="community-intake-btn-primary"
                    onClick={e => {
                      if (onNavigate) {
                        onNavigate(e, successResult.detailPath!)
                      }
                      onClose()
                    }}
                  >
                    <span>🚀 Preview Your New Page</span>
                    <SiteIcon name="arrow-up-right" size={16} />
                  </a>
                )}
                <button
                  type="button"
                  className="community-intake-btn-secondary"
                  onClick={onClose}
                >
                  Done
                </button>
                <button
                  type="button"
                  className="community-intake-btn-secondary"
                  onClick={resetForm}
                >
                  + Submit Another Listing
                </button>
              </div>
            </div>
          ) : (
            <div className="community-intake-success">
              <div className="community-intake-success-icon">
                <SiteIcon name="check-circle" size={48} />
              </div>
              <h2 id="community-intake-title">Your listing is live on KhelGrid!</h2>
              <p className="community-intake-success-desc">
                <strong>{successResult.name}</strong> has been published in <strong>{successResult.city}</strong>.
                It is now immediately discoverable on the homepage rail, city directories, and sports catalogue.
              </p>

              <div className="community-intake-success-actions">
                <a
                  href={successResult.detailPath || successResult.directoryPath}
                  className="community-intake-btn-primary"
                  onClick={e => {
                    if (onNavigate) {
                      onNavigate(e, successResult.detailPath || successResult.directoryPath)
                    }
                    onClose()
                  }}
                >
                  <span>🚀 View Your New Page Now</span>
                  <SiteIcon name="arrow-up-right" size={16} />
                </a>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out our new listing ${successResult.name} on KhelGrid: https://khelgrid.com${successResult.detailPath || successResult.directoryPath}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="community-intake-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <SiteIcon name="message" size={16} />
                  <span>Share on WhatsApp</span>
                </a>

                <button
                  type="button"
                  className="community-intake-btn-secondary"
                  onClick={resetForm}
                >
                  + Add Another Listing
                </button>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="community-intake-header">
              <span className="community-intake-eyebrow">
                <SiteIcon name="sparkles" size={14} /> KHELGRID · COMMUNITY INTAKE
              </span>
              <h2 id="community-intake-title">+ List on KhelGrid</h2>
              <p className="community-intake-subtitle">
                Publish a new sports academy, turf arena, selection trial, or pickup match across India.
              </p>
            </div>

            {/* Top Auth / Verified Host Bar */}
            <div className={`community-auth-bar ${currentUser ? 'is-verified' : 'is-guest'}`}>
              {currentUser ? (
                <div className="community-auth-bar-inner">
                  <div className="community-auth-info">
                    <SiteIcon name="check-circle" size={15} />
                    <span>
                      Signed in as <strong>{currentUser.name}</strong> · <span className="community-verified-pill">Verified Host</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="community-auth-signout-btn"
                    onClick={() => signOutUser()}
                    title="Sign out"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="community-auth-bar-inner">
                  <div className="community-auth-info">
                    <SiteIcon name="shield-check" size={15} />
                    <span>
                      <strong>Guest Mode:</strong> Pickup games publish live with contact phone. Trials &amp; academies undergo 2-4hr verification.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="community-auth-toggle-btn"
                    onClick={() => setShowAuthBox(prev => !prev)}
                  >
                    ⚡ {showAuthBox ? 'Close' : 'Sign In for Instant Publishing'}
                  </button>
                </div>
              )}
            </div>

            {/* Inline Quick Auth Drawer */}
            {showAuthBox && !currentUser && (
              <div className="community-inline-auth-box">
                <div className="community-inline-auth-header">
                  <strong>⚡ Quick Sign In / Host Registration</strong>
                  <p>Get instant live publishing on all selection trials, turfs, and academies with a Verified Host badge.</p>
                </div>
                <div className="community-inline-auth-fields">
                  <input
                    type="text"
                    placeholder="Your Full Name / Academy (e.g. Coach Rajesh Sharma)"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    className="community-inline-auth-input"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp / Mobile Number or Email (e.g. +91 98765 43210)"
                    value={authContact}
                    onChange={e => setAuthContact(e.target.value)}
                    className="community-inline-auth-input"
                  />
                  <div className="community-inline-auth-actions">
                    <button
                      type="button"
                      className="community-inline-auth-submit"
                      onClick={() => {
                        if (authName.trim().length >= 2 && authContact.trim().length >= 6) {
                          quickSignInUser(authName, authContact, 'host')
                          setShowAuthBox(false)
                        } else {
                          setError('Please enter your name (min 2 chars) and contact phone or email.')
                        }
                      }}
                    >
                      Verify &amp; Continue as Host
                    </button>
                    <button
                      type="button"
                      className="community-inline-auth-cancel"
                      onClick={() => setShowAuthBox(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Category Switcher Tabs */}
            <div className="community-intake-tabs" role="tablist" aria-label="Listing categories">
              <button
                type="button"
                role="tab"
                aria-selected={category === 'pickup_game'}
                className={`community-intake-tab ${category === 'pickup_game' ? 'is-active' : ''}`}
                onClick={() => { setCategory('pickup_game'); setError('') }}
              >
                <span className="tab-emoji">⚽</span>
                <span>Pickup Game</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'opportunity'}
                className={`community-intake-tab ${category === 'opportunity' ? 'is-active' : ''}`}
                onClick={() => { setCategory('opportunity'); setError('') }}
              >
                <span className="tab-emoji">🏆</span>
                <span>Trial / Tourney</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'venue'}
                className={`community-intake-tab ${category === 'venue' ? 'is-active' : ''}`}
                onClick={() => { setCategory('venue'); setError('') }}
              >
                <span className="tab-emoji">🏟️</span>
                <span>Turf / Arena</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'academy'}
                className={`community-intake-tab ${category === 'academy' ? 'is-active' : ''}`}
                onClick={() => { setCategory('academy'); setError('') }}
              >
                <span className="tab-emoji">🏫</span>
                <span>Academy</span>
              </button>
            </div>

            {error && (
              <div className="community-intake-error" role="alert">
                <SiteIcon name="alert-circle" size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="community-intake-form">
              <datalist id="khelgrid-cities-list">
                {COMMON_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
              <datalist id="khelgrid-sports-list">
                {COMMON_SPORTS.map(s => <option key={s} value={s} />)}
              </datalist>

              {/* CATEGORY: PICKUP GAME */}
              {category === 'pickup_game' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Sport *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-sports-list"
                        placeholder="e.g. Football, Basketball, Pickleball"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group small-field">
                      <span>Emoji</span>
                      <select value={emoji} onChange={e => setEmoji(e.target.value)}>
                        <option value="⚽">⚽ Football</option>
                        <option value="🏏">🏏 Cricket</option>
                        <option value="🏸">🏸 Badminton</option>
                        <option value="🏀">🏀 Basketball</option>
                        <option value="🎾">🎾 Tennis / Pickleball</option>
                      </select>
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Venue / Turf Name *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Kicks on Grass, DDA Arena"
                        value={pickupVenue}
                        onChange={e => setPickupVenue(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Bengaluru, Delhi, Mumbai"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Smart 2-Tap Date & Time Picker */}
                  <SmartSchedulePicker
                    value={timeLabel}
                    onChange={label => setTimeLabel(label)}
                    mode="pickup"
                    label="Date & Time"
                    required
                  />

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Skill Level</span>
                      <select
                        value={skillLevel}
                        onChange={e =>
                          setSkillLevel(
                            e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels',
                          )
                        }
                      >
                        <option value="All Levels">All Levels</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </label>
                  </div>

                  <div className="community-field-row three-cols">
                    <label className="community-field-group">
                      <span>Price / Player</span>
                      <input
                        type="text"
                        placeholder="e.g. ₹200/player or Free"
                        value={pricePerPlayer}
                        onChange={e => setPricePerPlayer(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Open Spots</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={spotsOpen}
                        onChange={e => setSpotsOpen(Number(e.target.value))}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Total Players</span>
                      <input
                        type="number"
                        min="2"
                        max="50"
                        value={totalPlayers}
                        onChange={e => setTotalPlayers(Number(e.target.value))}
                      />
                    </label>
                  </div>

                  <label className="community-field-group">
                    <span>Host / Organizer Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Rahul S. or Bangalore FC Community"
                      value={hostName}
                      onChange={e => setHostName(e.target.value)}
                    />
                  </label>

                  <label className="community-field-group">
                    <span>WhatsApp Group Link (Optional · Unlocks for confirmed players)</span>
                    <input
                      type="url"
                      placeholder="e.g. https://chat.whatsapp.com/..."
                      value={whatsappGroupUrl}
                      onChange={e => setWhatsappGroupUrl(e.target.value)}
                    />
                    <small style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      Players who reserve a spot will receive an instant link to join your match WhatsApp group.
                    </small>
                  </label>
                </div>
              )}

              {/* CATEGORY: SELECTION TRIAL / TOURNAMENT */}
              {category === 'opportunity' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group full-width">
                      <span>Trial or Tournament Title *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Delhi State U-17 Football Championship Trials"
                        value={oppTitle}
                        onChange={e => setOppTitle(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Sport</span>
                      <input
                        type="text"
                        list="khelgrid-sports-list"
                        placeholder="e.g. Football, Cricket, Badminton"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Opportunity Type</span>
                      <select
                        value={oppType}
                        onChange={e =>
                          setOppType(
                            e.target.value as 'trial' | 'combine' | 'scholarship' | 'camp' | 'other',
                          )
                        }
                      >
                        <option value="trial">Selection Trial</option>
                        <option value="other">Tournament / Championship</option>
                        <option value="camp">Training Camp</option>
                        <option value="scholarship">Sports Scholarship</option>
                        <option value="combine">Athletic Combine</option>
                      </select>
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Delhi, Mumbai, Kolkata"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Ground / Arena Name</span>
                      <input
                        type="text"
                        placeholder="e.g. JLN Stadium or Thyagaraj Complex"
                        value={oppVenue}
                        onChange={e => setOppVenue(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Smart 2-Tap Date & Reporting Time Picker */}
                  <SmartSchedulePicker
                    value={oppSchedule}
                    onChange={(label, iso) => {
                      setOppSchedule(label)
                      if (iso) setOppStartsAt(iso)
                    }}
                    mode="opportunity"
                    label="Trial / Combine Schedule & Reporting Time"
                    required
                  />

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Organizer / Club</span>
                      <input
                        type="text"
                        placeholder="e.g. Delhi Football Association"
                        value={organizer}
                        onChange={e => setOrganizer(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Age Group</span>
                      <input
                        type="text"
                        placeholder="e.g. Under-17, Under-19, Open"
                        value={ageCategory}
                        onChange={e => setAgeCategory(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Registration Fee</span>
                      <input
                        type="text"
                        placeholder="e.g. Free or ₹250"
                        value={regFee}
                        onChange={e => setRegFee(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Official Source / Registration Link</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={sourceUrl}
                        onChange={e => setSourceUrl(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* CATEGORY: TURF / ARENA */}
              {category === 'venue' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Venue / Turf Name *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Kicks on Grass Arena"
                        value={venueName}
                        onChange={e => setVenueName(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Bengaluru, Mumbai, Delhi"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Supported Sports</span>
                      <input
                        type="text"
                        placeholder="e.g. Football, Box Cricket, Badminton"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Address / Area</span>
                      <input
                        type="text"
                        placeholder="e.g. Bellandur, Sarjapur Road"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="community-field-group">
                    <span>Facilities / Description</span>
                    <textarea
                      rows={3}
                      placeholder="e.g. FIFA certified artificial turf, floodlights, parking, changing rooms."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* CATEGORY: ACADEMY */}
              {category === 'academy' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Academy Name *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Prakash Padukone Badminton Academy"
                        value={academyName}
                        onChange={e => setAcademyName(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Bengaluru, Hyderabad, Chennai"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Primary Sport</span>
                      <input
                        type="text"
                        list="khelgrid-sports-list"
                        placeholder="e.g. Badminton, Cricket, Football"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>State</span>
                      <input
                        type="text"
                        placeholder="e.g. Karnataka, Maharashtra"
                        value={state}
                        onChange={e => setState(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group full-width">
                      <span>Website or Contact URL</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="community-field-group">
                    <span>About Academy & Coaching Programs</span>
                    <textarea
                      rows={3}
                      placeholder="e.g. Elite coaching for junior and senior athletes with licensed coaches."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* Contact Information (for guest verification and player coordination) */}
              {!currentUser && (
                <div className="community-form-section community-contact-section">
                  <div className="community-section-label">
                    <span>Organizer / Host Contact (For player coordination &amp; verification)</span>
                  </div>
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Your Name / Organizer *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Coach Rajesh or Rahul Sharma"
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Contact WhatsApp / Phone *</span>
                      <input
                        required
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="community-intake-actions">
                <button
                  type="button"
                  className="community-intake-btn-cancel"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="community-intake-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <SiteIcon name="loader" size={16} />
                      <span>{(!currentUser && (category === 'opportunity' || category === 'academy')) ? 'Submitting for Verification…' : 'Publishing to KhelGrid…'}</span>
                    </>
                  ) : (!currentUser && (category === 'opportunity' || category === 'academy')) ? (
                    <>
                      <SiteIcon name="shield-check" size={16} />
                      <span>Submit for Verification (2-4 hrs)</span>
                    </>
                  ) : (
                    <>
                      <SiteIcon name="plus" size={16} />
                      <span>{currentUser ? 'Publish Live as Verified Host' : 'Publish Listing Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
